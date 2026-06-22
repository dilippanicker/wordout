#!/usr/bin/env python3
"""
Wordle/Quordle Word List Curation Pipeline
==========================================
Produces two JSON files:
  - answers_en_us.json   (American English answer pool)
  - answers_en_gb.json   (British English answer pool)
  - guesses_en_us.json   (all valid guesses, American)
  - guesses_en_gb.json   (all valid guesses, British)

Requirements:
  pip install nltk inflect wordfreq requests

Run:
  python3 curate.py

On first run, NLTK will download ~50MB of data to ~/nltk_data.
"""

import json
import re
import sys
import os
from pathlib import Path

# ── Dependency check ──────────────────────────────────────────────────────────

def check_deps():
    missing = []
    for pkg in ["nltk", "inflect", "wordfreq"]:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"Missing packages: {', '.join(missing)}")
        print(f"Run: pip install {' '.join(missing)}")
        sys.exit(1)

check_deps()

import nltk
import inflect
from wordfreq import word_frequency, available_languages

# ── NLTK data ─────────────────────────────────────────────────────────────────

print("Checking NLTK data...")
for resource in ["corpora/words", "corpora/wordnet", "taggers/averaged_perceptron_tagger_eng"]:
    try:
        nltk.data.find(resource)
    except LookupError:
        pkg = resource.split("/")[1]
        print(f"  Downloading {pkg}...")
        nltk.download(pkg, quiet=True)

from nltk.corpus import words as nltk_words, wordnet

# ── Config ────────────────────────────────────────────────────────────────────

WORD_LENGTH = 5

# wordfreq frequency thresholds (log scale, roughly)
# word_frequency("the", "en") ≈ 0.06
# word_frequency("chess", "en") ≈ 0.000008
# word_frequency("knell", "en") ≈ 0.0000003
ANSWER_MIN_FREQ   = 0.000003   # common enough to be a fair answer (~top 15k words)
GUESS_MIN_FREQ    = 0.0000001  # rare but real — valid to type as a guess

# Explicit blocklist — add words here that pass filters but shouldn't be answers
# (offensive, too easy, too hard, editorial calls)
BLOCKLIST = {
    # Offensive / slurs — add as needed
    "asses", "bitch", "bitty", "chink", "crips", "cunts", "dicks",
    "fagot", "fucks", "jibes", "jewel", "kikes", "lynch", "massa",
    "minge", "negro", "prick", "pussy", "spics", "twats", "wench", "whore",
    # Too trivially obvious (unfair in a game)
    "aaaaa",
}

