import unittest

from backend.asl import WORDS, lexical_report, translate
from backend.interpret import PhrasePlanner


class ASLTests(unittest.TestCase):
    def test_dictionary_coverage(self):
        for word in WORDS:
            with self.subTest(word=word):
                result = translate(word.replace('-', ' '))
                self.assertEqual(result['tokens'], [{'type': 'sign', 'value': word}])
                self.assertTrue(result['preview_only'])
                self.assertEqual(result['language'], 'ASL')

    def test_unknown_word_is_caption_only(self):
        result = translate('Hello Julie.')
        self.assertEqual(result['tokens'], [{'type': 'sign', 'value': 'HELLO'}])
        self.assertIn('JULIE', result['unsupported'])

    def test_negation_and_conditional_are_not_positive_signs(self):
        for text in ["I don't want help.", 'Do not eat.', 'If mother wants help.', 'Maybe eat.']:
            with self.subTest(text=text):
                result = translate(text)
                self.assertEqual(result['tokens'], [])
                self.assertTrue(any(f['kind'] == 'CONTEXT_NOT_SUPPORTED' for f in result['flags']))

    def test_phrase_split_across_chunks(self):
        planner = PhrasePlanner(reporter=lexical_report)
        self.assertEqual(planner.feed('Thank', 0)['tokens'], [])
        self.assertEqual(planner.feed('you.', 1)['tokens'], [{'type': 'sign', 'value': 'THANK-YOU'}])

    def test_does_not_match_substrings(self):
        self.assertEqual(translate('Goodbye. Helpful. Learning.')['tokens'], [])


if __name__ == '__main__':
    unittest.main()
