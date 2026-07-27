import re
import spacy

try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    # If en_core_web_sm isn't initialized yet, load blank English pipeline
    nlp = spacy.blank("en")

# List of polite fluff phrases & sign-offs to strip with regex
POLITE_FLUFF_PATTERNS = [
    r"(?i)\b(hi|hello|hey|dear)\b\s*([A-Za-z0-9_]+)?,?",
    r"(?i)\b(thanks|thank you|best regards|regards|cheers|sincerely|warm regards|thanks in advance)\b.*$",
    r"(?i)\bhope this (email|message) finds you well,?\b",
    r"(?i)\b(please|kindly|could you|would you mind|if possible|i was wondering if|be so good as to)\b",
    r"(?i)\b(as soon as possible|at your earliest convenience)\b",
]

# Set of low-information adverbs to prune during SpaCy POS analysis
LOW_INFO_ADVERBS = {
    "basically", "actually", "literally", "really", "very", "extremely",
    "obviously", "definitely", "totally", "absolutely", "kindly", "simply",
    "just", "generally", "normally", "fairly", "quite", "somewhat", "currently",
    "presently", "honestly", "frankly"
}

WORDY_PHRASE_REPLACEMENTS = [
    (r"(?i)\bin order to\b", "to"),
    (r"(?i)\bdue to the fact that\b", "because"),
    (r"(?i)\bat this point in time\b", "now"),
    (r"(?i)\bwith regard to\b", "about"),
    (r"(?i)\bis able to\b", "can"),
    (r"(?i)\bmake use of\b", "use"),
    (r"(?i)\bfor the purpose of\b", "for"),
    (r"(?i)\bhas the capability of\b", "can"),
    (r"(?i)\bwith reference to\b", "about"),
    (r"(?i)\bit is necessary to\b", "must"),
]

# Contextual Phrase replacements for typos that depend on surrounding words
CONTEXTUAL_PHRASE_REPLACEMENTS = [
    (r"(?i)\b(different|technical|select)\s+personal\b", r"\1 persona"),
    (r"(?i)\bpersonals\b", "personas"),
    (r"(?i)\bcarbon\s+emiison\b", "carbon emission"),
    (r"(?i)\bcarbon\s+emision\b", "carbon emission"),
    (r"(?i)\boptmied\s+prompt\b", "optimized prompt"),
    (r"(?i)\boptmizeed\s+prompt\b", "optimized prompt"),
    (r"(?i)\boptmized\s+prompt\b", "optimized prompt"),
    (r"(?i)\bjon\s+output\b", "JSON Output"),
    (r"(?i)\bai\s+agnew\b", "AI agent"),
]