# Force-include words that filters might incorrectly remove
# (good common words that inflect/wordnet misclassifies)
FORCE_INCLUDE_ANSWERS = {
    "abbey", "album", "alien", "alley", "apple", "arena", "atlas",
    "beach", "begin", "belle", "bench", "birth", "black", "bland",
    "blaze", "blend", "bless", "bliss", "block", "blood", "bloom",
    "blown", "blunt", "blush", "board", "bonus", "boost", "booth",
    "bound", "brace", "brain", "brand", "brave", "bread", "break",
    "breed", "brick", "bride", "brief", "bring", "brisk", "brood",
    "brook", "brown", "brush", "build", "built", "burst", "buyer",
    "cabin", "camel", "candy", "cargo", "carry", "catch", "cause",
    "chair", "chalk", "charm", "chart", "chase", "cheap", "check",
    "cheek", "cheer", "chess", "chest", "chief", "child", "china",
    "choir", "chord", "chunk", "civic", "civil", "claim", "clamp",
    "clash", "class", "clean", "clear", "clerk", "click", "cliff",
    "climb", "cling", "clock", "clone", "close", "cloth", "cloud",
    "coach", "coast", "color", "comet", "comma", "comic", "coral",
    "couch", "could", "count", "court", "cover", "craft", "crane",
    "crash", "crazy", "cream", "creek", "creep", "crest", "crime",
    "crisp", "cross", "crowd", "crown", "crush", "curve", "cycle",
    "daily", "dance", "datum", "death", "debut", "delay", "delta",
    "dense", "depth", "derby", "devil", "diary", "digit", "diner",
    "dirty", "disco", "ditch", "divid", "dodge", "doing", "doubt",
    "dough", "draft", "drain", "drama", "drank", "drape", "drawl",
    "drawn", "dread", "dream", "dress", "dried", "drift", "drill",
    "drink", "drive", "drone", "drool", "drove", "drown", "druid",
    "dryer", "dunce", "dwarf", "dwell", "dying", "eager", "eagle",
    "early", "earth", "eaten", "eight", "elite", "email", "ember",
    "empty", "enemy", "epoch", "equal", "error", "essay", "event",
    "every", "exact", "exert", "exile", "extra", "fable", "facet",
    "faith", "false", "fancy", "fatal", "fault", "feast", "fetch",
    "fever", "field", "fiend", "fifth", "fifty", "fight", "final",
    "first", "fixed", "flame", "flask", "fleck", "flesh", "flick",
    "float", "flock", "flood", "floor", "flour", "flown", "flute",
    "flyer", "focus", "foggy", "force", "forge", "forth", "found",
    "frame", "frank", "fraud", "fresh", "front", "frost", "froze",
    "fruit", "fully", "fungi", "funny", "ghost", "giddy", "given",
    "gland", "glare", "glass", "gleam", "glide", "gloom", "gloss",
    "glove", "going", "grace", "grade", "grain", "grand", "grant",
    "grasp", "grass", "grave", "graze", "greed", "green", "greet",
    "grief", "grind", "groan", "groin", "groom", "grope", "gross",
    "group", "grove", "grown", "gruel", "gruff", "guard", "guess",
    "guide", "guile", "guise", "gulch", "gusto", "haiku", "happy",
    "harsh", "haste", "haven", "heart", "heavy", "heist", "hence",
    "herbs", "hinge", "hiked", "hoist", "holly", "homer", "honey",
    "honor", "horse", "hotel", "hound", "house", "human", "humor",
    "hurry", "image", "imply", "inane", "incur", "infer", "inner",
    "input", "inter", "inure", "issue", "ivory", "jewel", "joust",
    "judge", "juice", "juicy", "jumpy", "kayak", "kebab", "kinky",
    "knack", "knave", "kneel", "knife", "knock", "knoll", "known",
    "label", "lance", "large", "laser", "latch", "later", "laugh",
    "layer", "leach", "learn", "lease", "leash", "least", "leave",
    "ledge", "legal", "lemon", "level", "light", "lilac", "limit",
    "liner", "lingo", "liver", "livid", "llama", "lodge", "logic",
    "loose", "lover", "lower", "lucky", "lunar", "lunch", "lusty",
    "lyric", "magic", "major", "maker", "manor", "maple", "march",
    "marry", "match", "mayor", "medal", "media", "mercy", "merit",
    "metal", "might", "minor", "minus", "mirth", "miser", "mixed",
    "model", "money", "month", "moral", "motif", "motor", "motto",
    "mourn", "mouse", "mouth", "movie", "muddy", "mulch", "mural",
    "music", "naive", "naval", "nerve", "never", "newly", "nicer",
    "night", "ninja", "noble", "noise", "north", "noted", "novel",
    "nymph", "ocean", "offer", "often", "olive", "onset", "opera",
    "optic", "orbit", "order", "organ", "other", "ounce", "outer",
    "outdo", "oxide", "ozone", "paint", "panel", "panic", "paper",
    "patch", "patio", "pause", "peace", "peach", "pearl", "pedal",
    "penny", "perch", "peter", "phase", "phone", "photo", "piano",
    "pixel", "pizza", "place", "plain", "plane", "plant", "plate",
    "plaza", "plead", "pleat", "pluck", "plumb", "plume", "plump",
    "plunge","plunk", "plush", "poach", "point", "polar", "poppy",
    "porch", "porter","posed", "power", "press", "price", "pride",
    "prime", "print", "prior", "prize", "probe", "prone", "proof",
    "prose", "proud", "prove", "psalm", "pudgy", "pulse", "punch",
    "puppy", "purse", "pushy", "pygmy", "query", "quest", "queue",
    "quick", "quiet", "quota", "quote", "rabbi", "radar", "radio",
    "rainy", "rally", "ramen", "rando", "range", "rapid", "raven",
    "reach", "realm", "rebel", "rebus", "recap", "refer", "reign",
    "relax", "relay", "repay", "repel", "reply", "rerun", "reset",
    "resin", "retro", "revel", "rider", "ridge", "rifle", "right",
    "rigor", "risky", "rival", "river", "robot", "rocky", "rouge",
    "rough", "round", "rouse", "route", "ruler", "rupee", "rusty",
    "saint", "salsa", "sandy", "sauce", "sauna", "savor", "scale",
    "scene", "scone", "scoop", "scope", "score", "scout", "scrap",
    "screw", "scrub", "seize", "sense", "serve", "setup", "seven",
    "shade", "shake", "shall", "shame", "shape", "share", "shark",
    "sharp", "shawl", "sheen", "sheer", "shelf", "shell", "shift",
    "shiny", "shire", "shirt", "shock", "shore", "short", "shout",
    "shove", "shown", "showy", "shrug", "siege", "sight", "sigma",
    "silly", "since", "sixth", "sixty", "sized", "skill", "skimp",
    "skirt", "skull", "slang", "slash", "sleek", "sleep", "sleet",
    "slept", "slice", "slick", "slide", "slime", "slump", "slunk",
    "slurp", "small", "smart", "smash", "smell", "smile", "smirk",
    "smite", "smith", "smock", "smoke", "snail", "snake", "snare",
    "sneak", "sniff", "snore", "snort", "snowy", "soapy", "solar",
    "solid", "solve", "sonic", "sorry", "south", "space", "spade",
    "spank", "spark", "spawn", "speak", "spear", "speck", "speed",
    "spell", "spice", "spill", "spine", "spite", "splat", "spoke",
    "spook", "spoon", "spore", "sport", "spout", "spree", "sprig",
    "spunk", "squad", "squat", "squid", "stack", "staff", "stage",
    "stain", "stair", "stake", "stale", "stall", "stamp", "stand",
    "stank", "stare", "stark", "start", "stash", "state", "stave",
    "stead", "steal", "steam", "steel", "steep", "steer", "stern",
    "stiff", "still", "sting", "stock", "stomp", "stone", "stood",
    "storm", "story", "stout", "stove", "strap", "straw", "stray",
    "strip", "strut", "stuck", "study", "stuff", "style", "suave",
    "sugar", "suite", "sunny", "super", "surge", "swamp", "swarm",
    "swear", "sweat", "sweep", "sweet", "swept", "swift", "swill",
    "swine", "swing", "swipe", "swirl", "swoop", "sword", "swore",
    "sworn", "syrup", "table", "talon", "tango", "tapir", "taste",
    "teach", "tense", "tenth", "their", "theme", "there", "these",
    "thick", "thing", "think", "third", "thorn", "those", "three",
    "threw", "throw", "thumb", "tiger", "tight", "timer", "tired",
    "titan", "title", "toast", "today", "token", "topic", "torch",
    "total", "touch", "tough", "toxic", "trace", "track", "trade",
    "trail", "train", "trait", "tramp", "trash", "trawl", "trend",
    "trial", "tribe", "trick", "troop", "trout", "trove", "truce",
    "truck", "truly", "trump", "trunk", "trust", "truth", "tulip",
    "tumor", "tuner", "twice", "twist", "tying", "ulcer", "ultra",
    "umbra", "uncle", "under", "undue", "union", "until", "upper",
    "upset", "urban", "usher", "usual", "utter", "vague", "valid",
    "valor", "valve", "vapid", "vault", "vicar", "video", "vigor",
    "vinyl", "viola", "viper", "viral", "virus", "visor", "vista",
    "vital", "vivid", "vocal", "vodka", "voila", "voter", "vouch",
    "vulva", "wafer", "waltz", "waste", "watch", "water", "weary",
    "weave", "wedge", "weigh", "weird", "whale", "wheat", "wheel",
    "where", "which", "while", "whiff", "whirl", "white", "whole",
    "whose", "widen", "witch", "woman", "women", "world", "worry",
    "worse", "worst", "worth", "would", "wound", "wrath", "wrist",
    "wrote", "xenon", "yacht", "yearn", "yield", "young", "youth",
    "zebra", "zesty", "zilch", "zonal",
}


