"""Fetch pinned ASL data, preserve provenance, and extract per-sign SiGML."""

import hashlib
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REVISION = 'ce93d533b24740879df1e84cbb5341dfa575fc1f'
BASE = f'https://raw.githubusercontent.com/zhan-a/Kozha/{REVISION}/data/'
ROOT = Path(__file__).resolve().parents[1] / 'avatar/signs'
TARGET = ROOT / 'asl'
TARGET.mkdir(parents=True, exist_ok=True)
hashes = {}
for name in ['American_SL_ASL.sigml', 'American_SL_ASL.sigml.meta.json']:
    data = urllib.request.urlopen(BASE + name, timeout=30).read()
    (TARGET / name).write_bytes(data)
    hashes[name] = hashlib.sha256(data).hexdigest()
signs = {}
for sign in ET.parse(TARGET / 'American_SL_ASL.sigml').getroot():
    gloss = sign.attrib['gloss']
    if not all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-' for c in gloss):
        raise ValueError('Unexpected sign name')
    root = ET.Element('sigml')
    root.append(sign)
    ET.ElementTree(root).write(TARGET / f'{gloss}.sigml', encoding='utf-8', xml_declaration=True)
    signs[gloss] = {'sigml': f'asl/{gloss}.sigml', 'reviewed': False}
manifest = {'language': 'American Sign Language · unverified lexical prototype', 'language_code': 'ASL',
            'renderer': 'cwasa', 'signs': signs, 'letters': {}, 'phrases': {},
            'source': f'https://github.com/zhan-a/Kozha/tree/{REVISION}',
            'data_license': 'CC BY-NC 4.0, as stated in upstream metadata', 'deaf_native_reviewed': False}
(ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
(TARGET / 'provenance.json').write_text(json.dumps({'revision': REVISION, 'sha256': hashes,
    'source': BASE, 'changes': 'Original dictionary retained; individual signs extracted without changing notation.'}, indent=2) + '\n', encoding='utf-8')
print(f'Installed {len(signs)} unverified ASL signs. See avatar/signs/asl/NOTICE.md.')
