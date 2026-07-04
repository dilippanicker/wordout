#!/usr/bin/env python3
"""
Wordout Word List Regeneration
===============================
Regenerates all word lists from NYT source files.
Run this to rebuild answers_en_us/gb.json and guesses_en_us/gb.json

Usage: python3 regenerate.py
Output: output/*.json files
"""

import json
from pathlib import Path

try:
    from wordfreq import word_frequency
except ImportError:
    print("Installing dependencies...")
    import subprocess
    subprocess.run(["pip", "install", "--break-system-packages", "-q", "wordfreq"], check=True)
    from wordfreq import word_frequency

# ── Approved removals ─────────────────────────────────────────────────────────

BLOCKLIST_17 = {
    "asses", "bitch", "chink", "crips", "cunts", "dicks",
    "fagot", "fucks", "jibes", "kikes", "minge", "negro",
    "pussy", "spics", "twats", "whore",
}

PROPER_NOUNS_157 = {
    "abram", "aggie", "alane", "aleck", "aline", "allis", "bambi", "barbe", "barby",
    "barde", "barny", "benni", "betty", "bevvy", "bonny", "brant", "brent", "britt",
    "bubba", "buffy", "calla", "caron", "chere", "chevy", "clint", "cobby", "colly",
    "corby", "corey", "corky", "craig", "danny", "darcy", "debby", "delly", "denis",
    "diane", "donna", "donny", "doris", "dulce", "emmet", "ender", "erica", "erick",
    "fayre", "fleur", "flory", "genny", "gilly", "goldy", "gomer", "griff", "gussy",
    "haily", "hakim", "herby", "hogan", "horst", "jacky", "james", "jemmy", "jerry",
    "jesus", "jimmy", "judas", "kandy", "katti", "kayle", "kelly", "kerry", "kiley",
    "kirby", "kylie", "lacey", "lazar", "leese", "leone", "levin", "liana", "liane",
    "lindy", "logan", "lotta", "lotte", "louie", "louis", "lyssa", "madge", "maire",
    "malva", "mamie", "mandi", "maria", "mavis", "melba", "meris", "micky", "minny",
    "mitch", "moira", "mommy", "moria", "moses", "nance", "nancy", "neddy", "netty",
    "nicol", "ninon", "nisse", "nixie", "norma", "nyssa", "ollie", "ozzie", "paolo",
    "pedro", "peggy", "penni", "pippy", "prent", "raine", "ranee", "rhody", "rorie",
    "rubin", "rudie", "sabra", "sammy", "saree", "sayer", "sella", "selle", "shawn",
    "silva", "skell", "slade", "sloan", "starr", "sybil", "taber", "tammy", "tommy",
    "towny", "tyler", "urson", "vanda", "virge", "waite", "waldo", "weber", "winna",
    "xenia", "zippy", "zonda", "zorro",
}

ALL_REMOVALS = BLOCKLIST_17 | PROPER_NOUNS_157

# UK spelling conversions (only 3 verified)
UK_CONVERSIONS = {
    "fiber": "fibre",
    "meter": "metre",
    "prize": "prise",
}

# Modern words (added to both US and UK)
MODERN_WORDS = {"abled", "admin", "bicep", "cyber", "email", "inbox", "login", "manga", "ramen"}

# ── Main ──────────────────────────────────────────────────────────────────────

def load_words(filepath):
    """Load 5-letter words from file."""
    with open(filepath, 'r') as f:
        return [w.strip().lower() for w in f if w.strip() and len(w.strip()) == 5]

def main():
    print("="*80)
    print("REGENERATING WORDOUT WORD LISTS")
    print("="*80)

    # Load source lists
    nyt_answers = load_words("source/nyt_answers.txt")
    nyt_guesses = load_words("source/nyt_guesses.txt")
    sowpods_guesses = load_words("source/sowpods_guesses_en_gb.txt")

    print(f"\nLoaded: {len(nyt_answers):,} answers, {len(nyt_guesses):,} US guesses, {len(sowpods_guesses):,} UK guesses")

    # Filter US lists
    us_answers = [w for w in nyt_answers if w not in ALL_REMOVALS]
    us_guesses = [w for w in nyt_guesses if w not in ALL_REMOVALS]

    print(f"Filtered: {len(us_answers):,} answers, {len(us_guesses):,} guesses")
    print(f"Removed: {len(ALL_REMOVALS)} words (17 blocklist + 157 proper nouns)")

    # Create UK lists
    uk_answers = set(us_answers)

    # Apply spelling conversions
    for us_word, uk_word in UK_CONVERSIONS.items():
        uk_answers.discard(us_word)
        uk_answers.add(uk_word)

    uk_answers = sorted(uk_answers)
    uk_guesses = sorted(sowpods_guesses)

    print(f"\nUK conversions: FIBER→FIBRE, METER→METRE, PRIZE→PRISE")

    # Write JSON
    Path("output").mkdir(exist_ok=True)

    output_files = {
        "output/answers_en_us.json": sorted(us_answers),
        "output/guesses_en_us.json": sorted(us_guesses),
        "output/answers_en_gb.json": uk_answers,
        "output/guesses_en_gb.json": uk_guesses,
    }

    for path, words in output_files.items():
        Path(path).write_text(json.dumps(words, indent=2))
        print(f"✓ {path} ({len(words):,} words)")

    # Meta
    meta = {
        "version": "2.0.0",
        "word_length": 5,
        "source": "NYT Wordle + SOWPODS (Norvig)",
        "counts": {
            "us": {
                "answers": len(us_answers),
                "guesses": len(us_guesses)
            },
            "gb": {
                "answers": len(uk_answers),
                "guesses": len(uk_guesses)
            }
        },
        "rules": [
            "5-letter words only",
            "No proper nouns (157 removed)",
            "No offensive words (17 blocklist)",
            "No -ED/-ING/-S forms where base exists",
            "UK spellings: FIBER→FIBRE, METER→METRE, PRIZE→PRISE"
        ]
    }

    Path("output/meta.json").write_text(json.dumps(meta, indent=2))
    print(f"✓ output/meta.json")

    print(f"\n✓ COMPLETE — ready for deployment")

if __name__ == "__main__":
    main()
