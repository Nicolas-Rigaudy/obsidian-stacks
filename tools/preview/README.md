# Preview harness

Renders Stacks views with real library data in Electron, offscreen, to PNG. Check a UI change here before deploying to the vault.

- `obsidian-shim.ts` fakes the Obsidian API: DOM helpers, Modal, Menu, Notice, setIcon, and requestUrl (through fetch, with webSecurity off).
- Pages:
  - `index.html` + `preview.ts`: the library views.
  - `qa.*`: quick add.
  - `cp.*`, `cp2.*`: cover picker.
  - `sp.*`: series panel.
- Data: `harness.ts` gives the pages their settings and notes. By default they show the sample vault: `node sample.mts` writes `sample.json` from `sample-vault/`, and the libraries are the Books, Video games and Films & series presets. With `data=vault` in the query they use the pre-0.3 libraries and `books.json`, `games.json`, `media.json` (+ `*-demo.json`), snapshots of a private vault (`{ path, basename, fm }`). All snapshots are gitignored.

```sh
cd tools/preview
node sample.mts
cp ../../styles.css .
npx esbuild preview.ts --bundle --outfile=preview.js --alias:obsidian=./obsidian-shim.ts --format=iife
SHOTS='[{"query":{"lib":"book","view":"shelf","theme":"dark"},"w":1280,"h":720,"out":"shot.png","wait":800}]' \
  electron43 shot.js --no-sandbox
```

Query keys:
- `lib`: book | game | watching.
- `data`: vault for the private snapshots; the sample vault otherwise.
- `view`: shelf | board | list | upnext.
- `theme`: light | dark.
- `filter`: a category chip.
- `sort`, `density`.
- `open`: comma-separated `status|Series` piles to spread.
- `scroll`: in px; 99999 scrolls to the bottom.

Each shot takes `page` (default `index.html`), `w`, `h`, `out` and `wait` (ms).
