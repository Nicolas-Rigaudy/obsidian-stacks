import { FuzzySuggestModal, Modal, Notice, type App, type TFile } from "obsidian";
import { catalogOptionsFor } from "../catalog/sources.ts";
import { checkImage, editionCovers, enrichCandidate, searchCatalog } from "../catalog/providers.ts";
import { catalogErrorMessage } from "../catalog/parse.ts";
import { catalogKind } from "../logic/newNote.ts";
import { creatorOf } from "../logic/cardText.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { SOURCE_LABELS } from "./quickAdd.ts";
import { resolveCover, type StacksHost } from "./shared.ts";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

/**
 * Change cover: candidates from the catalogues (other editions included for
 * books) side by side, or a pasted URL, or an image from the vault. Every URL
 * is checked to be a real image before it's written.
 */
export class CoverPickerModal extends Modal {
	private readonly host: StacksHost;
	private readonly config: MediaTypeConfig;
	private readonly note: MediaNote;
	private grid: HTMLElement | null = null;
	private seen = new Set<string>();

	constructor(app: App, host: StacksHost, config: MediaTypeConfig, note: MediaNote) {
		super(app);
		this.host = host;
		this.config = config;
		this.note = note;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("stacks-modal", "is-wide");
		modalEl.dataset.appearance = this.config.appearance;
		this.titleEl.setText(`Cover: ${this.note.title}`);

		const top = contentEl.createDiv({ cls: "stacks-cover-top" });
		const current = top.createDiv({ cls: "stacks-cover-current" });
		const src = resolveCover(this.app, this.note);
		if (src) current.createEl("img", { attr: { src, alt: "Current cover" } });
		else current.createDiv({ cls: "stacks-modal-hint", text: "No cover yet" });

		const side = top.createDiv({ cls: "stacks-cover-side" });
		const search = side.createEl("input", { cls: "stacks-modal-search", attr: { type: "search", "aria-label": "Search" } });
		search.value = [this.note.title, creatorOf(this.note, this.config)].filter(Boolean).join(" ");
		search.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") void this.load(search.value);
		});
		const row = side.createDiv({ cls: "stacks-cover-actions" });
		const find = row.createEl("button", { cls: "stacks-button is-primary", text: "Search" });
		find.addEventListener("click", () => void this.load(search.value));
		const vault = row.createEl("button", { cls: "stacks-button", text: "Image from vault…" });
		vault.addEventListener("click", () => this.pickVaultImage());

		const paste = side.createDiv({ cls: "stacks-cover-paste" });
		const url = paste.createEl("input", { cls: "stacks-modal-search", attr: { type: "url", placeholder: "…or paste an image URL", "aria-label": "Image URL" } });
		const use = paste.createEl("button", { cls: "stacks-button", text: "Use" });
		use.addEventListener("click", () => void this.useUrl(url.value.trim()));

		this.grid = contentEl.createDiv({ cls: "stacks-cover-grid" });
		void this.load(search.value);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async load(query: string): Promise<void> {
		const grid = this.grid;
		if (!grid) return;
		grid.empty();
		this.seen.clear();
		const status = grid.createDiv({ cls: "stacks-modal-hint", text: "Looking for covers…" });
		try {
			const kind = catalogKind(this.note.category ?? "");
			const options = catalogOptionsFor(kind, this.config.disabledCatalogs, this.host.settings.catalog);
			let list = await searchCatalog(kind, query, options);
			// Title + author finds nothing? Try the title alone.
			if (list.length === 0 && query.trim() !== this.note.title) list = await searchCatalog(kind, this.note.title, options);
			status.remove();
			if (list.length === 0) {
				this.showEmpty();
				return;
			}
			// Covers the search already has, then the ones that need a lookup (Steam, Wikipedia), then other editions.
			for (const c of list) for (const u of c.covers) this.tile(u, `${c.title}${c.year ? ` (${c.year})` : ""} · ${SOURCE_LABELS[c.source]}`);
			const lookups: Promise<void>[] = [];
			for (const c of list.slice(0, 6)) {
				if (c.source === "steam" || c.source === "wikipedia") {
					lookups.push(enrichCandidate(c, options).then((full) => full.covers.forEach((u) => this.tile(u, `${c.title} · ${SOURCE_LABELS[c.source]}`))));
				}
			}
			const work = list.find((c) => c.source === "openlibrary");
			if (work) lookups.push(editionCovers(work.id).then((urls) => urls.forEach((u) => this.tile(u, `${work.title} · other edition`))));
			// Once every lookup is done (and failed images had a moment to drop out), say so if nothing is left.
			void Promise.allSettled(lookups).then(() =>
				window.setTimeout(() => {
					if (this.grid && !this.grid.querySelector(".stacks-cover-tile")) this.showEmpty();
				}, 1500),
			);
		} catch (err) {
			status.setText(`Search failed. ${catalogErrorMessage(err)} You can still paste an image URL or pick an image from the vault.`);
		}
	}

	private showEmpty(): void {
		if (!this.grid || this.grid.querySelector(".stacks-cover-tile, .stacks-modal-hint")) return;
		this.grid.createDiv({ cls: "stacks-modal-hint", text: "No cover found in the catalogues. Paste an image URL above, or pick an image from the vault." });
	}

	/** A tile was dropped (image failed): say so if none are left once lookups settle. */
	private dropTile(tile: HTMLElement): void {
		tile.remove();
		window.setTimeout(() => {
			if (this.grid && !this.grid.querySelector(".stacks-cover-tile")) this.showEmpty();
		}, 1500);
	}

	/** One candidate; hidden if the image doesn't load or is a placeholder pixel. */
	private tile(url: string, caption: string): void {
		if (!this.grid || this.seen.has(url)) return;
		this.seen.add(url);
		const tile = this.grid.createEl("button", { cls: "stacks-cover-tile", attr: { "aria-label": caption } });
		const img = tile.createEl("img", { attr: { src: url, alt: caption, loading: "lazy" } });
		tile.createDiv({ cls: "stacks-cover-caption", text: caption });
		img.addEventListener("error", () => this.dropTile(tile), { once: true });
		img.addEventListener("load", () => {
			if (img.naturalWidth < 40 || img.naturalHeight < 40) this.dropTile(tile);
		}, { once: true });
		tile.addEventListener("click", () => void this.useUrl(url));
	}

	private async useUrl(url: string): Promise<void> {
		if (!/^https?:\/\//i.test(url)) {
			new Notice("Stacks: that doesn't look like an image URL.");
			return;
		}
		if (/covers\.openlibrary\.org\/b\/isbn\//i.test(url)) {
			new Notice("Stacks: the catalogue limits covers requested by ISBN. Pick a cover shown here instead.");
			return;
		}
		if (!(await checkImage(url))) {
			new Notice("Stacks: couldn't load an image from that URL.");
			return;
		}
		await this.host.actions.setCover(this.note.path, this.config, url);
		this.close();
	}

	private pickVaultImage(): void {
		new VaultImageSuggest(this.app, (file) => {
			void this.host.actions.setCover(this.note.path, this.config, `[[${file.path}]]`).then(() => this.close());
		}).open();
	}
}

class VaultImageSuggest extends FuzzySuggestModal<TFile> {
	private readonly onPick: (file: TFile) => void;

	constructor(app: App, onPick: (file: TFile) => void) {
		super(app);
		this.onPick = onPick;
		this.setPlaceholder("Pick an image from the vault");
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter((f) => IMAGE_EXT.test(f.path));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onPick(file);
	}
}
