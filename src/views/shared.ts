import { Keymap, Menu, MarkdownRenderChild, type App } from "obsidian";
import type { LibraryActions } from "../data/actions.ts";
import type { LiveIndex } from "../data/liveIndex.ts";
import { creatorOf, secondaryLine, seriesLabel } from "../logic/cardText.ts";
import { parseCoverRef } from "../logic/cover.ts";
import { bindingHue } from "../logic/placeholder.ts";
import { cartridgeKind, type CartridgeKind } from "../logic/stage.ts";
import { bucketOf } from "../logic/upNext.ts";
import { slugify } from "../logic/values.ts";
import type { ViewKind } from "../logic/viewKinds.ts";
import type { LibraryPrefs, StacksSettings } from "../settings/settings.ts";
import { matchesSearch } from "../logic/search.ts";
import { CoverPickerModal } from "./coverPicker.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";

/** What views need from the plugin (avoids importing main.ts). */
export interface StacksHost {
	app: App;
	settings: StacksSettings;
	index: LiveIndex;
	actions: LibraryActions;
	openView(kind: ViewKind, libraryId?: string): Promise<void>;
	/** A library's remembered view preferences (created on first use). */
	prefs(libraryId: string): LibraryPrefs;
	/** Save preferences soon (doesn't re-index). */
	savePrefs(): void;
	/** Save library settings (re-indexes). */
	saveSettings(): Promise<void>;
}

export interface RenderOptions {
	libraryId: string;
	/** Only these statuses (shelf bookcases, board columns, list rows). Null = all. */
	statuses: string[] | null;
	/** Only notes whose filter value (category, platform...) is this chip. Null = all. */
	filter: string | null;
	/** Live search text from the toolbar ("" = none). */
	search?: string;
	/** Inside a note (code block) rather than its own tab. */
	embedded: boolean;
}

export function inFilter<T extends MediaNote>(notes: readonly T[], filter: string | null): readonly T[] {
	return filter === null ? notes : notes.filter((n) => n.facet === filter);
}

export function defaultLibraryId(settings: StacksSettings): string | null {
	return Object.entries(settings.mediaTypes).find(([, c]) => c.enabled)?.[0] ?? null;
}

/**
 * Base for the four screens. Re-renders from the live index whenever its
 * library changes, so it never shows a stale copy. A MarkdownRenderChild, so
 * the same class mounts in a tab (ItemView.addChild) or in a note (code block).
 */
export abstract class LibraryRenderer extends MarkdownRenderChild {
	protected readonly host: StacksHost;
	protected options: RenderOptions;

	constructor(host: StacksHost, containerEl: HTMLElement, options: RenderOptions) {
		super(containerEl);
		this.host = host;
		this.options = options;
	}

	onload(): void {
		this.registerEvent(
			this.host.index.onChanged((ids) => {
				if (ids.includes(this.options.libraryId)) this.refresh();
			}),
		);
		this.refresh();
	}

	refresh(): void {
		const el = this.containerEl;
		const config = this.host.settings.mediaTypes[this.options.libraryId];
		this.captureState();
		el.empty();
		el.addClass("stacks-root");
		el.toggleClass("is-embedded", this.options.embedded);
		if (config) el.dataset.appearance = config.appearance;
		el.dataset.density = this.host.prefs(this.options.libraryId).density;
		if (!config || !config.enabled) {
			el.createDiv({ cls: "stacks-empty", text: `Library "${this.options.libraryId}" isn't set up or is disabled. See Settings → Stacks.` });
			return;
		}
		if (!this.host.index.ready) {
			// The cache is still filling in at startup: a partial shelf would look like lost notes.
			el.createDiv({ cls: "stacks-empty stacks-loading", text: `Loading ${config.label}…` });
			return;
		}
		let notes = inFilter(this.host.index.get(this.options.libraryId), this.options.filter);
		const only = this.options.statuses;
		if (only) notes = notes.filter((n) => n.status !== null && only.includes(n.status));
		const q = this.options.search ?? "";
		if (q.trim()) notes = notes.filter((n) => matchesSearch(n, config, q));
		this.render(el, config, notes);
		this.restoreState();
	}

	/** New toolbar search text: re-render in place (the input keeps focus). */
	setSearch(query: string): void {
		if ((this.options.search ?? "") === query) return;
		this.options = { ...this.options, search: query };
		this.refresh();
	}

	protected get searching(): boolean {
		return (this.options.search ?? "").trim() !== "";
	}

