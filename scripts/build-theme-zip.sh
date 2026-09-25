#!/usr/bin/env bash
#
# Rebuild the ready-to-import zip for this theme bundle (the repo root
# itself is the bundle root -- see tblog's own tblog/themes/SPEC.md).
#
# The zip is named gbchallenge-theme_v<full version>.zip, taken verbatim
# from theme.json's own "version" field. Run this any time this theme's
# templates/static files change (including a version bump in
# theme.json), before committing.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SLUG="gbchallenge"

VERSION="$(python3 -c "
import json
print(json.load(open('$REPO_ROOT/theme.json'))['version'])
")"

# Remove any previously built zip (whatever version it was named after)
# so an old one is never left behind alongside the new one.
rm -f "$REPO_ROOT/${SLUG}-theme_v"*.zip

ZIP_PATH="$REPO_ROOT/${SLUG}-theme_v${VERSION}.zip"

(
    cd "$REPO_ROOT"
    zip -rq "$ZIP_PATH" theme.json thumbnail.png templates static README.md
)

echo "Built $ZIP_PATH"
