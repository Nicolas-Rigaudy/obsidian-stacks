# Preview harness

Renders Stacks views with real library data in Electron, offscreen, to PNG. Check a UI change here before deploying to the vault.

- `obsidian-shim.ts` fakes the Obsidian API: DOM helpers, Modal, Menu, Notice, setIcon, and requestUrl (through fetch, with webSecurity off).
- Pages:
  - `index.html` + `preview.ts`: the library views.
  - `qa.*`: quick add.
  - `cp.*`, `cp2.*`: cover picker.
  - `sp.*`: series panel.
- Data: `books.json`, `games.json`, `media.json` (+ `*-demo.json`) are snapshots of the vault notes (`{ path, basename, fm }`). They're gitignored and go stale. In `books.json`, `Ekhö monde miroir 03` was removed on purpose so a "missing" ghost shows.

```sh
cd tools/preview
cp ../../styles.css .
npx esbuild preview.ts --bundle --outfile=preview.js --alias:obsidian=./obsidian-shim.ts --format=iife
SHOTS='[{"query":{"lib":"book","view":"shelf","theme":"dark","filter":"bd","open":"backlog|Ekhö monde miroir","scroll":"760"},"w":1440,"h":700,"out":"shot.png","wait":2500}]' \
  electron43 shot.js --no-sandbox
```

Query keys:
- `lib`: book | game | media.
- `view`: shelf | board | list | upnext.
- `theme`: light | dark.
- `filter`: a category chip.
- `sort`, `density`.
- `open`: comma-separated `status|Series` piles to spread.
- `scroll`: in px; 99999 scrolls to the bottom.

Each shot takes `page` (default `index.html`), `w`, `h`, `out` and `wait` (ms).
