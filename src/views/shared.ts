import { Keymap, Menu, MarkdownRenderChild, type App } from "obsidian";
import type { LibraryActions } from "../data/actions.ts";
import type { LiveIndex } from "../data/liveIndex.ts";
import { secondaryLine } from "../logic/cardText.ts";
import { parseCoverRef } from "../logic/cover.ts";
import { bindingHue } from "../logic/placeholder.ts";
import { bucketOf } from "../logic/upNext.ts";
import type { ViewKind } from "../logic/viewKinds.ts";
import type { StacksSettings } from "../settings/settings.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";

/** What views need from the plugin (avoids importing main.ts). */
export interface StacksHost {
	app: App;
	settings: StacksSettings;
	index: LiveIndex;
	actions: LibraryActions;
	openView(kind: ViewKind, libraryId?: string): Promise<void>;
}

export interface RenderOptions {
	libraryId: string;
	/** Only these statuses (shelf bookcases, board columns, list rows). Null = all. */
	statuses: string[] | null;
	/** Inside a note (code block) rather than its own tab. */
	embedded: boolean;
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
		if (!config || !config.enabled) {
			el.createDiv({ cls: "stacks-empty", text: `Library "${this.options.libraryId}" isn't set up or is disabled. See Settings → Stacks.` });
			return;
		}
		let notes = this.host.index.get(this.options.libraryId);
		const only = this.options.statuses;
		if (only) notes = notes.filter((n) => n.status !== null && only.includes(n.status));
		this.render(el, config, notes);
		this.restoreState();
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
	const book = parent.createDiv({ cls: `stacks-book is-${size}` });
	book.setAttr("aria-label", [note.title, secondaryLine(note, config)].filter(Boolean).join(" — "));
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

export function emptyState(parent: HTMLElement, text: string): void {
	parent.createDiv({ cls: "stacks-empty", text });
}
