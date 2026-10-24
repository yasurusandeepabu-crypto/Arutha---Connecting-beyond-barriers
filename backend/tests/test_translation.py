import unittest
from unittest.mock import patch

from backend.interpret import PHRASES, PhrasePlanner, translate
from backend.semantics import analyze
from backend.translation import load_catalog, translate_clause, validated


class TranslationTests(unittest.TestCase):
    def setUp(self):
        self.catalog = load_catalog()

    def run_clause(self, text, preview=False, available=True):
        return translate_clause(text, PHRASES, preview, self.catalog, lambda _: available)

    def approve(self, label):
        entry = next(e for e in self.catalog if e['id'] == label)
        entry.update(status='VALIDATED', provenance={'reviewers': ['Fixture reviewer'], 'reviewed_at': '2026-10-24', 'source': 'Synthetic test'})

    def test_pending_entries_do_not_autoplay(self):
        result = self.run_clause('I like cats.')
        self.assertEqual(result['construction_id'], 'LIKE-CATS')
        self.assertEqual(result['tokens'], [])
        self.assertEqual(result['review_status'], 'REVIEW_REQUIRED')
        self.assertIsNone(result['confidence']['overall'])

    def test_preview_is_explicit_and_remains_unverified(self):
        result = self.run_clause('I like cats.', preview=True)
        self.assertEqual(result['tokens'], [{'type': 'clip', 'value': 'LIKE-CATS'}])
        self.assertTrue(result['preview_only'])
        self.assertEqual(result['review_status'], 'REVIEW_REQUIRED')
        self.assertEqual(result['sign_sequence']['gloss'], [])

    def test_review_and_asset_both_required(self):
        self.approve('LIKE-CATS')
        self.assertEqual(self.run_clause('I like cats.')['review_status'], 'AUTO_OK')
        missing = self.run_clause('I like cats.', available=False)
        self.assertEqual(missing['tokens'], [])
        self.assertIn('MISSING_ANIMATION', [f['kind'] for f in missing['flags']])

    def test_status_alone_is_not_review_evidence(self):
        entry = self.catalog[0]
        entry['status'] = 'VALIDATED'
        self.assertFalse(validated(entry))

    def test_english_analysis_is_independent_of_transfer_catalog(self):
        next(e for e in self.catalog if e['id'] == 'LIKE-CATS')['frame']['patient'] = 'dogs'
        result = self.run_clause('I like cats.', preview=True)
        self.assertEqual(result['frame']['patient'], 'cats')
        self.assertEqual(result['tokens'], [])

    def test_minimal_pairs_do_not_reuse_positive_clip(self):
        self.approve('LIKE-CATS')
        for text in ["I don't like cats.", "I can't like cats.", 'I liked cats.', 'You like cats.',
                     'Do I like cats?', 'I like dogs.', 'I like cats because they are quiet.',
                     'It is false that I like cats.', 'She said I like cats.', 'I only like cats.']:
            with self.subTest(text=text):
                self.assertEqual(self.run_clause(text, preview=True)['tokens'], [])

    def test_names_and_ages_are_not_replaced(self):
        for text in ['My name is Sarah.', 'I am nineteen years old.', 'I am -9 years old.', 'I am 9% years old.']:
            self.assertIsNone(self.run_clause(text, preview=True)['construction_id'])
        age = self.run_clause('I am nineteen years old.')['frame']
        self.assertEqual(age['slots']['age'], '19')

    def test_roles_and_modality_survive_analysis(self):
        first = analyze('The dog bit the man.', PHRASES, self.catalog)
        second = analyze('The man bit the dog.', PHRASES, self.catalog)
        self.assertNotEqual(first['agent'], second['agent'])
        self.assertNotEqual(first['patient'], second['patient'])
        negative = analyze("I can't like cats.", PHRASES, self.catalog)
        self.assertEqual(negative['polarity'], 'NEGATIVE')
        self.assertEqual(negative['modality'], 'CAN')

    def test_mixed_language_is_not_silently_removed(self):
        self.assertIsNone(self.run_clause('I like cats ආයුබෝවන්.', preview=True)['construction_id'])

    def test_complete_clause_needed_before_emission(self):
        self.approve('LIKE-CATS')
        planner = PhrasePlanner(self.catalog, lambda _: True)
        self.assertEqual(planner.feed('I like cats', 0)['tokens'], [])
        result = planner.feed('but not dogs.', 1)
        self.assertEqual(result['tokens'], [])
        self.assertTrue(result['flags'])

    def test_source_spans_match_joined_transcripts(self):
        planner = PhrasePlanner(self.catalog, lambda _: True)
        planner.feed('I like cats.', 0)
        text = 'My name is Sarah.'
        result = planner.feed(text, 1)
        source = 'I like cats. ' + text
        start, end = result['translations'][0]['source_span']
        self.assertEqual(source[start:end], text)

    @patch.dict('os.environ', {}, clear=True)
    def test_unknown_text_has_no_key_fallback(self):
        result = translate('The bank is closed.')
        self.assertEqual(result['tokens'], [])
        self.assertEqual(result['review_status'], 'REVIEW_REQUIRED')
        self.assertEqual(result['frames'][0]['source_text'], 'The bank is closed.')

    @patch('backend.translation.analyze_optional', return_value=(None, 'Optional analysis failed'))
    def test_analyzer_failure_does_not_invent_translation(self, _):
        result = self.run_clause('Something unfamiliar.')
        self.assertEqual(result['tokens'], [])
        self.assertIn('ANALYSIS_FALLBACK', [f['kind'] for f in result['flags']])


if __name__ == '__main__':
    unittest.main()
