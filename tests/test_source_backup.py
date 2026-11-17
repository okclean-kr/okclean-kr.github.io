import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('source_backup', Path(__file__).resolve().parents[1] / 'scripts/source_backup.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class SourceBackupTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.git('init', '--initial-branch=main')
        self.git('config', 'user.name', 'Backup test')
        self.git('config', 'user.email', 'backup@example.invalid')
        (self.repo / '안내.txt').write_text('원본 소스\n')
        (self.repo / 'run.sh').write_text('#!/bin/sh\nexit 0\n')
        (self.repo / 'run.sh').chmod(0o755)
        (self.repo / 'image.bin').write_bytes(bytes(range(256)))
        self.commit()

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], stderr=subprocess.PIPE)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-m', 'fixture')

    def create(self):
        return backup.create_backup(self.repo, self.root / 'out')

    def test_committed_unicode_binary_modes_and_no_untracked_secrets(self):
        (self.repo / '안내.txt').write_text('저장되지 않은 수정')
        (self.repo / '.env').write_text('PRIVATE_TOKEN=synthetic')
        manifest = self.create()
        dest = self.root / 'restore'
        result = backup.verify_archive(self.root / 'out/source.tar.gz', manifest, dest)
        self.assertEqual(result['filesVerified'], 3)
        self.assertEqual((dest / '안내.txt').read_text(), '원본 소스\n')
        self.assertEqual((dest / 'image.bin').read_bytes(), bytes(range(256)))
        self.assertTrue((dest / 'run.sh').stat().st_mode & 0o111)
        self.assertFalse((dest / '.env').exists())
        self.assertFalse((dest / '.git').exists())
        self.assertNotIn('PRIVATE_TOKEN', json.dumps(manifest))

    def test_archive_tampering_is_rejected_before_restore(self):
        manifest = self.create()
        archive = self.root / 'out/source.tar.gz'
        archive.write_bytes(archive.read_bytes() + b'corrupt')
        with self.assertRaisesRegex(ValueError, 'archive-checksum'):
            backup.verify_archive(archive, manifest, self.root / 'restore')
        self.assertFalse((self.root / 'restore').exists())

    def test_traversal_and_symlink_entries_are_rejected(self):
        for path in ['../escape', 'C:/outside', './alias', 'a//alias', 'a/../alias', '.git/config']:
            with self.assertRaises(ValueError):
                backup.source_path(path)
        for name, kind in [('../escape', tarfile.REGTYPE), ('safe.txt', tarfile.SYMTYPE)]:
            with self.subTest(name=name):
                archive = self.root / 'unsafe.tar.gz'
                info = tarfile.TarInfo(name)
                info.type = kind
                info.mode = 0o644
                info.size = 1 if kind == tarfile.REGTYPE else 0
                info.linkname = '/tmp/unsafe-target' if kind == tarfile.SYMTYPE else ''
                with tarfile.open(archive, 'w:gz') as tar:
                    tar.addfile(info, io.BytesIO(b'x') if info.size else None)
                manifest = {'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': [{'path': name, 'mode': '100644', 'bytes': 1, 'sha256': hashlib.sha256(b'x').hexdigest()}]}
                with self.assertRaises(ValueError):
                    backup.verify_archive(archive, manifest, self.root / 'restore')
                self.assertFalse((self.root / 'escape').exists())

    def test_tracked_private_files_and_symlinks_stop_backup(self):
        private = self.repo / '.env'
        private.write_text('synthetic-secret')
        self.commit()
        with self.assertRaisesRegex(ValueError, 'private-file'):
            self.create()
        self.assertFalse((self.root / 'out/source.tar.gz').exists())
        private.unlink()
        self.commit()
        (self.repo / 'link').symlink_to('안내.txt')
        self.commit()
        with self.assertRaisesRegex(ValueError, 'non-regular'):
            self.create()

    def test_existing_restore_data_is_never_overwritten(self):
        manifest = self.create()
        destination = self.root / 'restore'
        destination.mkdir()
        sentinel = destination / 'keep.txt'
        sentinel.write_text('keep')
        with self.assertRaisesRegex(ValueError, 'not-empty'):
            backup.verify_archive(self.root / 'out/source.tar.gz', manifest, destination)
        self.assertEqual(sentinel.read_text(), 'keep')

    def test_invalid_commit_and_file_checksum_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'invalid-commit'):
            backup.create_backup(self.repo, self.root / 'out', '--help')
        manifest = self.create()
        manifest['files'][0]['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'file-checksum'):
            backup.verify_archive(self.root / 'out/source.tar.gz', manifest, self.root / 'restore')
        self.assertFalse((self.root / 'restore').exists())


if __name__ == '__main__':
    unittest.main()
