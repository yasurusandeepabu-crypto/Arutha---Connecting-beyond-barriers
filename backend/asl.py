"""Small ASL lexical preview; does not synthesize ASL sentence grammar."""

import json
import re
import time
from pathlib import Path

from .interpret import PhrasePlanner, SessionStore

MANIFEST = Path(__file__).resolve().parents[1] / 'avatar/signs/manifest.json'
WORDS = {'HELLO', 'THANK-YOU', 'YES', 'NO', 'MOTHER', 'FATHER', 'EAT', 'GOOD',
         'NAME', 'WANT', 'FINISH', 'HOUSE', 'LEARN', 'HELP'}
ALIASES = {'HI': 'HELLO', 'THANKS': 'THANK-YOU'}
FILLER = {'A', 'AN', 'THE', 'IS', 'ARE', 'AM', 'TO', 'AND'}


def lexical_report(text):
    words = re.findall(r"[A-Z]+(?:['’][A-Z]+)?|[0-9]+|[^\x00-\x7f]", text.upper())
    words = re.sub(r'\bTHANK\s+YOU\b', 'THANK-YOU', ' '.join(words)).split()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    available = manifest.get('signs', {}) if manifest.get('language_code') == 'ASL' else {}
    blocked = any(w in {'NOT', 'NEVER', 'WITHOUT', 'IF', 'UNLESS', 'MAYBE'} or w.endswith(("N'T", 'N’T')) for w in words)
    tokens, unsupported = [], []
    for word in words:
        value = ALIASES.get(word, word)
        if value in WORDS and value in available and not blocked:
            tokens.append({'type': 'sign', 'value': value})
        elif word not in FILLER:
            unsupported.append(word)
    flags = [{'kind': 'ASL_LEXICAL_PREVIEW', 'note': 'Unverified ASL word signs, in English order; not a complete sentence translation.'}]
    if unsupported:
        flags.append({'kind': 'UNSUPPORTED_WORDS', 'note': 'Caption only: ' + ', '.join(dict.fromkeys(unsupported))})
    if blocked:
        flags.append({'kind': 'CONTEXT_NOT_SUPPORTED', 'note': 'Negation or conditional context: this sentence is caption only to avoid reversing its meaning.'})
    return {'text': text, 'language': 'ASL', 'construction_id': 'ASL-LEXICAL' if tokens else None,
            'tokens': tokens, 'preview_only': True, 'flags': flags,
            'frame': {'mode': 'lexical_preview', 'language': 'ASL', 'unsupported_words': unsupported},
            'sign_sequence': {'units': [{'id': t['value'], 'language': 'ASL'} for t in tokens],
                              'gloss': [t['value'] for t in tokens], 'tracks': {}},
            'checks': {'deaf_native_reviewed': False, 'sentence_grammar_generated': False}}


class ASLSessions(SessionStore):
    def get(self, session_id):
        planner = super().get(session_id)
        planner.reporter = lexical_report
        return planner


SESSIONS = ASLSessions()


def interpret(text, session_id, sequence, flush=False, gap=False, preview=False):
    started = time.perf_counter()
    planner = SESSIONS.get(session_id)
    with planner.lock:
        result = planner.feed(text, sequence, flush=flush, gap=gap, preview=preview)
    result.update(language='ASL', source='asl-lexical-preview', preview_only=True,
                  gloss_ms=round((time.perf_counter() - started) * 1000, 1))
    result['unsupported'] = ' '.join(w for r in result['translations'] for w in r['frame']['unsupported_words'])
    result['timeline']['mode'] = 'sequential_asl_word_signs'
    return result


def translate(text, preview=False):
    result = PhrasePlanner(reporter=lexical_report).feed(text, 0, flush=True)
    result.update(language='ASL', source='asl-lexical-preview', preview_only=True, gloss_ms=0)
    result['unsupported'] = ' '.join(w for r in result['translations'] for w in r['frame']['unsupported_words'])
    result['timeline']['mode'] = 'sequential_asl_word_signs'
    return result
