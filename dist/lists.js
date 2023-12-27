const list_2_3 = {
    "ational": "ate", "tional": "tion", "enci": "ence", "anci": "ance",
    "izer": "ize", "abli": "able", "alli": "al", "entli": "ent",
    "eli": "e", "ousli": "ous", "ization": "ize", "ation": "ate",
    "ator": "ate", "alism": "al", "iveness": "ive", "fulness": "ful",
    "ousness": "ous", "aliti": "al", "iviti": "ive", "biliti": "ble",
    "logi": "log", "icate": "ic", "ative": "", "alize": "al",
    "iciti": "ic", "ical": "ic", "ful": "", "ness": "",
    "ability": "able", "ibility": "ible", "ation": "ate", "ization": "ize",
    "ition": "ite", "ality": "al", "ivity": "ive", "ivity": "ive",
    "ment": "", "ness": "ness", "ship": "", "sion": "sion", "tion": "tion",
    "ance": "ance", "ence": "ence", "hood": "", "ism": "ism", "ist": "ist",
    "ity": "ity", "ment": "ment", "ness": "ness", "ship": "ship",
    "th": "th", "ese": "ese", "ize": "ize", "ise": "ise"
};

const list_4 = [
    "al", "ance", "ence", "er", "ic", "able", "ible", "ant", "ement",
    "ment", "ent", "sion", "tion", "ou", "ism", "ate", "iti", "ous",
    "ive", "ize", "ship", "ness", "hood", "less", "wise", "ful", "ward",
    "dom", "ity", "ness", "ment", "ist", "alism", "ization", "ation",
    "ator", "iveness", "fulness", "ousness", "alist", "ivity", "ency",
    "ancy", "ility", "nesses", "ations", "izers", "atives", "ments",
    "ances", "ences", "ists", "isms", "nesses", "ities", "ives", "izes", "ous"
];

const stopWords = ['the', 'a', 'and', 'of', 'in', 'to', 'is', 'you',
    'that', 'it', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his',
    'they', 'at', 'be', 'this', 'from', 'I', 'have', 'or', 'by', 'one',
    'had', 'not', 'but', 'what', 'all', 'were', 'we', 'when', 'your',
    'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do',
    'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many',
    'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like',
    'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go',
    'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than',
    'first', 'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find',
    'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'];

export { list_2_3, list_4, stopWords }