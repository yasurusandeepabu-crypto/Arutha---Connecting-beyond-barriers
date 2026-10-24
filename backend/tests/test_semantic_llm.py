import json
import unittest
from unittest.mock import MagicMock, patch

from backend.interpret import PHRASES
from backend.semantic_llm import analyze_optional
from backend.semantics import BASE
from backend.translation import load_catalog, translate_clause


class SemanticModelTests(unittest.TestCase):
    def reply(self, candidate):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({'choices': [{'message': {'content': json.dumps(candidate)}}]}).encode()
        return response

    def candidate(self, **changes):
        return {**BASE, 'predicate': 'like', 'agent': 'speaker', 'patient': 'cats', 'slots': {}, **changes}

    @patch.dict('os.environ', {'TRANSLATION_ANALYZER': 'llm', 'GLOSS_API_URL': 'https://example.invalid/chat', 'GLOSS_MODEL': 'fixture'}, clear=True)
    @patch('urllib.request.urlopen')
    def test_model_meaning_never_automatically_approves_a_translation(self, request):
        request.return_value = self.reply(self.candidate())
        catalog = load_catalog()
        entry = next(e for e in catalog if e['id'] == 'LIKE-CATS')
        entry.update(status='VALIDATED', provenance={'reviewers': ['Test fixture'], 'reviewed_at': '2026-10-24', 'source': 'Synthetic test only'})
        result = translate_clause('I enjoy cats.', PHRASES, catalog=catalog, asset_check=lambda _: True)
        self.assertEqual(result['construction_id'], 'LIKE-CATS')
        self.assertEqual(result['tokens'], [])
        self.assertIn('SEMANTIC_REVIEW_REQUIRED', [f['kind'] for f in result['flags']])

    @patch.dict('os.environ', {'TRANSLATION_ANALYZER': 'llm', 'GLOSS_API_URL': 'https://example.invalid/chat', 'GLOSS_MODEL': 'fixture'}, clear=True)
    @patch('urllib.request.urlopen')
    def test_model_cannot_remove_negation(self, request):
        request.return_value = self.reply(self.candidate())
        frame, warning = analyze_optional('I do not enjoy cats.')
        self.assertIsNone(frame)
        self.assertIsNotNone(warning)

    @patch.dict('os.environ', {'TRANSLATION_ANALYZER': 'llm', 'GLOSS_API_URL': 'https://example.invalid/chat', 'GLOSS_MODEL': 'fixture'}, clear=True)
    @patch('urllib.request.urlopen')
    def test_model_cannot_change_age(self, request):
        request.return_value = self.reply(self.candidate(predicate='age', patient=None, slots={'age': '9'}))
        self.assertIsNone(analyze_optional('I am nineteen.')[0])

    @patch.dict('os.environ', {'TRANSLATION_ANALYZER': 'llm', 'GLOSS_API_URL': 'https://example.invalid/chat', 'GLOSS_MODEL': 'fixture'}, clear=True)
    @patch('urllib.request.urlopen')
    def test_model_cannot_emit_its_own_sign_ids(self, request):
        request.return_value = self.reply({'tokens': [{'type': 'clip', 'value': 'INVENTED'}]})
        self.assertIsNone(analyze_optional('Something new.')[0])
