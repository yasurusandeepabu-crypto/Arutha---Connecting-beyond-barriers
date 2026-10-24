"""Conservative English analysis. These rules do not specify SLSL grammar."""

import re

NUMBERS = dict(zip('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(), map(str, range(21))))
ENGLISH_MEANINGS = {
    'GREETING': {'predicate': 'greeting', 'agent': 'speaker', 'patient': 'everyone', 'slots': {}},
    'INTRODUCTION': {'predicate': 'self_introduction', 'agent': 'speaker', 'patient': 'speaker', 'slots': {}},
    'NAME-JULIE-ANDERSON': {'predicate': 'name', 'agent': 'speaker', 'patient': None, 'slots': {'name': 'julie anderson'}},
    'AGE-NINE': {'predicate': 'age', 'agent': 'speaker', 'patient': None, 'slots': {'age': '9'}},
    'FROM-SOUTH-AFRICA': {'predicate': 'origin', 'agent': 'speaker', 'patient': None, 'slots': {'place': 'south africa'}},
    'LIKE-PANCAKES-HOT-DOGS': {'predicate': 'like', 'agent': 'speaker', 'patient': 'pancakes and hot dogs', 'slots': {}},
    'LIKE-YELLOW': {'predicate': 'like', 'agent': 'speaker', 'patient': 'yellow', 'slots': {}},
    'LIKE-CATS': {'predicate': 'like', 'agent': 'speaker', 'patient': 'cats', 'slots': {}},
    'MORE-ABOUT-ME': {'predicate': 'listener_knows_more', 'agent': 'addressee', 'patient': 'speaker', 'slots': {}},
    'HOPE-FRIENDS': {'predicate': 'hope_friendship', 'agent': 'speaker', 'patient': 'speaker_and_addressee', 'slots': {}},
}
CONTRACTIONS = {"i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
                "he's": 'he is', "she's": 'she is', "don't": 'do not', "doesn't": 'does not',
                "didn't": 'did not', "can't": 'can not', "cannot": 'can not', "won't": 'will not',
                "i'll": 'i will', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
                "couldn't": 'could not', "shouldn't": 'should not', "mustn't": 'must not',
                "my name's": 'my name is'}
BASE = {'polarity': 'AFFIRMATIVE', 'time': 'PRESENT', 'time_anchor': None, 'modality': 'NONE', 'speech_act': 'STATEMENT', 'relations': []}


def normalize(text):
    text = text.lower().replace('’', "'")
    for word, expanded in sorted(CONTRACTIONS.items(), key=lambda item: -len(item[0])):
        text = re.sub(r'\b' + re.escape(word) + r'\b', expanded, text)
    return ' '.join(re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text))


def frame_base(text):
    clean = normalize(text)
    frame = {**BASE, 'source_text': text, 'predicate': 'unknown', 'agent': None, 'patient': None,
             'slots': {}, 'analysis': 'rules', 'complete': False, 'uncovered': [text]}
    if re.search(r'\b(not|never|no|none|nobody|nothing|nowhere|neither|hardly)\b', clean):
        frame['polarity'] = 'NEGATIVE'
    if text.strip().endswith('?'):
        frame['speech_act'] = 'WH_QUESTION' if re.match(r'(who|what|where|when|why|how|which)\b', clean) else 'YN_QUESTION'
    if re.search(r'\b(yesterday|previously|last|was|were|did|liked|bit)\b', clean):
        frame['time'] = 'PAST'
    if re.search(r'\b(tomorrow|will)\b', clean):
        frame['time'] = 'FUTURE'
    anchor = re.search(r'\b(yesterday|today|tomorrow|now)\b', clean)
    frame['time_anchor'] = anchor[0] if anchor else None
    modal = re.search(r'\b(can|could|must|may|might|should|want)\b', clean)
    if modal:
        frame['modality'] = modal[0].upper()
    return frame


def analyze(text, phrases, catalog):
    frame = frame_base(text)
    if any(char.isalnum() and not char.isascii() for char in text) or re.search(r'[+\-]\s*\d|[%$£€₹<>]|\.\.\.|["“”]', text):
        return frame
    clean = normalize(text)
    for phrase in phrases:
        if clean in [normalize(v) for v in phrase['variants']] and phrase['id'] in ENGLISH_MEANINGS:
            frame.update(ENGLISH_MEANINGS[phrase['id']])
            # The normalized English wording is a reviewed mapping only after catalog approval.
            frame.update(complete=True, uncovered=[])
            return frame
    patterns = [
        (r'my name is (.+)', 'name', 'name'),
        (r'i am (\d+|\w+) years? old', 'age', 'age'),
        (r'i am (?:not )?from (.+)', 'origin', 'place'),
    ]
    for pattern, predicate, slot in patterns:
        match = re.fullmatch(pattern, clean)
        if match:
            value = match[1]
            if slot == 'age':
                value = NUMBERS.get(value, value)
                if not value.isdigit():
                    return frame
            frame.update(predicate=predicate, agent='speaker', slots={slot: value}, complete=True, uncovered=[])
            return frame
    subject = r'(i|you|he|she|we|they|the dog|the man|julie|nimal)'
    verbs = r'(like|likes|liked|love|loves|hate|hates|understand|understands|help|helps|bite|bites|bit)'
    auxiliary = r'(?:(?:do|does|did|can|could|must|may|might|should|will) )?(?:not |never )?'
    match = re.fullmatch(subject + ' ' + auxiliary + verbs + r' (.+)', clean)
    if match:
        agent, verb, patient = match.groups()
        lemma = {'likes': 'like', 'liked': 'like', 'loves': 'love', 'hates': 'hate', 'understands': 'understand', 'helps': 'help', 'bites': 'bite', 'bit': 'bite'}.get(verb, verb)
        if re.search(r'\b(because|unless|although|if|but|that|only|perhaps|maybe)\b', patient):
            return frame
        frame.update(predicate=lemma, agent={'i': 'speaker', 'you': 'addressee'}.get(agent, agent), patient=patient, complete=True, uncovered=[])
        return frame
    return frame


def signature(frame):
    return {key: frame.get(key, value) for key, value in {
        'predicate': None, 'agent': None, 'patient': None, 'slots': {}, **BASE,
    }.items()}
