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

    def test_delete_rejects_stale_revision(self):
        self.folder('folder')
        self.save('projects', 'p', project())
        self.save('projects', 'p', project('folder'), 1)
        with self.assertRaises(documents.Conflict):
            with self.db:
                documents.delete(self.db, 'projects', 'p', {'revision': 1})
        with self.assertRaises(documents.Conflict):
            with self.db:
                documents.delete(self.db, 'folders', 'folder', {'revision': 0})
        self.assertIsNotNone(documents.get(self.db, 'projects', 'p'))
        self.assertIsNotNone(documents.get(self.db, 'folders', 'folder'))
        self.assertEqual(documents.get(self.db, 'projects', 'p')['revision'], 2)
        self.assertEqual(documents.get(self.db, 'projects', 'p')['data']['folderId'], 'folder')

    def test_delete_folder_subtree_moves_projects_and_preserves_labels(self):
        self.folder('parent')
        self.folder('remove', 'parent')
        self.folder('child', 'remove')
        self.folder('grandchild', 'child')
        self.folder('other', 'parent')
        original = project('grandchild')
        original['fonts'] = {'custom': {'data': 'font-data'}}
        self.save('projects', 'deep', original)
        self.save('projects', 'direct', project('remove'))
        self.save('projects', 'untouched', project('other'))
        self.save('profiles', 'remove', {'schema': 1, 'layout': {'width': 2}})
        with self.db:
            result = documents.delete(self.db, 'folders', 'remove', {'revision': 1})
        self.assertEqual(result['removedFolderIds'], ['child', 'grandchild', 'remove'])
        self.assertEqual(result['destinationId'], 'parent')
        self.assertEqual({p['id'] for p in result['movedProjects']}, {'deep', 'direct'})
        self.db.close()
        self.db = sqlite3.connect(self.path)
        self.assertEqual({f['id'] for f in documents.listing(self.db, 'folders')}, {'parent', 'other'})
        expected = {**original, 'folderId': 'parent'}
        self.assertEqual(documents.get(self.db, 'projects', 'deep')['data'], expected)
        self.assertEqual(documents.get(self.db, 'projects', 'deep')['revision'], 2)
        self.assertEqual(documents.get(self.db, 'projects', 'direct')['data']['folderId'], 'parent')
        self.assertEqual(documents.get(self.db, 'projects', 'untouched')['revision'], 1)
        self.assertIsNotNone(documents.get(self.db, 'profiles', 'remove'))

    def test_delete_top_level_folder_moves_to_root_and_rejects_stale_project_save(self):
        self.folder('top')
        original = project('top')
        self.save('projects', 'p', original)
        with self.db:
            result = documents.delete(self.db, 'folders', 'top', {'revision': 1})
        self.assertEqual(result['destinationId'], '')
        self.assertEqual(documents.get(self.db, 'projects', 'p')['data']['folderId'], '')
        with self.assertRaises(documents.Conflict):
            self.save('projects', 'p', project(), 1)
        with self.db:
            self.assertFalse(documents.delete(self.db, 'folders', 'missing', {'revision': 1}))


if __name__ == '__main__':
    unittest.main()
