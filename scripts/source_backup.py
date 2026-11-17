"""Archive committed public source only; verify a separate, empty-directory restore."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile
import tempfile


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE)


def source_path(value, directory=False):
    path = PurePosixPath(value)
    canonical = value[:-1] if directory and value.endswith('/') else value
    if not value or str(path) == '.' or str(path) != canonical or path.is_absolute() or '..' in path.parts or '.git' in path.parts or '\\' in value or ':' in value:
        raise ValueError('unsafe-source-path')
    name = path.name.lower()
    if name == '.env' or name.startswith('.env.') or name.endswith(('.pem', '.key', '.p12', '.pfx', '.okcbackup')) or re.fullmatch(r'service[-_]?account.*\.json', name) or name == 'credentials.json':
        raise ValueError('private-file-not-supported')
    return path


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify_archive(archive, manifest, destination):
    archive, destination = Path(archive), Path(destination)
    if destination.exists() and any(destination.iterdir()):
        raise ValueError('restore-directory-not-empty')
    if digest(archive.read_bytes()) != manifest['archiveSha256']:
        raise ValueError('archive-checksum-mismatch')
    entries = {}
    for entry in manifest['files']:
        source_path(entry['path'])
        if entry['path'] in entries or entry['mode'] not in ['100644', '100755']:
            raise ValueError('invalid-manifest')
        entries[entry['path']] = entry
    seen, contents = set(), []
    with tarfile.open(archive, 'r:gz') as tar:
        for member in tar.getmembers():
            source_path(member.name, member.isdir())
            if member.isdir():
                continue
            if not member.isfile() or member.name not in entries or member.name in seen:
                raise ValueError('unexpected-archive-entry')
            entry = entries[member.name]
            if member.size != entry['bytes'] or bool(member.mode & 0o111) != (entry['mode'] == '100755'):
                raise ValueError('file-size-or-mode-mismatch')
            data = tar.extractfile(member).read()
            if digest(data) != entry['sha256']:
                raise ValueError('file-checksum-mismatch')
            seen.add(member.name)
            contents.append((entry, data))
    if seen != set(entries):
        raise ValueError('missing-source-files')
    # Validate the entire archive before writing any restored file.
    destination.mkdir(parents=True, exist_ok=True)
    for entry, data in contents:
        path = destination.joinpath(*PurePosixPath(entry['path']).parts)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        path.chmod(0o755 if entry['mode'] == '100755' else 0o644)
        if digest(path.read_bytes()) != entry['sha256']:
            raise ValueError('restored-file-mismatch')
    return {'filesVerified': len(entries), 'bytesVerified': sum(entry['bytes'] for entry in entries.values()), 'allFilesRestored': True}


def create_backup(repo, output, commit=None):
    repo, output = Path(repo), Path(output)
    commit = commit or git(repo, 'rev-parse', 'HEAD').decode().strip()
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('invalid-commit')
    files = []
    for row in git(repo, 'ls-tree', '-rz', '--full-tree', commit).split(b'\0'):
        if not row:
            continue
        metadata, raw_path = row.split(b'\t', 1)
        mode, kind, blob = metadata.decode().split()
        path = raw_path.decode('utf-8')
        source_path(path)
        if kind != 'blob' or mode not in ['100644', '100755']:
            raise ValueError('non-regular-source-file')
        data = git(repo, 'cat-file', 'blob', blob)
        files.append({'path': path, 'mode': mode, 'gitBlob': blob, 'bytes': len(data), 'sha256': digest(data)})
    if not files:
        raise ValueError('empty-source-tree')
    output.mkdir(parents=True, exist_ok=True)
    archive = output / 'source.tar.gz'
    git(repo, 'archive', '--format=tar.gz', '--output=' + str(archive.resolve()), commit)
    manifest = {'schema': 1, 'sourceCommit': commit, 'createdAtUTC': datetime.now(timezone.utc).isoformat(), 'scope': 'Committed public Git source only; no working-tree secrets, environment, Git credentials, Firebase data/Auth or private mail state.', 'archiveSha256': digest(archive.read_bytes()), 'archiveBytes': archive.stat().st_size, 'files': files}
    with tempfile.TemporaryDirectory(prefix='okclean-backup-verify-') as temp:
        manifest['restoreVerification'] = verify_archive(archive, manifest, Path(temp) / 'restored')
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', default='.')
    parser.add_argument('--output')
    parser.add_argument('--commit')
    parser.add_argument('--verify')
    parser.add_argument('--manifest')
    parser.add_argument('--restore')
    args = parser.parse_args()
    if args.verify:
        if not args.manifest or not args.restore:
            parser.error('--verify requires --manifest and --restore')
        result = verify_archive(args.verify, json.loads(Path(args.manifest).read_text()), args.restore)
    else:
        if not args.output:
            parser.error('--output is required')
        manifest = create_backup(args.repo, args.output, args.commit)
        result = {'sourceCommit': manifest['sourceCommit'], 'archiveBytes': manifest['archiveBytes'], 'archiveSha256': manifest['archiveSha256'], **manifest['restoreVerification']}
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
