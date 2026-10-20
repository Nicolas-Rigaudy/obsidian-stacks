#!/usr/bin/env bash
set -euo pipefail

# Copies the built plugin into the Obsidian vault's plugin folder.
# Usage: STACKS_VAULT=/path/to/vault npm run deploy
if [ -z "${STACKS_VAULT:-}" ]; then
	echo "error: set STACKS_VAULT to the path of the vault to deploy into." >&2
	exit 1
fi
VAULT="$STACKS_VAULT"
PLUGIN_DIR="$VAULT/.obsidian/plugins/stacks"

if [ ! -f main.js ]; then
	echo "error: main.js not found — run 'npm run build' (or 'npm run dev') first." >&2
	exit 1
fi

mkdir -p "$PLUGIN_DIR"
cp -v main.js manifest.json "$PLUGIN_DIR/"
if [ -f styles.css ]; then
	cp -v styles.css "$PLUGIN_DIR/"
fi

echo ""
echo "Deployed to: $PLUGIN_DIR"
echo "In Obsidian: Settings → Community plugins → toggle 'Stacks' off then on to reload."
