"""Download pinned MediaPipe dependencies; camera processing stays local."""

import io
import tarfile
import urllib.request
from pathlib import Path

VERSION = '0.10.21'
ROOT = Path(__file__).resolve().parents[1] / 'avatar'


def download(url):
    print(f'Downloading {url}', flush=True)
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read(64 * 1024 * 1024 + 1)
    if len(data) > 64 * 1024 * 1024:
        raise ValueError('Unexpectedly large dependency')
    return data


def main():
    vendor = ROOT / 'vendor' / 'mediapipe'
    vendor.mkdir(parents=True, exist_ok=True)
    archive = download(f'https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-{VERSION}.tgz')
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as package:
        for member in package.getmembers():
            relative = Path(member.name).relative_to('package')
            if relative.is_absolute() or '..' in relative.parts or not member.isfile():
                continue
            if str(relative) == 'vision_bundle.mjs' or relative.parts[0] == 'wasm' or relative.name in ('LICENSE', 'NOTICE', 'package.json'):
                target = vendor / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(package.extractfile(member).read())
    models = ROOT / 'models'
    models.mkdir(exist_ok=True)
    for name, url in {
        'pose_landmarker_lite.task': 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        'hand_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    }.items():
        target = models / name
        if not target.exists():
            target.write_bytes(download(url))
    print('Ready. Run python -m backend.main and open /capture.html', flush=True)


if __name__ == '__main__':
    main()
