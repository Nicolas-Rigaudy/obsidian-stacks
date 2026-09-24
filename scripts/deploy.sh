#!/usr/bin/env bash
set -euo pipefail

# Copies the built plugin into the Obsidian vault's plugin folder.
# Override the vault path with STACKS_VAULT if it ever moves.
VAULT="${STACKS_VAULT:-/home/corvus/Documents/Obsidian Vault}"
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
