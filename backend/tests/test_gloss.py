import unittest
from unittest.mock import patch

from backend.gloss import fallback, plan, validate_tokens


class GlossTests(unittest.TestCase):
    def test_name_and_question(self):
        self.assertEqual(fallback('Hello, my name is Nimal. What is your name?'), [
            {'type': 'sign', 'value': 'HELLO'}, {'type': 'sign', 'value': 'MY'},
            {'type': 'sign', 'value': 'NAME'}, {'type': 'spell', 'value': 'NIMAL'},
            {'type': 'sign', 'value': 'YOU'}, {'type': 'sign', 'value': 'NAME'},
            {'type': 'sign', 'value': 'WHAT'}])

    def test_negation_preserved_as_spelling(self):
        self.assertIn({'type': 'spell', 'value': 'NOT'}, fallback('I do not understand'))

    def test_thank_you_is_one_sign(self):
        self.assertEqual(fallback('Thank you!'), [{'type': 'sign', 'value': 'THANK-YOU'}])

    def test_invalid_sign_is_spelled_and_cleaned(self):
        self.assertEqual(validate_tokens([{'type': 'sign', 'value': 'run 123!'}]), [{'type': 'spell', 'value': 'RUN'}])

    def test_caps(self):
        result = validate_tokens([{'type': 'spell', 'value': 'a' * 100}] * 50)
        self.assertEqual(len(result), 25)
        self.assertEqual(len(result[0]['value']), 32)

    def test_malformed_tokens(self):
        for value in [{}, [None], [{'value': 123}]]:
            with self.assertRaises(ValueError):
                validate_tokens(value)

    @patch.dict('os.environ', {}, clear=True)
    def test_no_key(self):
        result = plan('hello')
        self.assertEqual(result['source'], 'rules')
        self.assertIsNone(result['warning'])

    @patch.dict('os.environ', {'GLOSS_API_KEY': 'test', 'GLOSS_API_URL': 'https://example.invalid', 'GLOSS_MODEL': 'test'}, clear=True)
    @patch('urllib.request.urlopen', side_effect=TimeoutError)
    def test_network_failure_falls_back(self, _):
        result = plan('hello')
        self.assertEqual(result['source'], 'rules')
        self.assertIsNotNone(result['warning'])


if __name__ == '__main__':
    unittest.main()
