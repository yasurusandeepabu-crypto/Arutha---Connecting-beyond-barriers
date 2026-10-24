import unittest

from backend.interpret import PhrasePlanner, PHRASES
from backend.translation import load_catalog


def ready_planner():
    catalog = load_catalog()
    for entry in catalog:
        entry['status'] = 'VALIDATED'
        entry['provenance'] = {'reviewers': ['Synthetic test reviewer'], 'reviewed_at': '2026-10-24', 'source': 'Test fixture only'}
    return PhrasePlanner(catalog=catalog, asset_check=lambda _: True)


class PhraseTests(unittest.TestCase):
    def test_complete_demo_script_has_ten_ordered_matches(self):
        result = ready_planner().feed(' '.join(p['meaning'] for p in PHRASES), 0, flush=True)
        self.assertEqual([t['value'] for t in result['tokens']], [p['id'] for p in PHRASES])
        self.assertEqual(result['unsupported'], '')

    def test_phrase_across_audio_chunks(self):
        planner = ready_planner()
        first = planner.feed('Hello everyone, nice to', 0)
        self.assertEqual(first['tokens'], [])
        second = planner.feed('meet you. Let me introduce myself.', 1)
        self.assertEqual([t['value'] for t in second['tokens']], ['GREETING', 'INTRODUCTION'])

    def test_name_and_age(self):
        result = ready_planner().feed("My name is Julie Anderson. I'm 9 years old.", 0)
        self.assertEqual([t['value'] for t in result['tokens']], ['NAME-JULIE-ANDERSON', 'AGE-NINE'])

    def test_negation_never_matches_positive_phrase(self):
        result = ready_planner().feed('I do not like cats.', 0, flush=True)
        self.assertEqual(result['tokens'], [])
        self.assertIn('not', result['unsupported'])

    def test_unknown_speech_is_reported(self):
        result = ready_planner().feed('The weather is cold.', 0, flush=True)
        self.assertEqual(result['tokens'], [])
        self.assertEqual(result['unsupported'], 'The weather is cold.')

    def test_sequence_gap_discards_partial_phrase(self):
        planner = ready_planner()
        planner.feed('my name is', 0)
        result = planner.feed('Julie Anderson', 2, flush=True)
        self.assertEqual(result['tokens'], [])
        self.assertIn('my name is', result['unsupported'])

    def test_duplicate_chunk_rejected_without_replaying(self):
        planner = ready_planner()
        planner.feed('I like cats', 0)
        with self.assertRaises(ValueError):
            planner.feed('I like cats', 0)

    def test_flush_reports_unfinished_phrase(self):
        planner = ready_planner()
        planner.feed('hello everyone nice to', 0)
        result = planner.feed('', 1, flush=True)
        self.assertEqual(result['tokens'], [])
        self.assertEqual(result['pending'], '')
        self.assertIn('hello everyone', result['unsupported'])

    def test_repeated_real_speech_is_not_deduplicated(self):
        planner = ready_planner()
        self.assertEqual(len(planner.feed('I like cats.', 0)['tokens']), 1)
        self.assertEqual(len(planner.feed('I like cats.', 1)['tokens']), 1)


if __name__ == '__main__':
    unittest.main()
