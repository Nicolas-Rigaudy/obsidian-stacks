import { secondaryLine } from "../../logic/cardText.ts";
import { bindingHue, stableRange } from "../../logic/placeholder.ts";
import { orderForShelf, shelfSections, type ShelfItem, type ShelfSection } from "../../logic/shelf.ts";
import type { MediaTypeConfig } from "../../types/mediaConfig.ts";
import type { MediaNote } from "../../types/mediaNote.ts";
import { renderStage } from "../stage.ts";
import { SeriesPanel } from "../seriesPanel.ts";
import { buyNext, seriesView } from "../../logic/series.ts";
import { QuickAddModal } from "../quickAdd.ts";
import { Menu, setIcon } from "obsidian";
import { acceptNoteDrops, emptyState, LibraryRenderer, makeDraggable, makeInteractive, noteMenu, renderBook, resolveCover } from "../shared.ts";

type Pile = Extract<ShelfItem, { kind: "pile" }>;

/** Spines drawn in a pile before it's summarized as "+N more". */
const PILE_SPINES = 6;

/**
 * The library, top to bottom: the reading desk (what's in progress, with page
 * controls), then one full-width bookcase per status: to read, read, and the
 * wishlist at the bottom. Each shows a couple of shelves, the rest behind a
 * pull handle. Books stand on wooden shelves.
 * A series with several volumes on the same shelf lies flat as a pile of
 * spines; clicking it stands the volumes up between bookends. Drag a book to
 * another bookcase to change its status; empty bookcases appear while dragging.
 */
export class ShelfRenderer extends LibraryRenderer {
	/** Which in-progress item each stage screen features. */
	private readonly featured = new Map<string, string>();

	/** Open piles and expanded bookcases are remembered per library (survive restarts). */
	private get prefs() {
		return this.host.prefs(this.options.libraryId);
	}

	private toggle(list: string[], key: string): void {
		const i = list.indexOf(key);
		if (i === -1) list.push(key);
		else list.splice(i, 1);
		this.host.savePrefs();
		this.refresh();
	}

