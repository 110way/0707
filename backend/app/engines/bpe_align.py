import re
import tiktoken

def get_encoding(encoding_name: str = "cl100k_base"):
    try:
        return tiktoken.get_encoding(encoding_name)
    except Exception:
        try:
            return tiktoken.get_encoding("cl100k_base")
        except Exception:
            # Fallback if offline/custom
            return tiktoken.encoding_for_model("gpt-4")

def count_tokens(text: str, encoding_name: str = "cl100k_base") -> int:
    if not text:
        return 0
    enc = get_encoding(encoding_name)
    return len(enc.encode(text))

def align_bpe_tokens(text: str, encoding_name: str = "cl100k_base") -> str:
    """
    Apply BPE-Aware Token Alignment:
    1. Normalize whitespace (collapse multiple spaces/newlines).
    2. Collapse repeated punctuation/syntax runs (e.g. '!!', '??', '...', '===', '---').
    3. Trim trailing punctuation space splits that induce unnecessary BPE token sub-word splits.
    4. Verify with tiktoken to ensure token count does not increase.
    """
    if not text:
        return ""
    
    enc = get_encoding(encoding_name)
    initial_tokens = len(enc.encode(text))
    
    cleaned = text
    # Collapse multiple consecutive blank lines to at most 2
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    # Collapse multiple inline spaces
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    # Collapse excessive repeated punctuation
    cleaned = re.sub(r'(!){2,}', '!', cleaned)
    cleaned = re.sub(r'(\?){2,}', '?', cleaned)
    cleaned = re.sub(r'(\.){4,}', '...', cleaned)
    cleaned = re.sub(r'(=){4,}', '===', cleaned)
    cleaned = re.sub(r'(-){4,}', '---', cleaned)
    # Trim line ends
    cleaned = "\n".join(line.strip() for line in cleaned.split("\n"))
    cleaned = cleaned.strip()
    
    new_tokens = len(enc.encode(cleaned))
    
    # Ground-truth check: only return aligned version if tokens decreased or stayed same
    if new_tokens <= initial_tokens:
        return cleaned
    return text
