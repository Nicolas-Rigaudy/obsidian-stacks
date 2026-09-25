import { progressFraction, secondaryLine } from "../../logic/cardText.ts";
import { comparatorFor } from "../../logic/shelf.ts";
import { bucketOf } from "../../logic/upNext.ts";
import type { MediaTypeConfig, StatusDef } from "../../types/mediaConfig.ts";
import type { MediaNote } from "../../types/mediaNote.ts";
import { acceptNoteDrops, LibraryRenderer, makeDraggable, makeInteractive, renderBook } from "../shared.ts";

/**
 * Card-catalogue board: one drawer per status, one index card per note.
 * Drag a card to another drawer (or right-click → Move to) to change status.
 */
export class BoardRenderer extends LibraryRenderer {
	private readonly scrollTops = new Map<string, number>();

	protected captureState(): void {
		this.containerEl.querySelectorAll<HTMLElement>(".stacks-drawer-cards").forEach((el) => {
			if (el.dataset.status !== undefined) this.scrollTops.set(el.dataset.status, el.scrollTop);
		});
	}

	protected restoreState(): void {
		this.containerEl.querySelectorAll<HTMLElement>(".stacks-drawer-cards").forEach((el) => {
			const top = el.dataset.status !== undefined ? this.scrollTops.get(el.dataset.status) : undefined;
			if (top !== undefined) el.scrollTop = top;
		});
	}

	protected render(el: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void {
		el.addClass("is-board");
		const board = el.createDiv({ cls: "stacks-board" });
		const only = this.options.statuses;
		const columns = only ? config.statuses.filter((s) => only.includes(s.value)) : config.statuses;
		for (const status of columns) {
			this.drawer(board, config, status, notes.filter((n) => n.status === status.value));
		}
		if (!only) {
			const known = new Set(config.statuses.map((s) => s.value));
			const unsorted = notes.filter((n) => n.status === null || !known.has(n.status));
			if (unsorted.length > 0) this.drawer(board, config, null, unsorted);
		}
	}

	private drawer(board: HTMLElement, config: MediaTypeConfig, status: StatusDef | null, notes: MediaNote[]): void {
		const drawer = board.createDiv({ cls: "stacks-drawer" });
		if (status) drawer.dataset.bucket = status.bucket;
		const head = drawer.createDiv({ cls: "stacks-drawer-head" });
		const label = head.createDiv({ cls: "stacks-drawer-label" });
		label.createSpan({ text: status ? status.label || status.value : "Unsorted" });
		label.createSpan({ cls: "stacks-drawer-count", text: String(notes.length) });

		const cards = drawer.createDiv({ cls: "stacks-drawer-cards" });
		cards.dataset.status = status?.value ?? "";
		for (const n of [...notes].sort(comparatorFor(this.host.prefs(this.options.libraryId).sort, config))) this.card(cards, config, n);
		if (notes.length === 0) cards.createDiv({ cls: "stacks-drawer-empty", text: status ? "Drop a card here" : "" });

		if (status) this.acceptDrops(drawer, cards, config, status);
	}

	private card(parent: HTMLElement, config: MediaTypeConfig, note: MediaNote): void {
		const card = parent.createDiv({ cls: "stacks-card" });
		card.dataset.path = note.path;
		renderBook(card, this.host, config, note, "thumb");
		const text = card.createDiv({ cls: "stacks-card-text" });
		text.createDiv({ cls: "stacks-card-title", text: note.title });
		const sub = secondaryLine(note, config);
		if (sub) text.createDiv({ cls: "stacks-card-sub", text: sub });
		const f = progressFraction(note);
		if (f !== null && bucketOf(note.status, config) === "active") {
			text.createDiv({ cls: "stacks-meter" }).createSpan().style.setProperty("width", `${Math.round(f * 100)}%`);
		}
		makeInteractive(card, this.host, config, note);
		makeDraggable(card, this.containerEl, note);
	}

	private acceptDrops(drawer: HTMLElement, cards: HTMLElement, config: MediaTypeConfig, status: StatusDef): void {
		acceptNoteDrops(drawer, (path) => {
			const note = this.host.index.get(this.options.libraryId).find((n) => n.path === path);
			if (!note || note.status === status.value) return;
			// Move the card now; the index rebuild re-renders it in its sorted place.
			const card = this.containerEl.querySelector<HTMLElement>(`.stacks-card[data-path="${CSS.escape(path)}"]`);
			if (card) {
				cards.querySelector(".stacks-drawer-empty")?.remove();
				cards.prepend(card);
			}
			void this.host.actions.changeStatus(path, config, status.value);
		});
	}
}
