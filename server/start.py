"""Gridfinity Label Studio: offline HTTP service and local preset storage.
Python 3.10+, standard library only. No installation of packages required.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit, unquote
import argparse
import datetime
import json
import re
import sqlite3
import sys
import webbrowser
import documents
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
LIBRARY = ROOT / 'bibliothek'
DATABASE = ROOT / 'daten' / 'label-studio.sqlite3'
CHOICES = {
    'fastenerHead': ['socket', 'countersunk', 'roundh', 'pan', 'none'],
    'fastenerDriver': ['hex', 'torx', 'phillips', 'slot', 'phillips_slot', 'phillips_square', 'square', 'triangle', 'none'],
    'fastenerDriverPosition': ['head', 'right'],
    'fastenerShaft': ['machine', 'tapping', 'none'],
    'fastenerThreads': ['full', 'partial', 'none'],
}


def read_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8-sig'))
    except (ValueError, OSError) as error:
        raise ValueError(f'{path.relative_to(ROOT)}: {error}') from error


def load_library():
    categories = read_json(LIBRARY / 'kategorien.json')
    if not isinstance(categories, list) or not categories:
        raise ValueError('kategorien.json: Kategorienliste fehlt.')
    category_ids = set()
    for category in categories:
        if not isinstance(category, dict) or not isinstance(category.get('id'), str) or not isinstance(category.get('name'), str):
            raise ValueError('Jede Kategorie braucht id und name.')
        if category['id'] in category_ids:
            raise ValueError('Doppelte Kategorie: ' + category['id'])
        category_ids.add(category['id'])
    if 'all' not in category_ids:
        raise ValueError('Die Kategorie all muss vorhanden sein.')
    symbols, ids = [], set()
    for path in sorted((LIBRARY / 'symbole').rglob('*.json')):
        s = read_json(path)
        if not isinstance(s, dict):
            raise ValueError(f'{path.name}: JSON-Objekt erwartet.')
        if s.get('enabled') is False:
            continue
        for key in ('id', 'name', 'category'):
            if not isinstance(s.get(key), str) or not s[key].strip():
                raise ValueError(f'{path.name}: {key} fehlt.')
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', s['id']):
            raise ValueError(f'{path.name}: id nur mit Buchstaben, Ziffern, - und _.')
        if s['id'] in ids:
            raise ValueError('Doppelte Symbol-ID: ' + s['id'])
        ids.add(s['id'])
        if s['category'] not in category_ids or s['category'] == 'all':
            raise ValueError(f'{path.name}: unbekannte Kategorie.')
        if not isinstance(s.get('order', 1000), (int, float)):
            raise ValueError(f'{path.name}: order muss eine Zahl sein.')
        if 'referenceHeight' in s and (not isinstance(s['referenceHeight'], (int, float)) or not 0 < s['referenceHeight'] < 10000):
            raise ValueError(f'{path.name}: referenceHeight muss positiv und kleiner als 10000 sein.')
        if s.get('alignment', 'left') not in ('left', 'center'):
            raise ValueError(f'{path.name}: alignment muss left oder center sein.')
        s['function'] = s['category']
        s.setdefault('source', 'Eigene Bibliothek')
        if s.get('type') == 'configurable-screw':
            if s['id'] != 'mw-fastener':
                raise ValueError('Der Konfigurator muss die ID mw-fastener behalten.')
        else:
            filename = s.get('svg', '')
            if not isinstance(filename, str) or not filename:
                raise ValueError(f'{path.name}: svg-Dateiname fehlt.')
            svg = (path.parent / filename).resolve()
            if not svg.is_relative_to((LIBRARY / 'symbole').resolve()) or svg.suffix.lower() != '.svg':
                raise ValueError(f'{path.name}: SVG muss innerhalb bibliothek/symbole liegen.')
            try:
                if svg.stat().st_size > 5_000_000:
                    raise ValueError('SVG ist grösser als 5 MB.')
                content = svg.read_text(encoding='utf-8-sig')
                if '<!DOCTYPE' in content.upper() or '<!ENTITY' in content.upper():
                    raise ValueError('SVG bitte ohne DOCTYPE und Entities speichern.')
                document = ET.fromstring(content)
                allowed = {'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'title', 'desc', 'metadata'}
                for element in document.iter():
                    tag = element.tag.split('}')[-1]
                    if tag not in allowed:
                        raise ValueError(f'SVG-Element {tag}: als einfache SVG mit gefüllten Pfaden speichern (keine Texte, Bilder, Klone oder Filter).')
                    style = dict(piece.split(':', 1) for piece in element.get('style', '').replace(' ', '').split(';') if ':' in piece)
                    if style.get('stroke', element.get('stroke', 'none')) != 'none':
                        raise ValueError('Konturen im SVG-Editor zuerst in Pfade umwandeln.')
                    for key, value in element.attrib.items():
                        if key.lower().startswith('on') or 'href' in key or 'url(' in value.lower():
                            raise ValueError('Externe Verweise und Skripte sind nicht erlaubt.')
                s['svgText'] = content
            except (OSError, ET.ParseError, ValueError) as error:
                raise ValueError(f'{path.name}: {error}') from error
        symbols.append(s)
    if 'mw-fastener' not in ids:
        raise ValueError('Schraubenkonfigurator mw-fastener fehlt.')
    parts = {p.stem: read_json(p) for p in sorted((LIBRARY / 'schrauben').glob('*.json'))}
    symbols.sort(key=lambda s: (s.get('order', 1000), s['name'].lower()))
    return {'categories': categories, 'symbols': symbols, 'parts': parts}


def connect():
    return sqlite3.connect(DATABASE, timeout=10)


def init_database():
    DATABASE.parent.mkdir(exist_ok=True)
    with connect() as db:
        documents.initialize(db)
        db.execute('CREATE TABLE IF NOT EXISTS presets (id TEXT PRIMARY KEY, name TEXT NOT NULL, config TEXT NOT NULL, created_at TEXT NOT NULL)')


def preset_row(row):
    return dict(id=row[0], name=row[1], config=json.loads(row[2]), createdAt=row[3])


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.svg': 'image/svg+xml'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'app'), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def local_request(self):
        allowed = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        if self.headers.get('Host') not in allowed:
            self.respond(403, {'error': 'Nur lokaler Zugriff erlaubt.'})
            return False
        origin = self.headers.get('Origin')
        if origin and origin not in {'http://' + host for host in allowed}:
            self.respond(403, {'error': 'Fremder Ursprung abgelehnt.'})
            return False
        return True

    def respond(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.local_request():
            return
        path = urlsplit(self.path).path
        try:
            if path == '/api/library':
                self.respond(200, load_library())
            elif path == '/api/screws':
                with connect() as db:
                    rows = db.execute('SELECT id, name, config, created_at FROM presets ORDER BY created_at DESC').fetchall()
                self.respond(200, {'presets': [preset_row(row) for row in rows]})
            elif re.fullmatch(r'/api/(projects|profiles|folders)(/[a-zA-Z0-9_-]{1,100})?', path):
                pieces = path.split('/')
                with connect() as db:
                    if len(pieces) == 3:
                        self.respond(200, {'entries': documents.listing(db, pieces[2])})
                    else:
                        entry = documents.get(db, pieces[2], pieces[3])
                        self.respond(200 if entry else 404, {'entry': entry} if entry else {'error': 'Nicht gefunden.'})
            elif path.startswith('/api/'):
                self.respond(404, {'error': 'Nicht gefunden.'})
            else:
                relative = unquote(path).lstrip('/')
                target = (ROOT / 'app' / relative).resolve()
                if not target.is_relative_to((ROOT / 'app').resolve()):
                    self.respond(403, {'error': 'Ungültiger Pfad.'})
                else:
                    super().do_GET()
        except (ValueError, OSError, sqlite3.Error) as error:
            self.respond(400, {'error': str(error)})

    def do_HEAD(self):
        if self.local_request():
            super().do_HEAD()

    def mutate(self, delete=False):
        if not self.local_request():
            return
        if re.fullmatch(r'/api/(projects|profiles|folders)/[a-zA-Z0-9_-]{1,100}', urlsplit(self.path).path):
            return self.save_document(delete)
        match = re.fullmatch(r'/api/screws/([a-zA-Z0-9_-]{1,100})', urlsplit(self.path).path)
        if not match:
            return self.respond(404, {'error': 'Nicht gefunden.'})
        identifier = match[1]
        try:
            if delete:
                with connect() as db:
                    db.execute('DELETE FROM presets WHERE id=?', (identifier,))
                return self.respond(200, {'ok': True})
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size < 32768:
                raise ValueError('Ungültige Anfragegrösse.')
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or not isinstance(data.get('name'), str) or not 1 <= len(data['name'].strip()) <= 120:
                raise ValueError('Name muss 1 bis 120 Zeichen enthalten.')
            config = data.get('config')
            if not isinstance(config, dict):
                raise ValueError('Schraubenkonfiguration fehlt.')
            result = {}
            for key, values in CHOICES.items():
                if config.get(key) not in values:
                    raise ValueError('Ungültige Schraubenoption: ' + key)
                result[key] = config[key]
            for key in ('fastenerFlange', 'fastenerSecurity'):
                if type(config.get(key)) is not bool:
                    raise ValueError('Ungültige Schraubenoption: ' + key)
                result[key] = config[key]
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            with connect() as db:
                db.execute('INSERT INTO presets VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, config=excluded.config', (identifier, data['name'].strip(), json.dumps(result), now))
                row = db.execute('SELECT id, name, config, created_at FROM presets WHERE id=?', (identifier,)).fetchone()
            self.respond(200, {'preset': preset_row(row)})
        except (ValueError, OSError, sqlite3.Error) as error:
            self.respond(400, {'error': str(error)})

    def save_document(self, delete=False):
        _, _, kind, identifier = urlsplit(self.path).path.split('/')
        try:
            size = int(self.headers.get('Content-Length', '0'))
            limit = 40_000_000 if kind == 'projects' else 100_000
            if not 0 < size <= limit:
                raise ValueError('Projekt/Profil ist zu gross (Projekt maximal 40 MB).')
            payload = json.loads(self.rfile.read(size))
            with connect() as db:
                if delete:
                    removed = documents.delete(db, kind, identifier, payload)
                else:
                    entry = documents.save(db, kind, identifier, payload)
            if delete:
                self.respond(200 if removed else 404, {'deleted': True} if removed else {'error': 'Nicht gefunden.'})
            else:
                self.respond(200, {'entry': entry})
        except documents.Conflict as error:
            self.respond(409, {'error': str(error)})
        except (ValueError, OSError, sqlite3.Error) as error:
            self.respond(400, {'error': str(error)})

    def do_PUT(self):
        self.mutate()

    def do_DELETE(self):
        self.mutate(delete=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--check-library', action='store_true')
    args = parser.parse_args()
    try:
        library = load_library()
        print(f'Bibliothek OK: {len(library["symbols"])} Symbole.', flush=True)
        if args.check_library:
            return
        init_database()
        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
        url = f'http://127.0.0.1:{server.server_port}'
        print(f'Gridfinity Label Studio: {url}\nDieses Fenster offen lassen. Beenden: Strg+C.', flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nLabel Studio beendet.')
        finally:
            server.server_close()
    except (ValueError, OSError, sqlite3.Error) as error:
        print(f'Fehler: {error}\nBei belegtem Port: python server/start.py --port 8766', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
