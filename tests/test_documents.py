"""Folder and legacy-project persistence regressions (standard library only)."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import documents


def project(folder=None):
    data = {'schema': 1, 'items': [{'id': 1, 'config': {'text1': 'M3'}, 'copies': 1}]}
    if folder is not None:
        data['folderId'] = folder
    return data


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'test.sqlite3'
        self.db = sqlite3.connect(self.path)
        documents.initialize(self.db)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.temp.cleanup()

    def save(self, kind, id, data, revision=0):
        with self.db:
            return documents.save(self.db, kind, id, {'name': id, 'data': data, 'revision': revision})

    def folder(self, id, parent=''):
        return self.save('folders', id, {'schema': 1, 'parentId': parent})

    def test_old_project_and_profile_survive_without_migration(self):
        self.save('projects', 'legacy', project())
        self.save('profiles', 'existing', {'schema': 1, 'layout': {'layoutMode': 'manual'}})
        self.assertEqual(documents.listing(self.db, 'projects')[0]['folderId'], '')
        self.assertEqual(documents.get(self.db, 'profiles', 'existing')['data']['layout']['layoutMode'], 'manual')

    def test_nested_folder_project_move_and_restart(self):
        self.folder('workshop')
        self.folder('screws', 'workshop')
        entry = self.save('projects', 'm3', project('screws'))
        self.save('projects', 'm3', project('workshop'), entry['revision'])
        self.db.close()
        self.db = sqlite3.connect(self.path)
        documents.initialize(self.db)
        self.assertEqual(documents.listing(self.db, 'projects')[0]['folderId'], 'workshop')
        self.assertEqual(documents.get(self.db, 'folders', 'screws')['data']['parentId'], 'workshop')
        self.assertEqual(documents.get(self.db, 'projects', 'm3')['data']['items'][0]['config']['text1'], 'M3')

    def test_missing_folder_and_cycles_cannot_corrupt_saved_data(self):
        self.folder('parent')
        self.folder('child', 'parent')
        with self.assertRaises(ValueError):
            self.save('folders', 'parent', {'schema': 1, 'parentId': 'child'}, 1)
        with self.assertRaises(ValueError):
            self.save('folders', 'self', {'schema': 1, 'parentId': 'self'})
        with self.assertRaises(ValueError):
            self.save('projects', 'invalid', project('missing'))
        self.assertEqual(documents.get(self.db, 'folders', 'parent')['data']['parentId'], '')
        self.assertIsNone(documents.get(self.db, 'projects', 'invalid'))

    def test_competing_project_updates_keep_revision_protection(self):
        self.folder('folder')
        self.save('projects', 'm3', project())
        self.save('projects', 'm3', project('folder'), 1)
        with self.assertRaises(documents.Conflict):
            self.save('projects', 'm3', project(), 1)
        self.assertEqual(documents.get(self.db, 'projects', 'm3')['data']['folderId'], 'folder')

    def test_delete_is_scoped_and_survives_restart(self):
        self.folder('folder')
        self.save('projects', 'same-id', project('folder'))
        self.save('profiles', 'same-id', {'schema': 1, 'layout': {'width': 2}})
        with self.db:
            self.assertTrue(documents.delete(self.db, 'profiles', 'same-id', {'revision': 1}))
        self.assertIsNotNone(documents.get(self.db, 'projects', 'same-id'))
        self.assertIsNotNone(documents.get(self.db, 'folders', 'folder'))
        with self.db:
            self.assertTrue(documents.delete(self.db, 'projects', 'same-id', {'revision': 1}))
        self.db.close()
        self.db = sqlite3.connect(self.path)
        self.assertIsNone(documents.get(self.db, 'projects', 'same-id'))
        self.assertIsNone(documents.get(self.db, 'profiles', 'same-id'))
        self.assertIsNotNone(documents.get(self.db, 'folders', 'folder'))

    def test_delete_rejects_stale_revision_and_folders(self):
        self.folder('folder')
        self.save('projects', 'p', project())
        self.save('projects', 'p', project('folder'), 1)
        with self.assertRaises(documents.Conflict):
            with self.db:
                documents.delete(self.db, 'projects', 'p', {'revision': 1})
        with self.assertRaises(ValueError):
            with self.db:
                documents.delete(self.db, 'folders', 'folder', {'revision': 1})
        self.assertIsNotNone(documents.get(self.db, 'projects', 'p'))
        self.assertIsNotNone(documents.get(self.db, 'folders', 'folder'))


if __name__ == '__main__':
    unittest.main()
