"""Screw preset HTTP persistence for all drive positions."""
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import start


class ScrewAPITests(unittest.TestCase):
    def test_drive_positions_round_trip_and_survive_reopening_database(self):
        previous = start.DATABASE
        with tempfile.TemporaryDirectory() as directory:
            start.DATABASE = Path(directory) / 'test.sqlite3'
            start.init_database()
            server = start.ThreadingHTTPServer(('127.0.0.1', 0), start.Handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = 'http://127.0.0.1:' + str(server.server_port)
            try:
                for position in ('head', 'left', 'right'):
                    config = dict(fastenerHead='socket', fastenerDriver='torx', fastenerDriverPosition=position, fastenerShaft='machine', fastenerThreads='partial', fastenerFlange=True, fastenerSecurity=True)
                    payload = json.dumps({'name': position, 'config': config}).encode()
                    request = urllib.request.Request(base + '/api/screws/' + position, data=payload, method='PUT', headers={'Content-Type': 'application/json', 'Origin': base})
                    with urllib.request.urlopen(request) as response:
                        self.assertEqual(json.load(response)['preset']['config'], config)
                with urllib.request.urlopen(base + '/api/screws') as response:
                    self.assertEqual({p['config']['fastenerDriverPosition'] for p in json.load(response)['presets']}, {'head', 'left', 'right'})
                with sqlite3.connect(start.DATABASE) as db:
                    self.assertEqual(json.loads(db.execute('SELECT config FROM presets WHERE id=?', ('left',)).fetchone()[0])['fastenerDriverPosition'], 'left')
            finally:
                server.shutdown()
                server.server_close()
                thread.join()
                start.DATABASE = previous
