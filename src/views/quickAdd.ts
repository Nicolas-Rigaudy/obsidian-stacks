import { debounce, Modal, type App } from "obsidian";
import { checkImage, enrichCandidate, searchCatalog } from "../catalog/providers.ts";
import { manualCandidate, type Candidate } from "../catalog/parse.ts";
import { buildNewNote, catalogKind, uniqueFileName } from "../logic/newNote.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { StacksHost } from "./shared.ts";

const CATEGORY_LABELS: Record<string, string> = { book: "Book", bd: "BD", game: "Game", movie: "Film", series: "Series", anime: "Anime" };

/**
 * Quick add: search the right catalogue, pick a result, get a note with the
 * library's fields, a verified cover and the page/episode total.
 */
export class QuickAddModal extends Modal {
	private readonly host: StacksHost;
	private readonly libraryId: string;
	private category: string;
	private status: string;
	private platform: string;
	private query = "";
	private results: HTMLElement | null = null;
	private busy = false;
	private seq = 0;

	constructor(app: App, host: StacksHost, libraryId: string, category?: string) {
		super(app);
		this.host = host;
		this.libraryId = libraryId;
		const config = this.config;
		this.category = category && config.categoryValues.includes(category) ? category : config.categoryValues[0] ?? "book";
		this.status = config.statuses.find((s) => s.bucket === "other" && /wish/i.test(s.value))?.value ?? config.statuses.find((s) => s.bucket === "backlog")?.value ?? config.statuses[0]?.value ?? "";
		this.platform = config.appearance === "games" ? config.categoryFilters[0]?.value ?? "PC" : "";
	}

	/** Start on this platform (games opened from a platform chip). */
	presetPlatform(platform: string): void {
		this.platform = platform;
	}

