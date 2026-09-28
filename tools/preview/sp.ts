import "./obsidian-shim.ts";
import books from "./books.json";
import { SeriesPanel } from "../../src/views/seriesPanel.ts";
import { parseNote } from "../../src/logic/parseNote.ts";
import { DEFAULT_SETTINGS } from "../../src/settings/settings.ts";
document.body.classList.add("theme-dark");
const config = DEFAULT_SETTINGS.mediaTypes.book;
const notes = (books as any[]).map((d) => parseNote(d.path, d.basename, d.fm, config)).filter(Boolean);
const host: any = { settings: DEFAULT_SETTINGS, app: { metadataCache: { getFirstLinkpathDest: () => null }, vault: { getResourcePath: () => "" }, workspace: {} },
	index: { get: () => notes, onChanged: () => ({}), offref: () => {} }, actions: {}, prefs: () => ({ sort: "library", density: "medium", openPiles: [], openCases: [] }), savePrefs() {}, saveSettings: async () => {} };
new SeriesPanel(host.app, host, "book", new URLSearchParams(location.search).get("s") ?? "Eisenhorn", () => {}).open();
setTimeout(() => ((window as any).__ready = true), 2500);
