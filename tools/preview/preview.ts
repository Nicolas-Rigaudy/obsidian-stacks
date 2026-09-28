import books from "./books.json";
import games from "./games.json";
import gamesDemo from "./games-demo.json";
import mediaDemo from "./media-demo.json";
import media from "./media.json";
import { parseNote } from "../../src/logic/parseNote.ts";
import { DEFAULT_SETTINGS } from "../../src/settings/settings.ts";
import { VIEW_KINDS, VIEW_LABELS, type ViewKind } from "../../src/logic/viewKinds.ts";
import { createRenderer } from "../../src/views/renderers/index.ts";
import { setIcon } from "obsidian";
import { registerCodeBlock } from "../../src/codeBlock/registerCodeBlock.ts";
import type { MediaNote } from "../../src/types/mediaNote.ts";

const q = new URLSearchParams(location.search);
const kind = (q.get("view") ?? "shelf") as ViewKind;
document.body.classList.add("theme-" + (q.get("theme") ?? "dark"));
const lib = q.get("lib") ?? "book";
const config = DEFAULT_SETTINGS.mediaTypes[lib];
const demo = q.get("demo") === "1";
const data = ({ book: books, game: demo ? gamesDemo : games, watching: demo ? mediaDemo : media } as any)[lib];
const notes = (data as any[]).map((d) => parseNote(d.path, d.basename, d.fm, config)).filter((n): n is MediaNote => n !== null);
const noop = async () => null;
const host: any = {
	app: { metadataCache: { getFirstLinkpathDest: () => null }, vault: { getResourcePath: () => "" }, workspace: { openLinkText: noop } },
	settings: DEFAULT_SETTINGS,
	index: { get: () => notes, onChanged: () => ({}) },
	actions: { changeStatus: noop, start: noop, finish: noop, bump: noop, correct: noop },
	openView: noop,
	prefs: () => ({ sort: q.get("sort") ?? "library", density: q.get("density") ?? "medium", openPiles: (q.get("open") ?? "").split(",").filter(Boolean).map((x) => x.replace("|", "\u0000")), openCases: [] }),
	saveSettings: async () => {},
	savePrefs: () => {},
};
const leaf = document.body.createDiv({ cls: "workspace-leaf-content" });
const view = leaf.createDiv({ cls: "view-content stacks-view" });
view.dataset.appearance = config.appearance;
const bar = view.createDiv({ cls: "stacks-toolbar" });
bar.createDiv({ cls: "stacks-toolbar-title", text: config.label });
const libs = bar.createDiv({ cls: "stacks-seg" });
for (const [id, c] of Object.entries(DEFAULT_SETTINGS.mediaTypes)) {
	const b = libs.createEl("button", { cls: "stacks-seg-btn" + (id === lib ? " is-active" : "") });
	setIcon(b.createSpan({ cls: "stacks-seg-icon" }), "x"); b.createSpan({ text: c.label });
}
if (config.categoryFilters.length >= 2) {
	const chips = bar.createDiv({ cls: "stacks-seg is-small" });
	for (const f of [{ value: null, label: "All" }, ...config.categoryFilters]) chips.createEl("button", { cls: "stacks-seg-btn" + (f.value === q.get("filter") ? " is-active" : ""), text: f.label });
}
const sb = bar.createDiv({ cls: "stacks-search" }); setIcon(sb.createSpan({ cls: "stacks-search-icon" }), "search"); const si = sb.createEl("input", { cls: "stacks-search-input", attr: { placeholder: "Search  /" } }); si.value = q.get("search") ?? "";
setIcon(bar.createEl("button", { cls: "stacks-button is-round stacks-view-options" }), "x");
const tabs = bar.createDiv({ cls: "stacks-seg" });
for (const k of VIEW_KINDS) {
	const t = tabs.createEl("button", { cls: "stacks-seg-btn" + (k === kind ? " is-active" : "") });
	setIcon(t.createSpan({ cls: "stacks-seg-icon" }), ({ shelf: "library", board: "kanban", list: "list", upnext: "bookmark" } as any)[k]);
	t.createSpan({ text: VIEW_LABELS[k] });
}
const body = view.createDiv({ cls: "stacks-view-body" });
const block = q.get("block");
if (block !== null) {
	// Run the real code-block handler, as Obsidian would for a ```stacks block in a note.
	let proc: any = null;
	registerCodeBlock({ registerMarkdownCodeBlockProcessor: (_: string, fn: any) => (proc = fn) } as any, host);
	const note = body.createDiv({ attr: { style: "max-width:760px;margin:24px auto;padding:0 16px" } });
	note.createEl("h2", { text: "Stacks embed test", attr: { style: "font-family:serif" } });
	proc(block, note.createDiv(), { addChild: (c: any) => c.load() });
} else {
	const r = createRenderer(kind, host, body.createDiv(), { libraryId: lib, statuses: null, filter: q.get("filter"), search: q.get("search") ?? "", embedded: false });
	r.load();
}
if (q.get("drop")) document.querySelector(".stacks-bookcase")?.classList.add("is-drop-target");
if (q.get("open")) (document.querySelector(".stacks-pile") as HTMLElement | null)?.click();
const scrollY = Number(q.get("scroll") ?? 0);
if (scrollY) window.setTimeout(() => ((document.querySelector(".stacks-view-body") as HTMLElement).scrollTop = scrollY), 50);
if (q.get("forcehover")) { const st = document.createElement("style"); st.textContent = ".stacks-shelves .stacks-slot:nth-child(2) .stacks-caption{opacity:1;transform:none}"; document.head.appendChild(st); }
const imgs = [...document.images];
Promise.race([
	Promise.all(imgs.map((i) => (i.complete ? null : new Promise((res) => { i.onload = i.onerror = res; })))),
	new Promise((res) => setTimeout(res, 12000)),
]).then(() => setTimeout(() => ((window as any).__ready = true), 300));