	/** Hooks around a re-render, e.g. to keep scroll positions inside the view. */
	protected captureState(): void {}
	protected restoreState(): void {}

	protected abstract render(el: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void;
}

export function resolveCover(app: App, note: MediaNote): string | null {
	const ref = parseCoverRef(note.cover);
	if (!ref) return null;
	if (ref.kind === "url") return ref.url;
	const file = app.metadataCache.getFirstLinkpathDest(ref.link, note.path);
	return file ? app.vault.getResourcePath(file) : null;
}

export type BookSize = "shelf" | "thumb" | "desk";

/**
 * A book: the cover image with a spine edge and shadow, or, without art (or
 * if the image fails to load), a cloth binding with the title stamped in foil.
 */
export function renderBook(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, note: MediaNote, size: BookSize): HTMLElement {
	if (config.appearance !== "books") return renderCase(parent, host, config, note, size);
	const book = parent.createDiv({ cls: `stacks-book is-${size}` });
	if (note.category) book.dataset.category = note.category;
	renderCaption(book, config, note, size);
	const bucket = bucketOf(note.status, config);
	if (bucket === "active") book.createDiv({ cls: "stacks-bookmark" });

	const src = resolveCover(host.app, note);
	if (src) {
		const img = book.createEl("img", { cls: "stacks-book-cover", attr: { src, alt: note.title, loading: "lazy", draggable: "false" } });
		const fallback = () => {
			if (!img.isConnected) return;
			img.remove();
			renderBinding(book, config, note);
		};
		img.addEventListener("error", fallback, { once: true });
		// Open Library answers a missing cover with a 1×1 pixel, not an error.
		img.addEventListener("load", () => {
			if (img.naturalWidth < 10 || img.naturalHeight < 10) fallback();
		}, { once: true });
	} else {
		renderBinding(book, config, note);
	}
	return book;
}

/**
 * A game case (styled per platform: Switch, PC, Miyoo...) or a disc case
 * (per category: film, series, anime): a labelled band on top, the cover art
 * behind a plastic sleeve, or a printed insert when there's no art.
 */
function renderCase(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, note: MediaNote, size: BookSize): HTMLElement {
	const box = parent.createDiv({ cls: `stacks-book is-${size} is-case is-case-${config.appearance}` });
	renderCaption(box, config, note, size);
	const label =
		config.appearance === "games"
			? creatorOf(note, config)
			: (config.categoryFilters.find((f) => f.value === note.category)?.label ?? note.category);
	box.dataset.kind = label ? slugify(label) : "other";
	const cart = config.appearance === "games" ? cartridgeKind(label) : null;
	if (cart) box.dataset.cart = cart;
	const band = box.createDiv({ cls: "stacks-case-band" });
	renderBandText(band, cart, label);
	// Real depth for boxes (PC big box, series box set): a lit top face and a shaded side.
	box.createDiv({ cls: "stacks-case-top" });
	box.createDiv({ cls: "stacks-case-side" });
	// The ▼ insert arrow moulded under a cartridge's label.
	if (cart) box.createDiv({ cls: "stacks-case-foot" });
	// Japanese releases wrap an obi strip down the spine side (shown for anime).
	if (config.appearance === "films") box.createDiv({ cls: "stacks-case-obi", text: note.title });

	const src = resolveCover(host.app, note);
	if (src) {
		const img = box.createEl("img", { cls: "stacks-book-cover stacks-case-art", attr: { src, alt: note.title, loading: "lazy", draggable: "false" } });
		const fallback = () => {
			if (!img.isConnected) return;
			img.remove();
			renderInsert(box, note);
		};
		img.addEventListener("error", fallback, { once: true });
		img.addEventListener("load", () => {
			if (img.naturalWidth < 10 || img.naturalHeight < 10) fallback();
		}, { once: true });
	} else {
		renderInsert(box, note);
	}
	return box;
}

/**
 * The full name, shown over the cover as soon as the pointer is on it (the
 * system tooltip is slow). Also the element's accessible name. Thumbnails sit
 * next to their text already, so they only get a label for screen readers.
 */
function renderCaption(el: HTMLElement, config: MediaTypeConfig, note: MediaNote, size: BookSize): void {
	const sub = secondaryLine(note, config);
	if (size === "thumb") {
		el.setAttr("aria-hidden", "true");
		return;
	}
	const cap = el.createDiv({ cls: "stacks-caption" });
	cap.createDiv({ cls: "stacks-caption-title", text: note.title });
	if (sub) cap.createDiv({ cls: "stacks-caption-sub", text: sub });
}

/** The printed header of a cartridge label (red Nintendo Switch band, embossed Game Boy top...). */
function renderBandText(band: HTMLElement, cart: CartridgeKind | null, label: string | null): void {
	if (cart === "switch") {
		band.createSpan({ cls: "stacks-switch-logo" });
		const words = band.createSpan({ cls: "stacks-switch-words" });
		words.createSpan({ cls: "stacks-switch-small", text: "NINTENDO" });
		words.createSpan({ text: "SWITCH" });
	} else if (cart === "gba") {
		band.setText("GAME BOY ADVANCE");
	} else if (cart === "gb") {
		band.createSpan({ cls: "stacks-gb-nintendo", text: "Nintendo" });
		band.createSpan({ text: "GAME BOY" });
	} else if (cart === "ds" || cart === "3ds") {
		band.createSpan({ cls: "stacks-switch-small", text: "NINTENDO " });
		band.createSpan({ text: cart === "3ds" ? "3DS" : "DS" });
	} else {
		band.setText(label ?? "");
	}
}

/** The printed insert of a case without cover art: title on a coloured sleeve. */
function renderInsert(box: HTMLElement, note: MediaNote): void {
	box.addClass("is-blank");
	box.style.setProperty("--stacks-hue", String(bindingHue(note.series?.name ?? note.title)));
	const insert = box.createDiv({ cls: "stacks-case-insert" });
	insert.createDiv({ cls: "stacks-case-title", text: note.title });
	const sub = seriesLabel(note);
	if (sub) insert.createDiv({ cls: "stacks-case-sub", text: sub });
}

function renderBinding(book: HTMLElement, config: MediaTypeConfig, note: MediaNote): void {
	book.addClass("is-binding");
	book.style.setProperty("--stacks-hue", String(bindingHue(note.series?.name ?? note.title)));
	const face = book.createDiv({ cls: "stacks-binding-face" });
	const title = face.createDiv({ cls: "stacks-binding-title", text: note.title });
	const longest = Math.max(...note.title.split(/\s+/).map((w) => w.length));
	if (longest >= 11) title.addClass("is-long");
	const sub = secondaryLine(note, config);
	if (sub) face.createDiv({ cls: "stacks-binding-sub", text: sub });
}

export function openNote(host: StacksHost, path: string, evt: MouseEvent | KeyboardEvent): void {
	void host.app.workspace.openLinkText(path, "", Keymap.isModEvent(evt));
}

/** Click opens the note; right-click (long-press on mobile) opens the menu; Enter works too. */
export function makeInteractive(el: HTMLElement, host: StacksHost, config: MediaTypeConfig, note: MediaNote): void {
	el.tabIndex = 0;
	el.setAttr("role", "link");
	el.addEventListener("click", (evt) => openNote(host, note.path, evt));
	el.addEventListener("keydown", (evt) => {
		if (evt.key === "Enter") openNote(host, note.path, evt);
	});
	el.addEventListener("contextmenu", (evt) => {
		evt.preventDefault();
		noteMenu(host, config, note).showAtMouseEvent(evt);
	});
}

export function noteMenu(host: StacksHost, config: MediaTypeConfig, note: MediaNote): Menu {
	const menu = new Menu();
	menu.addItem((i) => i.setTitle("Open").setIcon("book-open").onClick(() => void host.app.workspace.openLinkText(note.path, "", false)));
	menu.addItem((i) => i.setTitle("Open in new tab").setIcon("file-plus").onClick(() => void host.app.workspace.openLinkText(note.path, "", "tab")));
	menu.addItem((i) => i.setTitle("Change cover…").setIcon("image").onClick(() => new CoverPickerModal(host.app, host, config, note).open()));
	if (config.starField) {
		menu.addItem((i) =>
			i.setTitle(note.starred ? "Unstar (remove from Buy next)" : "Star for Buy next").setIcon("star")
				.onClick(() => void host.actions.setStar(note.path, config, !note.starred)),
		);
	}
	menu.addSeparator();
	for (const s of config.statuses) {
		menu.addItem((i) =>
			i
				.setTitle(`Move to ${s.label || s.value}`)
				.setChecked(note.status === s.value)
				.onClick(() => void host.actions.changeStatus(note.path, config, s.value)),
		);
	}
	return menu;
}

/** Drag payload type, so Obsidian's own file drags are ignored. */
const DRAG_TYPE = "application/x-stacks-note";

/**
 * Let a book or card be dragged to another status. `root` gets
 * `is-dragging-note` while it moves (the shelf uses it to reveal empty bookcases).
 */
export function makeDraggable(el: HTMLElement, root: HTMLElement, note: MediaNote): void {
	el.setAttr("draggable", "true");
	let stopScrolling: (() => void) | null = null;
	el.addEventListener("dragstart", (evt) => {
		if (!evt.dataTransfer) return;
		evt.dataTransfer.setData(DRAG_TYPE, note.path);
		evt.dataTransfer.effectAllowed = "move";
		el.addClass("is-dragging");
		// Changing layout inside dragstart cancels the drag in Chromium: wait a tick.
		window.setTimeout(() => root.addClass("is-dragging-note"), 0);
		stopScrolling = autoScrollWhileDragging(el);
	});
	el.addEventListener("dragend", () => {
		el.removeClass("is-dragging");
		root.removeClass("is-dragging-note");
		stopScrolling?.();
		stopScrolling = null;
	});
}

/** Every ancestor that can scroll (the tab body, a board, a note's reading view...). */
function scrollableAncestors(el: HTMLElement): HTMLElement[] {
	const out: HTMLElement[] = [];
	for (let n = el.parentElement; n; n = n.parentElement) {
		const st = getComputedStyle(n);
		const y = /(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight;
		const x = /(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth;
		if (x || y) out.push(n);
	}
	return out;
}

/**
 * While a drag is in progress, holding the pointer near the edge of a
 * scrollable area scrolls it, faster the closer to the edge. Returns a stop function.
 */
function autoScrollWhileDragging(source: HTMLElement): () => void {
	const areas = scrollableAncestors(source);
	const EDGE = 80;
	const MAX_STEP = 26;
	let pointer: { x: number; y: number } | null = null;
	let frame = 0;
	const step = (distance: number) => Math.ceil(MAX_STEP * Math.min(1, Math.max(0, 1 - distance / EDGE)));
	const tick = () => {
		if (pointer) {
			for (const a of areas) {
				const r = a.getBoundingClientRect();
				if (pointer.x < r.left || pointer.x > r.right || pointer.y < r.top || pointer.y > r.bottom) continue;
				if (a.scrollHeight > a.clientHeight) {
					if (pointer.y < r.top + EDGE) a.scrollTop -= step(pointer.y - r.top);
					else if (pointer.y > r.bottom - EDGE) a.scrollTop += step(r.bottom - pointer.y);
				}
				if (a.scrollWidth > a.clientWidth) {
					if (pointer.x < r.left + EDGE) a.scrollLeft -= step(pointer.x - r.left);
					else if (pointer.x > r.right - EDGE) a.scrollLeft += step(r.right - pointer.x);
				}
			}
		}
		frame = window.requestAnimationFrame(tick);
	};
	const onDragOver = (evt: DragEvent) => {
		pointer = { x: evt.clientX, y: evt.clientY };
	};
	document.addEventListener("dragover", onDragOver, true);
	frame = window.requestAnimationFrame(tick);
	return () => {
		document.removeEventListener("dragover", onDragOver, true);
		window.cancelAnimationFrame(frame);
	};
}

/** Make `target` accept dropped notes; `onDrop` gets the dropped note's path. */
export function acceptNoteDrops(target: HTMLElement, onDrop: (path: string) => void): void {
	const ours = (evt: DragEvent) => evt.dataTransfer?.types.includes(DRAG_TYPE) ?? false;
	target.addEventListener("dragover", (evt) => {
		if (!ours(evt)) return;
		evt.preventDefault();
		if (evt.dataTransfer) evt.dataTransfer.dropEffect = "move";
		target.addClass("is-drop-target");
	});
	target.addEventListener("dragleave", (evt) => {
		if (!target.contains(evt.relatedTarget as Node | null)) target.removeClass("is-drop-target");
	});
	target.addEventListener("drop", (evt) => {
		if (!ours(evt)) return;
		evt.preventDefault();
		target.removeClass("is-drop-target");
		const path = evt.dataTransfer?.getData(DRAG_TYPE);
		if (path) onDrop(path);
	});
}

export function emptyState(parent: HTMLElement, text: string): void {
	parent.createDiv({ cls: "stacks-empty", text });
}