	private get config(): MediaTypeConfig {
		return this.host.settings.mediaTypes[this.libraryId];
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("stacks-modal");
		if (this.config.appearance) modalEl.dataset.appearance = this.config.appearance;
		this.titleEl.setText(`Add to ${this.config.label}`);

		const controls = contentEl.createDiv({ cls: "stacks-modal-controls" });
		if (this.config.categoryValues.length > 1) {
			this.segmented(controls, "Kind", this.config.categoryValues.map((v) => ({ value: v, label: CATEGORY_LABELS[v] ?? v })), () => this.category, (v) => {
				this.category = v;
				this.search();
			});
		}
		if (this.config.appearance === "games") {
			const platforms = this.config.categoryFilters.map((f) => ({ value: f.value, label: f.label }));
			if (platforms.length > 0) this.segmented(controls, "Platform", platforms, () => this.platform, (v) => (this.platform = v));
		}
		const starts = this.config.statuses.filter((s) => s.bucket === "backlog" || s.bucket === "other" || s.bucket === "active");
		this.segmented(controls, "Add as", starts.map((s) => ({ value: s.value, label: s.label || s.value })), () => this.status, (v) => (this.status = v));

		const input = contentEl.createEl("input", {
			cls: "stacks-modal-search",
			attr: { type: "search", placeholder: this.placeholder(), "aria-label": "Search" },
		});
		const run = debounce(() => this.search(), 350, true);
		input.addEventListener("input", () => {
			this.query = input.value;
			run();
		});
		input.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") this.search();
		});
		this.results = contentEl.createDiv({ cls: "stacks-modal-results" });
		this.hint("Type a title, an author or an ISBN.");
		window.setTimeout(() => input.focus(), 30);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private placeholder(): string {
		const kind = catalogKind(this.category);
		return kind === "book" ? "Title, author or ISBN…" : kind === "game" ? "Game title…" : "Title…";
	}

	private segmented(parent: HTMLElement, label: string, options: Array<{ value: string; label: string }>, get: () => string, set: (v: string) => void): void {
		const row = parent.createDiv({ cls: "stacks-modal-row" });
		row.createSpan({ cls: "stacks-modal-label", text: label });
		const seg = row.createDiv({ cls: "stacks-seg is-small" });
		const buttons: HTMLButtonElement[] = [];
		for (const o of options) {
			const b = seg.createEl("button", { cls: "stacks-seg-btn", text: o.label });
			b.toggleClass("is-active", o.value === get());
			b.addEventListener("click", () => {
				set(o.value);
				buttons.forEach((x, i) => x.toggleClass("is-active", options[i].value === o.value));
			});
			buttons.push(b);
		}
	}

	private hint(text: string): void {
		this.results?.empty();
		this.results?.createDiv({ cls: "stacks-modal-hint", text });
	}

	private async search(): Promise<void> {
		const q = this.query.trim();
		if (q.length < 2) return this.hint("Type a title, an author or an ISBN.");
		const mine = ++this.seq;
		this.hint("Searching…");
		try {
			const list = await searchCatalog(catalogKind(this.category), q);
			if (mine !== this.seq) return; // a newer search is running
			if (list.length === 0) this.hint("Nothing found. Try another spelling, the original title, or an ISBN, or create it as typed below.");
			else this.renderResults(list);
			this.renderManual(q);
		} catch (err) {
			if (mine === this.seq) this.hint(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	private renderResults(list: Candidate[]): void {
		const el = this.results;
		if (!el) return;
		el.empty();
		for (const c of list) {
			const card = el.createEl("button", { cls: "stacks-result" });
			const art = card.createDiv({ cls: "stacks-result-art" });
			if (c.covers[0]) {
				const img = art.createEl("img", { attr: { src: c.covers[0], alt: "", loading: "lazy" } });
				img.addEventListener("error", () => img.remove(), { once: true });
			}
			const text = card.createDiv({ cls: "stacks-result-text" });
			text.createDiv({ cls: "stacks-result-title", text: c.title });
			const meta = [c.creators.join(", "), c.year ? String(c.year) : "", c.note ?? ""].filter(Boolean).join(" · ");
			if (meta) text.createDiv({ cls: "stacks-result-meta", text: meta });
			text.createDiv({ cls: "stacks-result-source", text: SOURCE_LABELS[c.source] });
			card.addEventListener("click", () => void this.pick(c, card));
		}
	}

	/** Always offered last: create the note from what was typed, fill in the rest by hand. */
	private renderManual(title: string): void {
		const card = this.results?.createEl("button", { cls: "stacks-result is-manual" });
		if (!card) return;
		card.createDiv({ cls: "stacks-result-art" }).setText("+");
		const text = card.createDiv({ cls: "stacks-result-text" });
		text.createDiv({ cls: "stacks-result-title", text: `Create “${title}” without a match` });
		text.createDiv({ cls: "stacks-result-meta", text: "No catalogue has it? Make the note now, add the cover with Change cover… later." });
		card.addEventListener("click", () => void this.pick(manualCandidate(title), card));
	}

	private async pick(c: Candidate, card: HTMLElement): Promise<void> {
		if (this.busy) return;
		this.busy = true;
		card.addClass("is-busy");
		try {
			const full = await enrichCandidate(c);
			let cover: string | null = null;
			for (const url of full.covers) if (await checkImage(url)) { cover = url; break; }
			const config = this.config;
			const folder = config.newNotes[this.category]?.folder ?? config.folder;
			const taken = (name: string) => this.app.vault.getFileByPath(`${folder}/${name}.md`) !== null;
			const fileName = uniqueFileName(full.title, full.year, taken);
			const content = buildNewNote({ config, category: this.category, candidate: full, status: this.status, platform: this.platform || null, cover });
			const file = await this.host.actions.createNote(folder, fileName, content);
			if (file) this.close();
		} finally {
			this.busy = false;
			card.removeClass("is-busy");
		}
	}
}

export const SOURCE_LABELS: Record<Candidate["source"], string> = {
	manual: "Typed in",
	openlibrary: "Open Library",
	steam: "Steam",
	wikipedia: "Wikipedia",
	tvmaze: "TVmaze",
	kitsu: "Kitsu",
};
