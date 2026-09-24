import { ItemView, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { VIEW_KINDS, VIEW_LABELS, type ViewKind } from "../logic/viewKinds.ts";
import { createRenderer } from "./renderers/index.ts";
import { defaultLibraryId, emptyState, type LibraryRenderer, type StacksHost } from "./shared.ts";

export const VIEW_TYPES: Record<ViewKind, string> = {
	shelf: "stacks-shelf",
	board: "stacks-board",
	list: "stacks-list",
	upnext: "stacks-upnext",
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
		return { ...super.getState(), library: this.libraryId, filter: this.filter };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (typeof state === "object" && state !== null) {
			const st = state as { library?: unknown; filter?: unknown };
			if (typeof st.library === "string") this.libraryId = st.library;
			this.filter = typeof st.filter === "string" ? st.filter : null;
		}
		await super.setState(state, result);
		this.mount();
	}

	async onOpen(): Promise<void> {
		this.mount();
	}

	async onClose(): Promise<void> {
		if (this.renderer) this.removeChild(this.renderer);
		this.renderer = null;
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
		this.toolbar(el, id);
		const body = el.createDiv({ cls: "stacks-view-body" });
		if (!id) {
			emptyState(body, "No library is enabled. Turn one on in Settings → Stacks.");
			return;
		}
		const filters = this.host.settings.mediaTypes[id].categoryFilters;
		const category = filters.length >= 2 && filters.some((f) => f.value === this.filter) ? this.filter : null;
		this.renderer = this.addChild(
			createRenderer(this.kind, this.host, body.createDiv(), { libraryId: id, statuses: null, category, embedded: false }),
		);
	}

	private toolbar(el: HTMLElement, id: string | null): void {
		const bar = el.createDiv({ cls: "stacks-toolbar" });
		bar.createDiv({ cls: "stacks-toolbar-title", text: id ? this.host.settings.mediaTypes[id].label : "Stacks" });

		const libraries = Object.entries(this.host.settings.mediaTypes).filter(([, c]) => c.enabled);
		if (libraries.length > 1 && id) {
			const select = bar.createEl("select", { cls: "dropdown stacks-library-select", attr: { "aria-label": "Library" } });
			for (const [lid, c] of libraries) select.createEl("option", { text: c.label || lid, value: lid });
			select.value = id;
			select.addEventListener("change", () => {
				void this.leaf.setViewState({ type: VIEW_TYPES[this.kind], state: { library: select.value } });
			});
		}

		const filters = id ? this.host.settings.mediaTypes[id].categoryFilters : [];
		if (filters.length >= 2) {
			const chips = bar.createDiv({ cls: "stacks-chips", attr: { role: "radiogroup", "aria-label": "Filter" } });
			const active = filters.some((f) => f.value === this.filter) ? this.filter : null;
			for (const f of [{ value: null, label: "All" }, ...filters]) {
				const chip = chips.createEl("button", { cls: "stacks-chip", text: f.label, attr: { role: "radio", "aria-checked": String(f.value === active) } });
				chip.toggleClass("is-active", f.value === active);
				chip.addEventListener("click", () => {
					if (f.value === active) return;
					this.filter = f.value;
					this.app.workspace.requestSaveLayout();
					this.mount();
				});
			}
		}

		const tabs = bar.createDiv({ cls: "stacks-tabs", attr: { role: "tablist" } });
		for (const kind of VIEW_KINDS) {
			const tab = tabs.createEl("button", { cls: "stacks-tab", attr: { role: "tab", "aria-selected": String(kind === this.kind) } });
			tab.toggleClass("is-active", kind === this.kind);
			setIcon(tab.createSpan({ cls: "stacks-tab-icon" }), VIEW_ICONS[kind]);
			tab.createSpan({ text: VIEW_LABELS[kind] });
			tab.addEventListener("click", () => {
				if (kind === this.kind) return;
				void this.leaf.setViewState({ type: VIEW_TYPES[kind], active: true, state: { library: id, filter: this.filter } });
			});
		}
	}
}
