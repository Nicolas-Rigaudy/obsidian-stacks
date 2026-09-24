# Stacks

A self-owned Obsidian plugin: a config-driven **gallery + kanban board** engine
for media libraries (books, comics, games, movies) — replacing the fragile
Dataview / third-party-Bases combo that powered the vault's Reading/Books shelf.

Built on standalone `ItemView`s (long-stable, documented Obsidian API), **not**
against the undocumented Bases custom-view extension surface. Full design and
rationale live in the vault: `Stacks` and `Stacks — Technical Design`.

- **Status:** Phase 1 — data layer, settings, up-next logic (books only for now; other libraries come later as config).
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

`npm test` runs the unit tests with Node's built-in runner (`node:test`, no
test dependencies; Node 22.18+/23.6+ runs the `.ts` files directly). Tests cover
the pure modules in `src/logic/` and `src/settings/settings.ts`, which have no
`obsidian` imports. Relative imports use explicit `.ts` extensions so Node can
resolve them, and type-only imports use `import type`.

The deploy target defaults to `/home/corvus/Documents/Obsidian Vault`. Override
with `STACKS_VAULT=/path/to/vault npm run deploy` if the vault ever moves.

## Layout

```
src/main.ts                  # plugin entry: settings, live index, views, commands
src/types/                   # MediaTypeConfig, MediaNote (no obsidian imports)
src/logic/                   # pure, unit-tested: upNext, parseNote, logSection, progress
src/settings/settings.ts     # defaults (books) + merge of saved data (pure, tested)
src/settings/settingsTab.ts  # one collapsible section per library
src/data/                    # obsidian-facing: vaultReader, liveIndex, frontmatterWriter, activityLog
src/views/IndexStatusView.ts # Phase 1 check view: live counts + up next per library
tests/                       # node:test suites
scripts/deploy.sh            # copy build output -> vault's .obsidian/plugins/stacks/
```

Phase 2+ (real gallery / board / list / up-next views) is planned in
`Stacks — Technical Design` §5.
