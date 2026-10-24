"""Evidence-gated phrase transfer. No automatic promotion of SLSL hypotheses."""

import json
from datetime import date
from pathlib import Path

from .semantics import BASE, analyze, signature
from .semantic_llm import analyze_optional

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = Path(__file__).with_name('catalog.json')


def load_catalog():
    return json.loads(CATALOG_PATH.read_text(encoding='utf-8'))['constructions']


def asset_exists(entry):
    manifest_path = ROOT / 'avatar/signs/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    asset = manifest.get('phrases', {}).get(entry['id'], {})
    for key in ['video', 'motion']:
        if isinstance(asset.get(key), str):
            path = (manifest_path.parent / asset[key]).resolve()
            if path.is_relative_to(manifest_path.parent.resolve()) and path.is_file():
                return True
    return False


def validated(entry):
    evidence = entry.get('provenance', {})
    reviewers = evidence.get('reviewers')
    try:
        date.fromisoformat(evidence.get('reviewed_at', ''))
    except (ValueError, TypeError):
        return False
    return (entry.get('status') == 'VALIDATED' and isinstance(reviewers, list) and
            bool(reviewers) and all(isinstance(name, str) and name.strip() for name in reviewers) and
            isinstance(evidence.get('source'), str) and bool(evidence['source'].strip()))


def translate_clause(text, phrases, preview=False, catalog=None, asset_check=None, allow_llm=True):
    catalog = load_catalog() if catalog is None else catalog
    asset_check = asset_exists if asset_check is None else asset_check
    frame = analyze(text, phrases, catalog)
    flags = []
    mixed_language = any(char.isalnum() and not char.isascii() for char in text)
    if mixed_language:
        flags.append({'kind': 'UNSUPPORTED_LANGUAGE', 'note': 'Non-English letters/numerals require language-specific analysis.'})
    if not frame['complete'] and allow_llm and not mixed_language:
        candidate, warning = analyze_optional(text)
        if warning:
            flags.append({'kind': 'ANALYSIS_FALLBACK', 'note': warning})
        if candidate:
            frame = candidate
            flags.append({'kind': 'SEMANTIC_REVIEW_REQUIRED', 'note': 'LLM meaning analysis is not independently verified.'})
    matches = [entry for entry in catalog if frame['complete'] and signature(frame) == signature({**BASE, **entry['frame']})]
    entry = matches[0] if len(matches) == 1 else None
    if not frame['complete']:
        flags.append({'kind': 'UNCOVERED_MEANING', 'note': 'Local analysis does not cover this complete sentence.'})
    if not entry:
        flags.append({'kind': 'UNSUPPORTED', 'note': 'No catalog construction expresses all extracted meaning components.'})
    tokens = []
    sequence = {'units': [], 'tracks': {}, 'loci': {}, 'gloss': []}
    checks = {'meaning_match': bool(entry), 'back_check': 'NOT_AVAILABLE', 'translation_validated': False, 'asset_available': False}
    if entry:
        # Reverse the selected construction into meaning, independently of its English label.
        checks['back_check'] = 'PASS' if signature({**BASE, **entry['frame']}) == signature(frame) else 'FAIL'
        checks['translation_validated'] = validated(entry)
        checks['asset_available'] = asset_check(entry)
        if not checks['translation_validated']:
            flags.append({'kind': 'UNVERIFIED_CONSTRUCTION', 'note': f"{entry['id']} is {entry.get('status', 'UNKNOWN')}; fluent SLSL review evidence is required."})
        if not checks['asset_available']:
            flags.append({'kind': 'MISSING_ANIMATION', 'note': f"No local video or motion asset for {entry['id']}."})
        sequence['units'] = [{'unit_ref': entry['id'], 'category': 'PHRASE', 'validation_status': entry['status']}]
        sequence['gloss'] = entry.get('gloss_sequence', []) if checks['translation_validated'] else []
        automatic = checks['translation_validated'] and frame['analysis'] == 'rules'
        if checks['asset_available'] and (automatic or preview):
            tokens = [{'type': 'clip', 'value': entry['id']}]
    blocking = any(flag['kind'] != 'ANALYSIS_FALLBACK' for flag in flags)
    status = 'REVIEW_REQUIRED' if blocking else 'AUTO_OK'
    return {'source_text': text, 'frame': frame, 'construction_id': entry['id'] if entry else None,
            'sign_sequence': sequence, 'tokens': tokens, 'flags': flags, 'checks': checks,
            'review_status': status, 'preview_only': bool(tokens and status != 'AUTO_OK'),
            'confidence': {'overall': None, 'calibrated': False, 'note': 'No measured accuracy probability is available.'}}
