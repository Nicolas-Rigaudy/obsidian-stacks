import "./obsidian-shim.ts";
import { SeriesPanel } from "../../src/views/seriesPanel.ts";
import { parseNote } from "../../src/logic/parseNote.ts";
import { settings, snapshots } from "./harness.ts";
document.body.classList.add("theme-dark");
const config = settings.mediaTypes.book;
const notes = snapshots("book").map((d) => parseNote(d.path, d.basename, d.fm, config)).filter(Boolean);
const host: any = { settings, app: { metadataCache: { getFirstLinkpathDest: () => null }, vault: { getResourcePath: () => "" }, workspace: {} },
	index: { ready: true, get: () => notes, onChanged: () => ({}), offref: () => {} }, actions: {}, prefs: () => ({ sort: "library", density: "medium", openPiles: [], openCases: [] }), savePrefs() {}, saveSettings: async () => {} };
new SeriesPanel(host.app, host, "book", new URLSearchParams(location.search).get("s") ?? "Sherlock Holmes", () => {}).open();
setTimeout(() => ((window as any).__ready = true), 2500);
