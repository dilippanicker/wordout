#!/usr/bin/env python3
"""
Word List Review Tool
=====================
Interactive CLI to review and edit the generated word lists.

Usage:
  python3 review.py                    # review answers_en_us.json
  python3 review.py --list gb          # review British English
  python3 review.py --search CRANE     # search for a specific word
  python3 review.py --stats            # show statistics

Commands during interactive review:
  k  = keep (move to next)
  r  = remove this word
  b  = add to blocklist (removes + records reason)
  f  = force-include (marks as manually approved)
  q  = quit and save
  ?  = show word info (frequency, WordNet definition)
"""

import json
import sys
import argparse
from pathlib import Path

try:
    from wordfreq import word_frequency
    from nltk.corpus import wordnet
    import nltk
    nltk.data.find("corpora/wordnet")
    HAS_DEPS = True
except Exception as e:
    HAS_DEPS = False
    print(f"Warning detail: {e}")  # change this line temporarily
    # print("Warning: wordfreq/nltk not available, word info will be limited.")

OUT = Path("output")
REVIEW_LOG = OUT / "review_log.json"

def load(path):
    return json.loads(Path(path).read_text())

def save(data, path):
    Path(path).write_text(json.dumps(sorted(data), indent=2))

def load_review_log():
    if REVIEW_LOG.exists():
        return json.loads(REVIEW_LOG.read_text())
    return {"removed": {}, "approved": [], "blocklist": {}}

def save_review_log(log):
    REVIEW_LOG.write_text(json.dumps(log, indent=2))

def word_info(word):
    lines = []
    if HAS_DEPS:
        freq = word_frequency(word, "en")
        lines.append(f"  Frequency : {freq:.8f} ({'common' if freq > 0.00001 else 'uncommon' if freq > 0.000001 else 'rare'})")
        synsets = wordnet.synsets(word)
        if synsets:
            for s in synsets[:3]:
                lines.append(f"  [{s.pos()}] {s.definition()}")
                examples = s.examples()
                if examples:
                    lines.append(f"       e.g. \"{examples[0]}\"")
        else:
            lines.append("  No WordNet definition found")
    return "\n".join(lines) if lines else "  (no info available)"

def review_interactive(words, log, list_name):
    words = [w for w in words if w not in log["removed"] and w not in log["approved"]]
    print(f"\nReviewing {len(words)} unreviewed words in {list_name}")
    print("Commands: [k]eep  [r]emove  [b]locklist  [f]orce-approve  [?]info  [q]uit\n")

    for i, word in enumerate(words):
        approved_marker = " ✓" if word in log["approved"] else ""
        print(f"[{i+1}/{len(words)}] {word.upper()}{approved_marker}")

        while True:
            cmd = input("  > ").strip().lower()
            if cmd == "k":
                break
            elif cmd == "r":
                reason = input("  Reason (optional): ").strip()
                log["removed"][word] = reason or "manual review"
                print(f"  ✗ Removed: {word}")
                break
            elif cmd == "b":
                reason = input("  Blocklist reason: ").strip()
                log["blocklist"][word] = reason or "manual block"
                log["removed"][word] = f"blocklisted: {reason}"
                print(f"  ✗ Blocklisted: {word}")
                break
            elif cmd == "f":
                if word not in log["approved"]:
                    log["approved"].append(word)
                print(f"  ✓ Force-approved: {word}")
                break
            elif cmd == "?":
                print(word_info(word))
            elif cmd == "q":
                save_review_log(log)
                print(f"\nSaved review log. Reviewed {i} words this session.")
                return
            else:
                print("  Commands: k r b f ? q")

    save_review_log(log)
    print(f"\nReview complete! Log saved to {REVIEW_LOG}")

def apply_review_log(words, log):
    """Apply review decisions to a word list."""
    result = [w for w in words if w not in log["removed"] and w not in log["blocklist"]]
    return result

def show_stats(log):
    print(f"\nReview Log Statistics")
    print(f"  Removed   : {len(log['removed'])}")
    print(f"  Blocklist : {len(log['blocklist'])}")
    print(f"  Approved  : {len(log['approved'])}")

    for variant in ["us", "gb"]:
        path = OUT / f"answers_en_{variant}.json"
        if path.exists():
            words = load(path)
            print(f"\n  {variant.upper()} answers : {len(words):,} words ({len(words)/365:.1f} years)")

def search_word(word, log):
    word = word.lower()
    for variant in ["us", "gb"]:
        for kind in ["answers", "guesses"]:
            path = OUT / f"{kind}_en_{variant}.json"
            if path.exists():
                words = load(path)
                status = "✓ present" if word in words else "✗ absent"
                print(f"  {variant.upper()} {kind}: {status}")

    if word in log["removed"]:
        print(f"  Removed: {log['removed'][word]}")
    if word in log["blocklist"]:
        print(f"  Blocklisted: {log['blocklist'][word]}")
    if word in log["approved"]:
        print(f"  Force-approved ✓")

    print(f"\n{word_info(word)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Word list review tool")
    parser.add_argument("--list", choices=["us", "gb"], default="us")
    parser.add_argument("--search", metavar="WORD")
    parser.add_argument("--stats", action="store_true")
    parser.add_argument("--apply", action="store_true", help="Apply log to output files")
    args = parser.parse_args()

    log = load_review_log()

    if args.stats:
        show_stats(log)
    elif args.search:
        search_word(args.search, log)
    elif args.apply:
        for variant in ["us", "gb"]:
            for kind in ["answers", "guesses"]:
                path = OUT / f"{kind}_en_{variant}.json"
                if path.exists():
                    words = load(path)
                    cleaned = apply_review_log(words, log)
                    save(cleaned, path)
                    print(f"Applied log to {path.name}: {len(words)} → {len(cleaned)}")
    else:
        path = OUT / f"answers_en_{args.list}.json"
        if not path.exists():
            print(f"Run curate.py first to generate {path}")
            sys.exit(1)
        words = load(path)
        review_interactive(words, log, f"answers_en_{args.list}")
