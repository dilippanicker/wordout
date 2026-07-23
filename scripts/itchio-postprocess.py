#!/usr/bin/env python3
"""Post-process a root-relative `expo export --platform web` output for itch.io.

itch.io serves HTML5 uploads from a CDN path assigned per-upload (e.g.
/html/123456/), never from a known/fixed prefix, and never from origin
root either. Two independent things break on that setup and this script
fixes both, plus one more fix unrelated to the CDN-path problem:

1. Asset references baked into the export as absolute paths ("/assets/...",
   "/favicon.ico", "/_expo/...") resolve against the CDN's *origin*, not
   its actual serving directory, and 404. Fixed by rewriting them relative.

2. Expo Router reads the full browser URL to resolve its initial route, so
   any path other than "/" 404s before the app boots. Fixing this with a
   plain history.replaceState() (the obvious first attempt) breaks (1)
   instead: replaceState also moves document.baseURI, which is what every
   *relative* reference from (1) resolves against, so the router "fix"
   un-fixes the asset paths. The actual fix pins an explicit <base href>
   to the real CDN directory first (decoupling relative-asset resolution
   from window.location), then normalizes the visible path to "/" for the
   router. Order matters -- the <base> must land before the parser reaches
   any relative-src element, hence: first thing injected into <head>.

3. Expo's default web template has no `viewport-fit=cover`, so the CSS
   `env(safe-area-inset-*)` values react-native-safe-area-context reads on
   web always resolve to 0 -- the app never pads for a notch/status bar
   even when itch's mobile embed renders it full-screen behind one. Fixed
   by adding `viewport-fit=cover` to the viewport meta tag.

Once booted, all further navigation (e.g. Settings) is client-side
(pushState) and never re-hits the CDN, so this only has to run once, here,
on the very first load. Caveat: a manual page reload while on a sub-route
(e.g. /settings) issues a real request the CDN can't serve and 404s for
real -- inherent to any client-routed SPA on a static host without a
server-side rewrite rule, not itch.io-specific, and not something a
client-side script can fix.

Usage: scripts/itchio-postprocess.py [dist-dir]
  dist-dir defaults to "dist" at the repo root. Must be the output of an
  `expo export --platform web` run with experiments.baseUrl UNSET (a
  root-relative build) -- this script does not itself touch app.json.
"""

import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BOOT_SCRIPT = """<script>
(function() {
  var realPath = window.location.pathname;
  var baseHref = realPath.endsWith('/') ? realPath : realPath.replace(/[^/]*$/, '');
  var base = document.createElement('base');
  base.href = baseHref;
  document.head.insertBefore(base, document.head.firstChild);

  if (realPath !== '/') {
    window.history.replaceState(null, '', '/' + window.location.search + window.location.hash);
  }
})();
</script>
"""


def main():
    dist_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist")

    index_path = os.path.join(dist_dir, "index.html")
    with open(index_path) as f:
        html = f.read()
    html = html.replace('href="/favicon.ico"', 'href="favicon.ico"')
    html = html.replace('src="/_expo/', 'src="_expo/')
    html = html.replace('shrink-to-fit=no"', 'shrink-to-fit=no, viewport-fit=cover"')
    html = html.replace("<head>", "<head>\n" + BOOT_SCRIPT, 1)
    with open(index_path, "w") as f:
        f.write(html)
    print(f"index.html: injected boot script, relativized favicon/entry refs, added viewport-fit=cover")

    bundle_paths = glob.glob(os.path.join(dist_dir, "_expo/static/js/web/entry-*.js"))
    if not bundle_paths:
        sys.exit(f"error: no entry bundle found under {dist_dir}/_expo/static/js/web/")
    for bundle_path in bundle_paths:
        with open(bundle_path) as f:
            js = f.read()
        count = js.count('"/assets/')
        js = js.replace('"/assets/', '"assets/')
        with open(bundle_path, "w") as f:
            f.write(js)
        print(f"{os.path.relpath(bundle_path, dist_dir)}: rewrote {count} asset refs to relative")


if __name__ == "__main__":
    main()
