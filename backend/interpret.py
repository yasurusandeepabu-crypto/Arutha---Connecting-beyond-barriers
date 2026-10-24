"""Sentence buffering and translation sessions for the live audio pipeline."""

import json
import re
import threading
import time
from pathlib import Path

from .translation import translate_clause

PHRASES = json.loads(Path(__file__).with_name('phrases.json').read_text(encoding='utf-8'))


class PhrasePlanner:
    def __init__(self, catalog=None, asset_check=None, reporter=None):
        self.pending = ''
        self.consumed = 0
        self.last_sequence = -1
        self.updated = time.monotonic()
        self.lock = threading.Lock()
        self.catalog = catalog
        self.asset_check = asset_check
        self.has_input = False
        self.reporter = reporter

    def feed(self, text, sequence, flush=False, gap=False, preview=False):
        if sequence <= self.last_sequence:
            raise ValueError('duplicate or out-of-order chunk')
        gap = gap or sequence > self.last_sequence + 1
        self.last_sequence = sequence
        self.updated = time.monotonic()
        flags, unsupported, translations, tokens = [], [], [], []
        if gap:
            flags.append({'kind': 'AUDIO_GAP', 'note': 'Missing audio prevents joining phrases across this boundary.'})
            if self.pending:
                unsupported.append(self.pending.strip())
                self.consumed += len(self.pending)
                self.pending = ''
        self.pending += (' ' if self.has_input and text else '') + text
        self.has_input = self.has_input or bool(text)
        ends = [match.end() for match in re.finditer(r'[.!?;](?=\s|$)', self.pending)]
        if flush and self.pending.strip() and (not ends or ends[-1] != len(self.pending)):
            ends.append(len(self.pending))
        start = 0
        for index, end in enumerate(ends):
            raw = self.pending[start:end]
            clause = raw.strip()
            if clause:
                report = self.reporter(clause) if self.reporter else translate_clause(clause, PHRASES, preview, self.catalog, self.asset_check, allow_llm=index < 2)
                leading = len(raw) - len(raw.lstrip())
                report['source_span'] = [self.consumed + start + leading, self.consumed + end]
                report['frame']['source_span'] = report['source_span']
                translations.append(report)
                tokens.extend(report['tokens'])
                flags.extend(report['flags'])
                if report['construction_id'] is None:
                    unsupported.append(clause)
            start = end
        self.pending = self.pending[start:]
        self.consumed += start
        if len(self.pending) > 4000:
            flags.append({'kind': 'INCOMPLETE', 'note': 'Sentence exceeded the streaming buffer; captions retained, signing skipped.'})
            unsupported.append(self.pending.strip())
            self.consumed += len(self.pending)
            self.pending = ''
        if len(tokens) > 25:
            flags.append({'kind': 'PLAYBACK_LIMIT', 'note': 'Only the first 25 clips are queued; full captions and analysis are retained.'})
        status = 'REVIEW_REQUIRED' if flags else ('AUTO_OK' if translations else 'WAITING' if self.pending.strip() else 'NO_INPUT')
        units = [unit for report in translations for unit in report['sign_sequence']['units']]
        return {'text': text, 'tokens': tokens[:25], 'unsupported': ' '.join(unsupported),
                'pending': self.pending.strip(), 'source': 'meaning-and-catalog', 'sequence': sequence,
                'translations': translations, 'frames': [r['frame'] for r in translations], 'flags': flags,
                'review_status': status, 'preview_only': any(r['preview_only'] for r in translations),
                'sign_sequence': {'units': units, 'tracks': {}, 'gloss': [g for r in translations for g in r['sign_sequence']['gloss']]},
                'timeline': {'mode': 'sequential_clips', 'items': [{'unit_ref': t['value'], 'order': i, 'track': 'phrase_clip'} for i, t in enumerate(tokens[:25])]},
                'confidence': {'overall': None, 'calibrated': False}}


class SessionStore:
    def __init__(self):
        self.sessions = {}
        self.lock = threading.Lock()

    def get(self, session_id):
        if not isinstance(session_id, str) or not re.fullmatch(r'[A-Za-z0-9-]{8,80}', session_id):
            raise ValueError('invalid session ID')
        with self.lock:
            now = time.monotonic()
            self.sessions = {key: item for key, item in self.sessions.items() if now - item.updated < 600}
            if session_id not in self.sessions:
                if len(self.sessions) >= 32:
                    raise ValueError('too many active sessions')
                self.sessions[session_id] = PhrasePlanner()
            return self.sessions[session_id]


SESSIONS = SessionStore()


def interpret(text, session_id, sequence, flush=False, gap=False, preview=False):
    started = time.perf_counter()
    planner = SESSIONS.get(session_id)
    with planner.lock:
        result = planner.feed(text, sequence, flush=flush, gap=gap, preview=preview)
    result['gloss_ms'] = round((time.perf_counter() - started) * 1000, 1)
    return result


def translate(text, preview=False):
    started = time.perf_counter()
    result = PhrasePlanner().feed(text, 0, flush=True, preview=preview)
    result['gloss_ms'] = round((time.perf_counter() - started) * 1000, 1)
    return result