# Dictionary of common software engineering & general typos and their corrections
COMMON_SPELLING_TYPOS = {
    # Auth & Security
    "authenitcation": "authentication",
    "authenication": "authentication",
    "authentcation": "authentication",
    "athentication": "authentication",
    "authintication": "authentication",
    "authenicate": "authenticate",
    "pasword": "password",
    "passwrd": "password",
    "passowrd": "password",
    "securty": "security",
    "securiy": "security",
    "securtiy": "security",
    "enctype": "encryption",
    "encryp": "encrypt",
    "encrytion": "encryption",
    
    # Microservices & Architecture
    "microservce": "microservice",
    "microservis": "microservice",
    "microserivce": "microservice",
    "architecure": "architecture",
    "architectur": "architecture",
    "infra": "infrastructure",
    "infrastucture": "infrastructure",

    # Database & Data
    "databse": "database",
    "datbase": "database",
    "databaes": "database",
    "postgre": "postgresql",
    "scheam": "schema",
    "shema": "schema",
    "schoema": "schema",
    "schoemas": "schemas",
    "schemes": "schemas",
    "querry": "query",
    "querey": "query",
    
    # Web & API
    "reqest": "request",
    "requst": "request",
    "reuest": "request",
    "reponse": "response",
    "responce": "response",
    "repons": "response",
    "compnent": "component",
    "componet": "component",
    "componant": "component",
    "endpiont": "endpoint",
    "endpoit": "endpoint",
    "fastapi": "FastAPI",
    
    # Development & Engineering
    "implemnt": "implement",
    "implment": "implement",
    "impliment": "implement",
    "optimze": "optimize",
    "optmize": "optimize",
    "optamize": "optimize",
    "optmizng": "optimizing",
    "optmizing": "optimizing",
    "optmied": "optimized",
    "optmizeed": "optimized",
    "optmized": "optimized",
    "emiison": "emission",
    "emision": "emission",
    "achivd": "achieve",
    "achiv": "achieve",
    "mestake": "mistake",
    "mestakes": "mistakes",
    "wokingas": "working as",
    "woking": "working",
    "agnew": "agent",
    "functionallity": "functionality",
    "functonality": "functionality",
    "framwork": "framework",
    "framworks": "frameworks",
    "pipelne": "pipeline",
    "pipeine": "pipeline",
    "containr": "container",
    "conatiner": "container",
    "configuation": "configuration",
    "configration": "configuration",
    "deploment": "deployment",
    "deplyment": "deployment",
    "deply": "deploy",
    "testcases": "test cases",
    "testcase": "test case",
    "integretion": "integration",
    "integrtion": "integration",
    "scrummaster": "Scrum Master",
}

# Vocabulary set from SpaCy + Domain words for edit-distance candidate matching
VALID_WORDS = set(w.lower() for w in nlp.vocab.strings if w.isalpha() and len(w) > 1)
TECH_WORDS = {
    'optimization', 'optimizing', 'optimize', 'authentication', 'authenticate',
    'microservice', 'microservices', 'database', 'databases', 'architecture',
    'infrastructure', 'configuration', 'deployment', 'endpoint', 'endpoints',
    'component', 'components', 'security', 'integration', 'framework', 'frameworks',
    'pipeline', 'pipelines', 'container', 'containers', 'fastapi', 'typescript',
    'javascript', 'python', 'postgresql', 'mongodb', 'graphql', 'docker', 'kubernetes',
    'emission', 'emissions', 'achieve', 'achieved', 'schema', 'schemas', 'persona', 'personas'
}
VALID_WORDS.update(TECH_WORDS)

def _edits1(word: str):
    letters = 'abcdefghijklmnopqrstuvwxyz'
    splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
    deletes = [L + R[1:] for L, R in splits if R]
    transposes = [L + R[1] + R[0] + R[2:] for L, R in splits if len(R) > 1]
    replaces = [L + c + R[1:] for L, R in splits if R for c in letters]
    inserts = [L + c + R for L, R in splits for c in letters]
    return set(deletes + transposes + replaces + inserts)

def correct_single_word(word: str) -> str:
    lower_word = word.lower()
    # 1. Fast exact dictionary match
    if lower_word in COMMON_SPELLING_TYPOS:
        corr = COMMON_SPELLING_TYPOS[lower_word]
        return corr.capitalize() if word.istitle() else (corr.upper() if word.isupper() else corr)

    # 2. Skip valid words or numbers/short codes
    if lower_word in VALID_WORDS or not word.isalpha() or len(word) <= 2:
        return word

    # 3. Try 1-edit distance candidate matching
    candidates = [w for w in _edits1(lower_word) if w in VALID_WORDS]
    if candidates:
        best = max(candidates, key=lambda w: nlp.vocab[w].prob if (w in nlp.vocab and nlp.vocab[w].prob != 0) else -100)
        return best.capitalize() if word.istitle() else (best.upper() if word.isupper() else best)

    return word

