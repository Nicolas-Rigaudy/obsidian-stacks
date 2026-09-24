# Stacks

A self-owned Obsidian plugin: a config-driven **gallery + kanban board** engine
for media libraries (books, comics, games, movies) — replacing the fragile
Dataview / third-party-Bases combo that powered the vault's Reading/Books shelf.

Built on standalone `ItemView`s (long-stable, documented Obsidian API), **not**
against the undocumented Bases custom-view extension surface. Full design and
rationale live in the vault: `Stacks` and `Stacks — Technical Design`.

- **Status:** Phase 0 — scaffold + build pipeline (hello-world `ItemView`).
- **Obsidian target:** `minAppVersion` 1.13.0 (dev machine runs 1.13.7).

## Dev loop

```bash
cd /home/corvus/Projects/obsidian-stacks
npm install          # one-time

npm run dev          # esbuild --watch → rebuilds main.js on save
# in another terminal, when ready to test in the vault:
npm run deploy       # copies main.js + manifest.json + styles.css into the vault plugin folder

# in Obsidian: Settings → Community plugins → toggle "Stacks" off then on to reload
#   (first-ever install: after the folder appears, enable it once from the
#    Community Plugins list — that registers it in community-plugins.json)
```

`npm run build` does a type-check (`tsc -noEmit`) then a minified production
build. `npm run dev` builds unminified with inline sourcemaps and watches.

The deploy target defaults to `/home/corvus/Documents/Obsidian Vault`. Override
with `STACKS_VAULT=/path/to/vault npm run deploy` if the vault ever moves.

## Layout

```
src/main.ts        # plugin entry: registers the view, ribbon icon, command
manifest.json      # id: "stacks"
esbuild.config.mjs # bundler (standard Obsidian sample-plugin config)
scripts/deploy.sh  # copy build output → vault's .obsidian/plugins/stacks/
styles.css         # plugin styles
```

Phase 1+ (data layer, media configs, real views) is planned in
`Stacks — Technical Design` §5.
