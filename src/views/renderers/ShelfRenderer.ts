import { secondaryLine } from "../../logic/cardText.ts";
import { bindingHue, stableRange } from "../../logic/placeholder.ts";
import { orderForShelf, shelfSections, type ShelfItem, type ShelfSection } from "../../logic/shelf.ts";
import type { MediaTypeConfig } from "../../types/mediaConfig.ts";
import type { MediaNote } from "../../types/mediaNote.ts";
import { renderStage } from "../stage.ts";
import { acceptNoteDrops, emptyState, LibraryRenderer, makeDraggable, makeInteractive, renderBook } from "../shared.ts";

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
				this.standing(shelves, config, item.note);
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

	private standing(parent: HTMLElement, config: MediaTypeConfig, note: MediaNote): void {
		const slot = parent.createDiv({ cls: "stacks-slot" });
		slot.dataset.path = note.path;
		const book = renderBook(slot, this.host, config, note, "shelf");
		makeInteractive(book, this.host, config, note);
		makeDraggable(book, this.containerEl, note);
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

		const open = () => this.toggle(this.prefs.openPiles, key);
		el.addEventListener("click", open);
		el.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				open();
			}
		});
	}

	private spreadOut(parent: HTMLElement, config: MediaTypeConfig, pile: Pile, key: string): void {
		const start = parent.createDiv({ cls: "stacks-bookend is-start" });
		const plate = start.createDiv({
			cls: "stacks-bookend-plate",
			text: pile.series,
			attr: { role: "button", tabindex: "0", "aria-label": `Stack ${pile.series} back into a pile` },
		});
		const close = () => {
			if (this.searching) return;
			this.toggle(this.prefs.openPiles, key);
		};
		plate.addEventListener("click", close);
		plate.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				close();
			}
		});

		for (const n of pile.notes) this.standing(parent, config, n);
		parent.createDiv({ cls: "stacks-bookend is-end" }).createDiv({ cls: "stacks-bookend-plate" });
		// Keep the series readable on hover even when covers are unfamiliar.
		plate.setAttr("title", pile.notes.map((n) => `${n.title} (${secondaryLine(n, config)})`).join("\n"));
	}
}
