# Stacks

Turn a folder of notes into a shelf and a board for your books, games, films and series.

Stacks reads the frontmatter of your notes and shows them as a bookcase-style shelf, a kanban board, a sortable list and an "up next" suggestion list. Your notes stay plain Markdown files: Stacks changes a status or a page count by editing the note's properties, and it works without Dataview or any other plugin.

Desktop only for now (`isDesktopOnly`): the shelf and the board are built for mouse dragging and a wide toolbar, and have not been laid out for touch. Mobile support is planned for 1.1.

## What you get

- **Shelf:** covers on shelves, grouped by status, with series stood up as piles.
- **Board:** one column per status; drag a card to change its status.
- **List:** a sortable table.
- **Up next:** what to read, play or watch next, from your backlog, respecting series order.
- **Quick add:** search a catalogue, pick a result and get a new note with the cover, creator and page or episode count filled in.
- **Progress buttons:** `+10` pages or `+1` episode on a card, with an Undo.
- Search, sorting, cover size and view state are remembered per library.

## Install

From the community plugin browser: Settings → Community plugins → Browse → search for "Stacks". (Not listed yet.)

Manually: download `main.js`, `manifest.json` and `styles.css` from a release, put them in `<your vault>/.obsidian/plugins/stacks/`, then enable Stacks under Settings → Community plugins.

## Set up your first library

A new install has no library. Open Settings → Stacks, choose a preset under **Add a library** and press **Add**:

| Preset | Notes it looks for | Statuses |
| --- | --- | --- |
| Books | `category: book` | wishlist, backlog, reading, read |
| Video games | `category: game`, `platform` | backlog, playing, played, finished, dropped |
| Films & series | `category: movie` or `series` | backlog, watching, watched, dropped |
| Comics | `category: comic` | wishlist, backlog, reading, read |
| Anime | `category: anime` | backlog, watching, watched, dropped |

Then set the **Folder** that holds the notes (empty means the whole vault). The settings page tells you in words when the folder does not exist, when no note matches, and when notes have a status the library does not list. Everything a preset sets can be changed: the category field and values, the status field and the status list (its order is the board's column order), and the field names for title, creator, cover, rating, dates, progress and series.

Open the views from the ribbon icon or the command palette (`Stacks: Open shelf`, `Open board`, `Open list`, `Open up next`).

### Example notes

A book (`Books/Dracula.md`):

```yaml
---
category: book
title: "Dracula"
author: "Bram Stoker"
status: reading
pages_read: 140
pages_total: 418
series: "Sherlock Holmes"   # optional
position: 2                  # optional
rating: 4                    # optional
cover: "https://example.org/dracula.jpg"   # URL or a vault path
---
```

A game has `platform: PC` instead of an author. A series has `episodes_watched` and `episodes_total` instead of pages. The [`sample-vault/`](sample-vault) folder has a few notes of each kind; open it as a vault to try the presets.

### Embed a view in a note

````markdown
```stacks
view: board
library: books
status: backlog, reading
filter: anime
```
````

`view` is `shelf`, `board`, `list` or `upnext`; the other lines are optional. `library` is the id shown in the library's settings (`books`, `games`, ...); without it the first enabled library is used.

### New notes

Quick add (`Stacks: Add to library…`) creates a plain Markdown note: properties, a title, the cover as an image embed and the source link. To use your own layout, set **Note template** for the library to the path of a note in your vault. The template can contain properties of its own (Stacks' fields win) and these placeholders: `{{title}}`, `{{creator}}`, `{{category}}`, `{{status}}`, `{{cover}}`, `{{year}}`, `{{isbn}}`, `{{link}}`, `{{platform}}`, `{{total}}`, `{{date}}`.

## Network use and privacy

Stacks makes network requests only when you use quick add or the cover picker, and only to look up what you typed:

| Service | Used for | Sent |
| --- | --- | --- |
| Open Library (`openlibrary.org`, `covers.openlibrary.org`) | books and covers | your search text or ISBN |
| Steam (`store.steampowered.com`, `api.steampowered.com`, `shared.akamai.steamstatic.com`) | games and cover art | your search text, a game id, the store region and language from the settings |
| Wikipedia (`en.wikipedia.org`, `upload.wikimedia.org`) | games and films, box art | your search text, an article title |
| TVmaze (`api.tvmaze.com`) | series and episode counts | your search text, a show id |
| Kitsu (`kitsu.io`) | anime and animated films | your search text |

Cover images from these services are also loaded from their own hosts when you view a result. Each library can switch individual sources off in its settings. Nothing is sent in the background, nothing about your notes is uploaded, and Stacks has no account, analytics or telemetry. Without a network, quick add still creates a note from what you typed.

## Develop

```bash
npm install
npm run dev      # esbuild watch: rebuilds main.js on save
npm run build    # type-check, then a minified production build
npm run lint     # ESLint with the Obsidian plugin rules
npm test         # unit tests (node:test, Node 22.18+)
```

To try a build in a vault: `STACKS_VAULT=/path/to/vault npm run deploy` copies `main.js`, `manifest.json` and `styles.css` into the vault's plugin folder (there is no default path), then toggle Stacks off and on in Obsidian.

The pure logic (`src/logic`, `src/settings`, `src/catalog/parse.ts`, `src/catalog/sources.ts`) has no `obsidian` imports and is covered by the tests; relative imports use explicit `.ts` extensions so Node can run them directly. `tools/preview` renders the views to PNG without Obsidian (see its README).

### Releasing

CI (`.github/workflows/ci.yml`) runs lint, tests and the build on every push to `master` and every pull request. To release:

1. `npm version <x.y.z>`: bumps `package.json`, then `version-bump.mjs` updates `manifest.json` and `versions.json` together, commits, and tags `x.y.z` (no `v` prefix, set in `.npmrc`).
2. `git push --follow-tags`.
3. The release workflow checks that the tag, `manifest.json` and `versions.json` agree (`scripts/check-release.mjs`), runs the tests and the build, and drafts a GitHub release with `main.js`, `manifest.json` and `styles.css`. Publish the draft by hand.

## License

MIT.
