import { debounce, ItemView, Menu, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { SHELF_SORTS } from "../logic/shelf.ts";
import { VIEW_KINDS, VIEW_LABELS, type ViewKind } from "../logic/viewKinds.ts";
import { QuickAddModal } from "./quickAdd.ts";
import { createRenderer } from "./renderers/index.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import { defaultLibraryId, emptyState, type LibraryRenderer, type StacksHost } from "./shared.ts";

export const VIEW_TYPES: Record<ViewKind, string> = {
	shelf: "stacks-shelf",
	board: "stacks-board",
	list: "stacks-list",
	upnext: "stacks-upnext",
};

const LIBRARY_ICONS: Record<MediaTypeConfig["appearance"], string> = {
	books: "book-open",
	games: "gamepad-2",
	films: "clapperboard",
};

export const VIEW_ICONS: Record<ViewKind, string> = {
	shelf: "library",
	board: "kanban",
	list: "list",
	upnext: "bookmark",
};

/**
 * One Stacks screen in its own tab. Never inside a Markdown sizer, so it's
 * full width by construction. The library id is saved with the workspace.
 */
export class StacksView extends ItemView {
	private readonly host: StacksHost;
	private readonly kind: ViewKind;
	private libraryId: string | null = null;
	/** Active filter chip (a category value), or null for All. */
	private filter: string | null = null;
	/** Live search text (not saved: a fresh tab starts unfiltered). */
	private search = "";
	/** Scroll position of the tab body, saved with the workspace. */
	private scrollTop = 0;
	private searchInput: HTMLInputElement | null = null;
	private renderer: LibraryRenderer | null = null;

	constructor(leaf: WorkspaceLeaf, host: StacksHost, kind: ViewKind) {
		super(leaf);
		this.host = host;
		this.kind = kind;
	}

	getViewType(): string {
		return VIEW_TYPES[this.kind];
	}

	getDisplayText(): string {
		const label = this.currentLibraryId() ? this.host.settings.mediaTypes[this.currentLibraryId()!].label : "Stacks";
		return `${label}: ${VIEW_LABELS[this.kind]}`;
	}

	getIcon(): string {
		return VIEW_ICONS[this.kind];
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), library: this.libraryId, filter: this.filter, scroll: Math.round(this.scrollTop) };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (typeof state === "object" && state !== null) {
			const st = state as { library?: unknown; filter?: unknown; scroll?: unknown };
			if (typeof st.library === "string") this.libraryId = st.library;
			this.filter = typeof st.filter === "string" ? st.filter : null;
			if (typeof st.scroll === "number") this.scrollTop = st.scroll;
		}
		await super.setState(state, result);
		this.mount();
	}

	async onOpen(): Promise<void> {
		this.mount();
		// "/" jumps to the search box (unless typing somewhere already).
		this.registerDomEvent(this.containerEl, "keydown", (evt: KeyboardEvent) => {
			const t = evt.target as HTMLElement | null;
			if (evt.key !== "/" || !this.searchInput || t?.closest("input, textarea, [contenteditable='true']")) return;
			evt.preventDefault();
			this.searchInput.focus();
		});
	}

	async onClose(): Promise<void> {
		if (this.renderer) this.removeChild(this.renderer);
		this.renderer = null;
	}

	/** Sort and cover size for this library, remembered across restarts. */
	private viewOptionsMenu(id: string): Menu {
		const prefs = this.host.prefs(id);
		const menu = new Menu();
		menu.addItem((i) => i.setTitle("Sort").setIsLabel(true));
		for (const s of SHELF_SORTS) {
			menu.addItem((i) =>
				i.setTitle(s.label).setChecked(prefs.sort === s.value).onClick(() => {
					prefs.sort = s.value;
					this.host.savePrefs();
					this.renderer?.refresh();
				}),
			);
		}
		menu.addSeparator();
		menu.addItem((i) => i.setTitle("Cover size").setIsLabel(true));
		for (const d of ["small", "medium", "large"] as const) {
			menu.addItem((i) =>
				i.setTitle(d[0].toUpperCase() + d.slice(1)).setChecked(prefs.density === d).onClick(() => {
					prefs.density = d;
					this.host.savePrefs();
					this.renderer?.refresh();
				}),
			);
		}
		return menu;
	}

	private currentLibraryId(): string | null {
		const id = this.libraryId;
		if (id && this.host.settings.mediaTypes[id]?.enabled) return id;
		return defaultLibraryId(this.host.settings);
	}

	private mount(): void {
		if (this.renderer) this.removeChild(this.renderer);
		this.renderer = null;

		const el = this.contentEl;
		el.empty();
		el.addClass("stacks-view");
		const id = this.currentLibraryId();
		if (id) el.dataset.appearance = this.host.settings.mediaTypes[id].appearance;
		else delete el.dataset.appearance;
		this.toolbar(el, id);
		const body = el.createDiv({ cls: "stacks-view-body" });
		if (!id) {
			emptyState(body, "No library is enabled. Turn one on in Settings → Stacks.");
			return;
		}
		const filters = this.host.settings.mediaTypes[id].categoryFilters;
		const category = filters.length >= 2 && filters.some((f) => f.value === this.filter) ? this.filter : null;
		this.renderer = this.addChild(
			createRenderer(this.kind, this.host, body.createDiv(), { libraryId: id, statuses: null, filter: category, search: this.search, embedded: false }),
		);
		// Back where we were: restore the scroll once rendered, remember it as it changes.
		const saveLayout = debounce(() => this.app.workspace.requestSaveLayout(), 600, true);
		window.requestAnimationFrame(() => (body.scrollTop = this.scrollTop));
		body.addEventListener("scroll", () => {
			this.scrollTop = body.scrollTop;
			saveLayout();
		}, { passive: true });
	}

	private toolbar(el: HTMLElement, id: string | null): void {
		const bar = el.createDiv({ cls: "stacks-toolbar" });
		bar.createDiv({ cls: "stacks-toolbar-title", text: id ? this.host.settings.mediaTypes[id].label : "Stacks" });

		// Same control family everywhere in the toolbar: libraries, filters, screens.
		const libraries = Object.entries(this.host.settings.mediaTypes).filter(([, c]) => c.enabled);
		if (libraries.length > 1 && id) {
			const libs = bar.createDiv({ cls: "stacks-seg", attr: { role: "tablist", "aria-label": "Library" } });
			for (const [lid, c] of libraries) {
				const b = libs.createEl("button", { cls: "stacks-seg-btn", attr: { role: "tab", "aria-selected": String(lid === id) } });
				b.toggleClass("is-active", lid === id);
				setIcon(b.createSpan({ cls: "stacks-seg-icon" }), LIBRARY_ICONS[c.appearance]);
				b.createSpan({ text: c.label || lid });
				b.addEventListener("click", () => {
					if (lid !== id) void this.leaf.setViewState({ type: VIEW_TYPES[this.kind], state: { library: lid } });
				});
			}
		}

		// Libraries stay anchored on the left, filters and screens on the right,
		// so nothing shifts under the pointer when switching.
		bar.createDiv({ cls: "stacks-toolbar-spacer" });
		if (id) {
			const box = bar.createDiv({ cls: "stacks-search" });
			setIcon(box.createSpan({ cls: "stacks-search-icon" }), "search");
			const input = box.createEl("input", { cls: "stacks-search-input", attr: { type: "search", placeholder: "Search  /", "aria-label": "Search this library", spellcheck: "false" } });
			input.value = this.search;
			const apply = debounce(() => this.renderer?.setSearch(this.search), 120, true);
			input.addEventListener("input", () => {
				this.search = input.value;
				apply();
			});
			input.addEventListener("keydown", (evt) => {
				if (evt.key === "Escape" && input.value) {
					evt.stopPropagation();
					input.value = this.search = "";
					this.renderer?.setSearch("");
				}
			});
			this.searchInput = input;

			const opts = bar.createEl("button", { cls: "stacks-button is-round stacks-view-options", attr: { "aria-label": "View options: sort and cover size" } });
			setIcon(opts, "sliders-horizontal");
			opts.addEventListener("click", (evt) => this.viewOptionsMenu(id).showAtMouseEvent(evt));

			const add = bar.createEl("button", { cls: "stacks-button is-primary stacks-add", attr: { "aria-label": "Add to library" } });
			setIcon(add.createSpan({ cls: "stacks-seg-icon" }), "plus");
			add.createSpan({ text: "Add" });
			add.addEventListener("click", () => {
				const config = this.host.settings.mediaTypes[id];
				// Start on the chip that's selected: Games + Switch chip → a Switch game; Reading + BDs → a BD.
				const cat = config.filterField ? undefined : this.filter ?? undefined;
				const modal = new QuickAddModal(this.app, this.host, id, cat);
				if (config.filterField && this.filter) modal.presetPlatform(this.filter);
				modal.open();
			});
		}
		const filters = id ? this.host.settings.mediaTypes[id].categoryFilters : [];
		if (filters.length >= 2) {
			const chips = bar.createDiv({ cls: "stacks-seg is-small", attr: { role: "radiogroup", "aria-label": "Filter" } });
			const active = filters.some((f) => f.value === this.filter) ? this.filter : null;
			for (const f of [{ value: null, label: "All" }, ...filters]) {
				const chip = chips.createEl("button", { cls: "stacks-seg-btn", text: f.label, attr: { role: "radio", "aria-checked": String(f.value === active) } });
				chip.toggleClass("is-active", f.value === active);
				chip.addEventListener("click", () => {
					if (f.value === active) return;
					this.filter = f.value;
					this.app.workspace.requestSaveLayout();
					this.mount();
				});
			}
		}

		const tabs = bar.createDiv({ cls: "stacks-seg", attr: { role: "tablist", "aria-label": "Screen" } });
		for (const kind of VIEW_KINDS) {
			const tab = tabs.createEl("button", { cls: "stacks-seg-btn", attr: { role: "tab", "aria-selected": String(kind === this.kind) } });
			tab.toggleClass("is-active", kind === this.kind);
			setIcon(tab.createSpan({ cls: "stacks-seg-icon" }), VIEW_ICONS[kind]);
			tab.createSpan({ text: VIEW_LABELS[kind] });
			tab.addEventListener("click", () => {
				if (kind === this.kind) return;
				void this.leaf.setViewState({ type: VIEW_TYPES[kind], active: true, state: { library: id, filter: this.filter } });
			});
		}
	}
}
