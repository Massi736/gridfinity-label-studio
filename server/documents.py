"""SQLite project and layout-profile storage, with revision conflict protection."""
import datetime
import json


class Conflict(ValueError):
    pass


def initialize(db):
    db.execute('CREATE TABLE IF NOT EXISTS documents (kind TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(kind,id))')


def unpack(row):
    return dict(id=row[0], name=row[1], data=json.loads(row[2]), revision=row[3], updatedAt=row[4])


def listing(db, kind):
    return [dict(id=r[0], name=r[1], revision=r[2], updatedAt=r[3]) for r in db.execute('SELECT id,name,revision,updated_at FROM documents WHERE kind=? ORDER BY updated_at DESC', (kind,))]


def get(db, kind, identifier):
    row = db.execute('SELECT id,name,data,revision,updated_at FROM documents WHERE kind=? AND id=?', (kind, identifier)).fetchone()
    return unpack(row) if row else None


def save(db, kind, identifier, payload):
    if not isinstance(payload, dict) or not isinstance(payload.get('name'), str) or not 1 <= len(payload['name'].strip()) <= 120:
        raise ValueError('Name muss 1 bis 120 Zeichen enthalten.')
    data = payload.get('data')
    if not isinstance(data, dict) or data.get('schema') != 1:
        raise ValueError('Unbekanntes Speicherformat.')
    if kind == 'projects':
        items = data.get('items')
        if not isinstance(items, list) or not 1 <= len(items) <= 100:
            raise ValueError('Ein Projekt muss 1 bis 100 Labels enthalten.')
        ids = set()
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get('id'), int) or item['id'] in ids or not isinstance(item.get('config'), dict):
                raise ValueError('Ungültiger Label-Eintrag.')
            ids.add(item['id'])
            if type(item.get('copies')) is not int or not 1 <= item['copies'] <= 50:
                raise ValueError('Kopien müssen zwischen 1 und 50 liegen.')
        if not isinstance(data.get('fonts', {}), dict):
            raise ValueError('Ungültige Schriftdateien.')
    elif not isinstance(data.get('layout'), dict):
        raise ValueError('Anordnung fehlt.')
    if type(payload.get('revision')) is not int:
        raise ValueError('Speicherversion fehlt.')
    # Serialize with strict finite numbers; one transaction guards competing tabs.
    encoded = json.dumps(data, ensure_ascii=False, allow_nan=False)
    db.execute('BEGIN IMMEDIATE')
    old = get(db, kind, identifier)
    revision = old['revision'] if old else 0
    if revision != payload['revision']:
        raise Conflict('In einem anderen Fenster geändert. Bitte als neues Projekt/Profil speichern oder erneut öffnen.')
    revision += 1
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.execute('INSERT INTO documents VALUES (?,?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET name=excluded.name,data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at', (kind, identifier, payload['name'].strip(), encoded, revision, now))
    return get(db, kind, identifier)