	protected render(el: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void {
		el.addClass("is-shelf");
		const sections = shelfSections(notes, config, this.options.statuses, !this.searching, this.prefs.sort);
		if (this.searching && sections.every((s) => s.count === 0)) {
			emptyState(el, `Nothing matches “${this.options.search}”.`);
			return;
		}
		if (sections.every((s) => s.count === 0) && !sections.some((s) => s.status?.bucket === "active")) {
			emptyState(el, `No ${config.label.toLowerCase() || "items"} here yet.`);
			return;
		}

		const room = el.createDiv({ cls: "stacks-library" });
		// What's in progress sits on the stage at the top: the reading desk, the
		// game devices or the TV, depending on the library's look.
		if (sections.some((s) => s.status?.bucket === "active")) {
			renderStage(room, this.host, config, notes, {
				libraryId: this.options.libraryId,
				root: this.containerEl,
				droppable: true,
				featured: this.featured,
				refresh: () => this.refresh(),
			});
		}
		if (!this.searching) this.buyNextShelf(room, config, notes);
		for (const section of orderForShelf(sections)) {
			if (section.status?.bucket === "active") continue;
			this.bookcase(room, config, section);
		}
	}

	private bookcase(room: HTMLElement, config: MediaTypeConfig, section: ShelfSection): void {
		const key = section.status?.value ?? "";
		const bookcase = room.createDiv({ cls: "stacks-bookcase" });
		bookcase.toggleClass("is-empty", section.count === 0);
		if (section.status) bookcase.dataset.bucket = section.status.bucket;
		const plaque = bookcase.createDiv({ cls: "stacks-plaque" });
		plaque.createSpan({ cls: "stacks-plaque-label", text: section.status ? section.status.label || section.status.value : "Unsorted" });
		plaque.createSpan({ cls: "stacks-plaque-count", text: String(section.count) });

		const shelves = bookcase.createDiv({ cls: "stacks-shelves" });
		const status = section.status;
		if (status) {
			if (section.count === 0) shelves.createDiv({ cls: "stacks-shelf-note", text: `Drop a book here to move it to ${status.label || status.value}` });
			acceptNoteDrops(bookcase, (path) => this.moveTo(path, config, status.value, shelves));
		}
		for (const item of section.items) {
			if (item.kind === "book") {
				const slot = this.standing(shelves, config, item.note);
				// A lone volume of a series (often the next one, on the wishlist): say which series.
				if ((item.note.series?.position ?? 0) > 1) seriesTag(slot, item.note);
				continue;
			}
			const pileKey = `${key}\u0000${item.series}`;
			// While searching, piles stand open so the matching volumes show.
			if (this.searching || this.prefs.openPiles.includes(pileKey)) this.spreadOut(shelves, config, item, pileKey);
			else this.pile(shelves, item, pileKey);
		}

		// A bookcase shows a couple of shelves; the rest behind a pull handle.
		const expanded = this.searching || this.prefs.openCases.includes(key);
		shelves.toggleClass("is-limited", !expanded);
		const handle = bookcase.createEl("button", { cls: "stacks-button is-primary stacks-bookcase-more" });
		handle.hide();
		handle.addEventListener("click", () => this.toggle(this.prefs.openCases, key));
		window.requestAnimationFrame(() => {
			if (this.searching) return; // everything is shown while searching
			if (expanded || shelves.scrollHeight > shelves.clientHeight + 2) {
				handle.setText(expanded ? "Show fewer ▴" : `Show all ${section.count} ▾`);
				handle.show();
			}
		});
	}

	/** Starred items, then the next volume of series you own part of. Hidden when empty. */
	private buyNextShelf(room: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void {
		const items = buyNext(notes, config);
		if (items.length === 0) return;
		const bookcase = room.createDiv({ cls: "stacks-bookcase is-single is-buynext" });
		const plaque = bookcase.createDiv({ cls: "stacks-plaque" });
		plaque.createSpan({ cls: "stacks-plaque-label", text: "Buy next" });
		plaque.createSpan({ cls: "stacks-plaque-count", text: String(items.length) });
		const shelves = bookcase.createDiv({ cls: "stacks-shelves" });
		for (const { note, reason } of items) {
			const slot = shelves.createDiv({ cls: "stacks-slot" });
			slot.dataset.path = note.path;
			const book = renderBook(slot, this.host, config, note, "shelf");
			makeInteractive(book, this.host, config, note);
			makeDraggable(book, this.containerEl, note);
			if (reason === "starred") slot.createDiv({ cls: "stacks-buy-tag is-starred", text: "★" });
			else if (note.series) seriesTag(slot, note);
		}
		this.pullHandle(bookcase, shelves, "\u0000buy-next", items.length, 1);
	}

	/** The brass handle under a bookcase: shows the rest when it holds more than `rows` shelves. */
	private pullHandle(bookcase: HTMLElement, shelves: HTMLElement, key: string, count: number, rows: number): void {
		const expanded = this.prefs.openCases.includes(key);
		shelves.toggleClass("is-limited", !expanded);
		if (!expanded) shelves.style.setProperty("max-height", `calc(var(--stacks-row) * ${rows})`);
		const handle = bookcase.createEl("button", { cls: "stacks-button is-primary stacks-bookcase-more" });
		handle.hide();
		handle.addEventListener("click", () => this.toggle(this.prefs.openCases, key));
		window.requestAnimationFrame(() => {
			if (expanded || shelves.scrollHeight > shelves.clientHeight + 2) {
				handle.setText(expanded ? "Show fewer ▴" : `Show all ${count} ▾`);
				handle.show();
			}
		});
	}

	private standing(parent: HTMLElement, config: MediaTypeConfig, note: MediaNote): HTMLElement {
		const slot = parent.createDiv({ cls: "stacks-slot" });
		slot.dataset.path = note.path;
		const book = renderBook(slot, this.host, config, note, "shelf");
		makeInteractive(book, this.host, config, note);
		makeDraggable(book, this.containerEl, note);
		return slot;
	}

	private moveTo(path: string, config: MediaTypeConfig, status: string, shelves: HTMLElement): void {
		const note = this.host.index.get(this.options.libraryId).find((n) => n.path === path);
		if (!note || note.status === status) return;
		// Put the book on its new shelf now; the index rebuild re-renders it in place (and re-piles series).
		const slot = this.containerEl.querySelector<HTMLElement>(`.stacks-slot[data-path="${CSS.escape(path)}"]`);
		if (slot) {
			shelves.querySelector(".stacks-shelf-note")?.remove();
			shelves.append(slot);
		}
		void this.host.actions.changeStatus(path, config, status);
	}

	private pile(parent: HTMLElement, pile: Pile, key: string): void {
		const slot = parent.createDiv({ cls: "stacks-slot is-pile" });
		const el = slot.createDiv({
			cls: "stacks-pile",
			attr: {
				role: "button",
				tabindex: "0",
				"aria-label": `${pile.series}: ${pile.notes.length} volumes. Click to stand them up.`,
			},
		});
		el.createDiv({ cls: "stacks-pile-tag", text: `${pile.series} · ${pile.notes.length}` });

		const hidden = pile.notes.length > PILE_SPINES ? pile.notes.length - (PILE_SPINES - 1) : 0;
		const shown = hidden > 0 ? pile.notes.slice(0, PILE_SPINES - 1) : pile.notes;
		for (const n of shown) {
			const spine = el.createDiv({ cls: "stacks-spine" });
			spine.style.setProperty("--stacks-hue", String(bindingHue(`${pile.series}:${n.title}`)));
			spine.style.setProperty("--stacks-wp", String(stableRange(n.title, 88, 100)));
			spine.style.setProperty("--stacks-dx", `${stableRange(`${n.title}:dx`, -6, 6)}px`);
			if (n.series?.position !== null && n.series?.position !== undefined) {
				spine.createSpan({ cls: "stacks-spine-num", text: String(n.series.position) });
			}
			spine.createSpan({ cls: "stacks-spine-title", text: n.title });
		}
		if (hidden > 0) {
			const more = el.createDiv({ cls: "stacks-spine is-more", text: `+${hidden} more` });
			more.style.setProperty("--stacks-hue", String(bindingHue(pile.series)));
			more.style.setProperty("--stacks-wp", "96");
		}

		// A pile stands up on the shelf; the full list is in the right-click menu.
		const open = () => this.toggle(this.prefs.openPiles, key);
		el.addEventListener("click", open);
		el.addEventListener("contextmenu", (evt) => {
			evt.preventDefault();
			this.seriesMenu(pile.series, key, false).showAtMouseEvent(evt);
		});
		el.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				open();
			}
		});
	}

	/**
	 * A series stood up on the shelf: the left bookend is its nameplate (name,
	 * "3/10 read", in-order switch; click the name to stack it again), the
	 * volumes in order, ghost books for volumes not in the library, and a ghost
	 * "next volume" at the end of the run.
	 */
	private spreadOut(parent: HTMLElement, config: MediaTypeConfig, pile: Pile, key: string): void {
		const view = seriesView(this.host.index.get(this.options.libraryId), config, pile.series);
		const start = parent.createDiv({ cls: "stacks-bookend is-start" });
		const plate = start.createDiv({ cls: "stacks-series-plate" });
		plate.addEventListener("contextmenu", (evt) => {
			evt.preventDefault();
			this.seriesMenu(pile.series, key, true).showAtMouseEvent(evt);
		});

		if (config.series) {
			const verb = config.appearance === "games" ? "Played" : config.appearance === "films" ? "Watched" : "Read";
			const order = plate.createEl("button", {
				cls: `stacks-series-order${view.ordered ? " is-ordered" : ""}`,
				attr: { "aria-label": view.ordered ? `${verb} in order (click: any order)` : `Any order (click: ${verb.toLowerCase()} in order)` },
			});
			setIcon(order, view.ordered ? "list-ordered" : "shuffle");
			order.addEventListener("click", (evt) => {
				evt.stopPropagation();
				void this.setOrdered(pile.series, !view.ordered);
			});
		}
		const name = plate.createDiv({
			cls: "stacks-series-name",
			text: pile.series,
			attr: { role: "button", tabindex: "0", "aria-label": `Stack ${pile.series} back into a pile` },
		});
		const doneLabel = config.statuses.find((x) => x.bucket === "done")?.label.toLowerCase() ?? "done";
		plate.createDiv({ cls: "stacks-series-count", text: `${view.counts.read}/${view.volumes.length} ${doneLabel}` });
		const close = () => {
			if (this.searching) return;
			this.toggle(this.prefs.openPiles, key);
		};
		name.addEventListener("click", close);
		name.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				close();
			}
		});
		name.setAttr("title", pile.notes.map((n) => `${n.title} (${secondaryLine(n, config)})`).join("\n"));

		// Volumes in order. Positions this pile doesn't hold stand in as ghosts:
		// a faded outline of the note that has it (on another bookcase), or an empty one.
		const byPosition = new Map<number, MediaNote>();
		for (const v of view.volumes) {
			const p = v.series?.position;
			if (p === null || p === undefined) continue;
			for (let i = p; i <= (v.series?.positionEnd ?? p); i++) if (!byPosition.has(i)) byPosition.set(i, v);
		}
		const here = new Set(pile.notes.map((n) => n.path));
		const shown = new Set<string>();
		const ghostAt = (g: number, next: boolean) => {
			const other = byPosition.get(g);
			if (other && here.has(other.path)) return;
			if (other && shown.has(other.path)) return;
			if (other) shown.add(other.path);
			this.ghost(parent, config, pile, g, next, other ?? null);
		};
		let prev: number | null = null;
		for (const n of pile.notes) {
			const p = n.series?.position ?? null;
			if (p !== null && prev !== null && Number.isInteger(p) && Number.isInteger(prev)) {
				for (let g = prev + 1; g < p; g++) ghostAt(g, false);
			}
			this.standing(parent, config, n);
			if (p !== null) prev = n.series?.positionEnd ?? p;
		}
		// The volume after the run always gets an outline, when the series is ordered.
		if (!this.searching && prev !== null && Number.isInteger(prev) && view.ordered) ghostAt(prev + 1, true);
		parent.createDiv({ cls: "stacks-bookend is-end" }).createDiv({ cls: "stacks-bookend-plate" });
	}

	/**
	 * A ghost book. `other`: the note holding that volume on another bookcase,
	 * drawn as a faded outline of its cover (click opens it). Otherwise an empty
	 * outline, "missing" or "+ next" (click adds it, series and number prefilled).
	 */
	private ghost(parent: HTMLElement, config: MediaTypeConfig, pile: Pile, position: number, next: boolean, other: MediaNote | null): void {
		const slot = parent.createDiv({ cls: "stacks-slot" });
		const status = other ? (config.statuses.find((x) => x.value === other.status)?.label ?? other.status ?? "") : "";
		const ghost = slot.createEl("button", {
			cls: `stacks-ghost-book${next ? " is-next" : ""}${other ? " is-elsewhere" : ""}`,
			attr: { "aria-label": other ? `${other.title} (${status})` : `${next ? "Add the next volume" : "Not in the library"}: ${pile.series} #${position}` },
		});
		const src = other ? resolveCover(this.host.app, other) : null;
		if (src) ghost.createEl("img", { cls: "stacks-ghost-cover", attr: { src, alt: "", loading: "lazy" } });
		ghost.createDiv({ cls: "stacks-ghost-num", text: `#${position}` });
		ghost.createDiv({ cls: "stacks-ghost-label", text: other ? status : next ? "+ next" : "missing" });
		if (other) {
			ghost.addEventListener("click", () => void this.host.app.workspace.openLinkText(other.path, "", false));
			ghost.addEventListener("contextmenu", (evt) => {
				evt.preventDefault();
				evt.stopPropagation();
				noteMenu(this.host, config, other).showAtMouseEvent(evt);
			});
			return;
		}
		ghost.addEventListener("click", () => {
			const sample = pile.notes[0];
			const modal = new QuickAddModal(this.host.app, this.host, this.options.libraryId, sample?.category ?? undefined);
			modal.presetSeries(pile.series, position);
			if (config.appearance === "games" && sample?.facet) modal.presetPlatform(sample.facet);
			modal.open();
		});
	}

	private seriesMenu(series: string, key: string, open: boolean): Menu {
		const menu = new Menu();
		menu.addItem((i) => i.setTitle(open ? "Stack into a pile" : "Stand up on the shelf").setIcon(open ? "layers" : "book-open").onClick(() => this.toggle(this.prefs.openPiles, key)));
		menu.addItem((i) => i.setTitle("Series overview…").setIcon("list").onClick(() => new SeriesPanel(this.host.app, this.host, this.options.libraryId, series, null).open()));
		return menu;
	}

	private async setOrdered(series: string, ordered: boolean): Promise<void> {
		const s = this.host.settings.mediaTypes[this.options.libraryId]?.series;
		if (!s) return;
		s.exceptions = s.exceptions.filter((x) => x !== series);
		if (ordered !== s.orderedByDefault) s.exceptions.push(series);
		await this.host.saveSettings();
	}

}

/** A brass tag under a book: its series and volume number. */
function seriesTag(slot: HTMLElement, note: MediaNote): void {
	const s = note.series;
	if (!s) return;
	const num = s.position === null ? "" : `#${s.position}${s.positionEnd && s.positionEnd !== s.position ? `–${s.positionEnd}` : ""}`;
	const tag = slot.createDiv({ cls: "stacks-buy-tag is-series", attr: { title: `${s.name} ${num}`.trim() } });
	tag.createSpan({ cls: "stacks-series-tag-name", text: s.name });
	if (num) tag.createSpan({ cls: "stacks-series-tag-num", text: num });
}