def correct_spelling(text: str) -> str:
    """
    Deterministic Hybrid Spell Correction Engine:
    Applies contextual phrase replacements, dictionary lookup, and SpaCy edit-distance matching.
    """
    if not text:
        return ""
    
    cleaned = text
    # Step A: Contextual phrase fixes (e.g. "select different personal" -> "select different persona")
    for pattern, replacement in CONTEXTUAL_PHRASE_REPLACEMENTS:
        cleaned = re.sub(pattern, replacement, cleaned)
        
    # Step B: Word-level dictionary and edit-distance correction
    return re.sub(r'\b[A-Za-z]+\b', lambda m: correct_single_word(m.group(0)), cleaned)

PDF_CORPORATE_FLUFF_PATTERNS = [
    r"(?i)\bthis (document|file|pdf|specification|section) (describes|provides|outlines|details|presents|covers|contains)\b",
    r"(?i)\bthe purpose of this (document|file|pdf|section|specification) is to\b",
    r"(?i)\b(it is recommended that|it should be noted that|please note that|it is important to note that)\b",
    r"(?i)\b(in order to ensure that|for the purpose of ensuring that)\b",
    r"(?i)\b(as mentioned previously|as described above|as stated in the section above)\b",
    r"(?i)\[Extracted \d+-Sentence Summary from [^\]]+\]:?",
]

def defluff_text(text: str) -> str:
    """
    NLP De-Fluffing & Spell Correction Engine:
    1. Corrects spelling typos deterministically.
    2. Removes greetings, sign-offs, politeness filler, and PDF corporate fluff using regex.
    3. Uses SpaCy POS tagging to filter out low-information filler adverbs.
    4. Cleans up resulting punctuation and spacing.
    """
    if not text:
        return ""
    
    # Step 1: Automatic Spelling Correction
    cleaned = correct_spelling(text)
    
    # Step 2: Remove polite & PDF corporate fluff patterns
    for pattern in POLITE_FLUFF_PATTERNS + PDF_CORPORATE_FLUFF_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned)
    
    # Step 3: Process through SpaCy for POS tag checking
    if nlp.has_pipe("tagger") or nlp.has_pipe("attribute_ruler"):
        doc = nlp(cleaned)
        filtered_tokens = []
        for token in doc:
            if token.pos_ == "ADV" and token.text.lower() in LOW_INFO_ADVERBS:
                continue
            filtered_tokens.append(token.text_with_ws)
        cleaned = "".join(filtered_tokens)
    else:
        words = cleaned.split()
        filtered = [w for w in words if w.lower() not in LOW_INFO_ADVERBS]
        cleaned = " ".join(filtered)
        
    # Clean up leftover artifacts
    cleaned = re.sub(r' +', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()

def compress_text_by_level(text: str, level: int = 3) -> str:
    """
    Progressive Text Compression Engine scaling from Level 1 to Level 5.
    """
    if not text:
        return ""
    
    # Level 1+: Base defluffing & spell correction
    cleaned = defluff_text(text)
    if level <= 1:
        return cleaned
    
    # Level 2+: Replace wordy phrases
    for pattern, replacement in WORDY_PHRASE_REPLACEMENTS:
        cleaned = re.sub(pattern, replacement, cleaned)
    if level <= 2:
        return cleaned
    
    # Level 3+: Strip auxiliary filler words
    cleaned = re.sub(r"(?i)\b(basically|actually|literally|really|very|extremely|obviously|definitely)\b", "", cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if level <= 3:
        return cleaned
    
    # Level 4: Telegraphic phrasing (strip non-essential articles 'a', 'an', 'the')
    words = cleaned.split()
    if len(words) > 4:
        words = [w for w in words if w.lower() not in {"a", "an", "the"}]
    cleaned = " ".join(words).strip()
    if level <= 4:
        return cleaned
    
    # Level 5: Maximum compression - Strip auxiliary verbs ('is', 'are', 'was', 'were', 'be', 'been')
    words = cleaned.split()
    if len(words) > 4:
        words = [w for w in words if w.lower() not in {"a", "an", "the", "is", "are", "was", "were", "be", "been", "should", "would", "could"}]
    return " ".join(words).strip()