# These are plural forms but common/fair as Wordle answers
IRREGULAR_PLURALS_TO_KEEP = {
    "teeth", "geese", "fungi", "algae", "cacti", "radii", "stimuli",
    "fungi", "larvae", "media", "strata", "alumni", "nuclei",
    # Body parts / everyday words
    "feet",   # only 4 letters but kept for completeness
    "mice",   # 4 letters
    "lice",   # 4 letters
}

# British spelling variants to add to GB list
BRITISH_EXTRAS = {
    "colour", "honour", "labour", "favour", "rumour", "humour", "vigour",
    "rigour", "odour", "ardour", "fervour", "valour", "vapour", "candour",
    "clamour", "glamour",  # 7-letter, won't appear in 5-letter but kept for reference
    "fibre", "litre", "metre", "theatre", "centre", "spectre",
    "grey", "tyre", "kerb", "plough", "through",
    "maths", "aluminium",  # not 5-letter but documented
    "cheque", "torque",
}
BRITISH_EXTRAS_5 = {w for w in BRITISH_EXTRAS if len(w) == 5}

# American spellings to exclude from GB list (replaced by British variants)
AMERICAN_ONLY_5 = {
    "color", "honor", "labor", "favor", "rumor", "humor", "vigor",
    "rigor", "odour", "fiber", "liter", "meter", "gray", "tire",
    "curb", "plow",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

p = inflect.engine()

def load_nltk_words():
    """Return all NLTK English words as lowercase set."""
    return set(w.lower() for w in nltk_words.words())

def is_five_alpha(word):
    return len(word) == WORD_LENGTH and word.isalpha()

def is_proper_noun(word, all_words_set):
    """
    Heuristic: if the word appears in the corpus ONLY capitalised
    (never lowercase), treat it as a proper noun.
    Also catches words with no WordNet synsets that are always capitalised.
    """
    # WordNet check: if it has noun synsets tagged as named entities
    synsets = wordnet.synsets(word)
    if synsets:
        # If ALL synsets are proper nouns (instance hypernym = named entity)
        all_proper = all(
            any(h.name().startswith("named_entity") or h.name().startswith("location")
                for h in s.root_hypernyms())
            for s in synsets
        )
        # More practical: check if lemmas are only uppercase in wordnet
        has_lower_lemma = any(
            l.name() == l.name().lower()
            for s in synsets
            for l in s.lemmas()
        )
        if not has_lower_lemma:
            return True
    return False

def is_plural(word):
    """
    Returns True if the word is a plural form.
    inflect.singular_noun() returns the singular if plural, False otherwise.
    """
    if word in IRREGULAR_PLURALS_TO_KEEP:
        return False          # treat as valid despite being plural

    result = p.singular_noun(word)
    return result is not False

def is_third_person_verb(word):
    """
    Crude check: words ending in -s that are verb forms.
    Combined with inflect to catch e.g. WALKS, MAKES, FIXES.
    """
    if not word.endswith("s"):
        return False
    # If removing -s or -es gives a known word, likely a verb form
    root = word[:-1] if word.endswith("s") else word
    root_es = word[:-2] if word.endswith("es") else word
    synsets_root = wordnet.synsets(root)
    synsets_root_es = wordnet.synsets(root_es)
    has_verb_root = any(s.pos() == "v" for s in synsets_root + synsets_root_es)
    return has_verb_root

def get_freq(word, lang="en"):
    return word_frequency(word, lang)

def passes_frequency(word, min_freq, lang="en"):
    return get_freq(word, lang) >= min_freq

# ── Main pipeline ─────────────────────────────────────────────────────────────

def build_wordlist(variant="us"):
    """
    variant: "us" or "gb"
    Returns (answers, guesses) as sorted lists.
    """
    lang = "en"  # wordfreq uses "en" for both; we adjust via explicit lists
    print(f"\n{'='*60}")
    print(f"Building {variant.upper()} word list...")
    print(f"{'='*60}")

    print("Loading NLTK words corpus...")
    all_words = load_nltk_words()
    print(f"  Total NLTK words: {len(all_words):,}")

    # Step 1: 5-letter alpha only
    five = [w for w in all_words if is_five_alpha(w)]
    print(f"\nStep 1 — 5-letter alpha words: {len(five):,}")

    # Step 2: Remove proper nouns
    print("Step 2 — Filtering proper nouns (slow, be patient)...")
    not_proper = []
    proper_caught = []
    for i, w in enumerate(five):
        if i % 500 == 0:
            print(f"  ... {i}/{len(five)}", end="\r")
        if is_proper_noun(w, all_words):
            proper_caught.append(w)
        else:
            not_proper.append(w)
    print(f"  Removed {len(proper_caught):,} proper nouns → {len(not_proper):,} remain")
    print(f"  Sample proper nouns caught: {sorted(proper_caught)[:15]}")

    # Step 3: Remove plurals
    print("Step 3 — Filtering plurals...")
    not_plural = [w for w in not_proper if not is_plural(w)]
    removed_plural = len(not_proper) - len(not_plural)
    print(f"  Removed {removed_plural:,} plurals → {len(not_plural):,} remain")

    # Step 4: Remove 3rd-person verb forms
    print("Step 4 — Filtering 3rd-person verb forms...")
    not_verb3 = [w for w in not_plural if not is_third_person_verb(w)]
    removed_verb = len(not_plural) - len(not_verb3)
    print(f"  Removed {removed_verb:,} verb forms → {len(not_verb3):,} remain")

    # Step 5: Remove blocklist
    not_blocked = [w for w in not_verb3 if w not in BLOCKLIST]
    print(f"Step 5 — After blocklist: {len(not_blocked):,}")

    # Step 6: British/American variant adjustments
    if variant == "gb":
        # Remove American-only spellings, add British extras
        adjusted = [w for w in not_blocked if w not in AMERICAN_ONLY_5]
        adjusted += [w for w in BRITISH_EXTRAS_5 if w not in adjusted]
        print(f"Step 6 — GB adjustments: {len(adjusted):,} (removed {len(not_blocked)-len(adjusted)+len(BRITISH_EXTRAS_5):,} US-only, added {len(BRITISH_EXTRAS_5):,} GB-only)")
    else:
        adjusted = not_blocked
        print(f"Step 6 — US variant, no adjustments")

    # All words that pass filters = valid guesses
    guesses_set = set(adjusted)

    # Step 7: Frequency filter for ANSWERS (must be reasonably common)
    print(f"Step 7 — Frequency filter for answers (min: {ANSWER_MIN_FREQ})...")
    freq_pass = [w for w in adjusted if passes_frequency(w, ANSWER_MIN_FREQ, lang)]
    print(f"  {len(freq_pass):,} words pass frequency threshold")

    # Step 8: Merge with force-include list
    answers_set = set(freq_pass)
    force_added = FORCE_INCLUDE_ANSWERS - answers_set
    answers_set |= FORCE_INCLUDE_ANSWERS
    # Remove any force-included that are in blocklist
    answers_set -= BLOCKLIST
    print(f"Step 8 — Force-included {len(force_added):,} additional common words")

    # Final
    answers = sorted(answers_set)
    guesses = sorted(guesses_set | answers_set)  # answers always valid guesses

    print(f"\n{'─'*40}")
    print(f"  ANSWERS pool : {len(answers):,} words")
    print(f"  GUESSES pool : {len(guesses):,} words")
    print(f"  Years of daily play (answers): {len(answers)/365:.1f} years")
    print(f"{'─'*40}")

    return answers, guesses

def save(data, path):
    Path(path).write_text(json.dumps(data, indent=2))
    print(f"  Saved → {path} ({len(data):,} words)")

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    out = Path("output")
    out.mkdir(exist_ok=True)

    us_answers, us_guesses = build_wordlist("us")
    gb_answers, gb_guesses = build_wordlist("gb")

    print("\nSaving output files...")
    save(us_answers, out / "answers_en_us.json")
    save(us_guesses, out / "guesses_en_us.json")
    save(gb_answers, out / "answers_en_gb.json")
    save(gb_guesses, out / "guesses_en_gb.json")

    # Also save a combined metadata file
    meta = {
        "version": "1.0.0",
        "generated": __import__("datetime").date.today().isoformat(),
        "word_length": WORD_LENGTH,
        "counts": {
            "us": {"answers": len(us_answers), "guesses": len(us_guesses)},
            "gb": {"answers": len(gb_answers), "guesses": len(gb_guesses)},
        },
        "rules": [
            "5-letter words only",
            "No proper nouns (person names, place names)",
            "No plurals",
            "No 3rd-person verb forms (walks, takes)",
            "Minimum frequency threshold for answers",
            "Manual blocklist for offensive/inappropriate words",
            "Separate American/British English variants",
        ]
    }
    save_path = out / "meta.json"
    save_path.write_text(json.dumps(meta, indent=2))
    print(f"  Saved → {save_path}")
    print("\nDone.")
