import { firstStatusOf, rankCandidates } from "../../logic/upNext.ts";
import type { MediaTypeConfig } from "../../types/mediaConfig.ts";
import type { MediaNote } from "../../types/mediaNote.ts";
import { renderStage } from "../stage.ts";
import { inCategory, LibraryRenderer, makeInteractive, renderBook } from "../shared.ts";

const UP_NEXT_SHOWN = 6;

/**
 * The reading desk: what's in progress (with page controls) and the up-next
 * shelf. Port of Reading.md's "Reading now" and "Up next" widgets.
 */
export class UpNextRenderer extends LibraryRenderer {
	private readonly featured = new Map<string, string>();

	protected render(el: HTMLElement, config: MediaTypeConfig, _filtered: readonly MediaNote[]): void {
		el.addClass("is-upnext");
		// Up next always looks at the whole library: eligibility depends on every volume.
		const notes = this.host.index.get(this.options.libraryId);
		const page = el.createDiv({ cls: "stacks-upnext" });
		renderStage(page, this.host, config, inCategory(notes, this.options.category), {
			libraryId: this.options.libraryId,
			root: this.containerEl,
			droppable: false,
			featured: this.featured,
			refresh: () => this.refresh(),
		});
		this.nextShelf(page, config, notes);
	}

	private nextShelf(page: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void {
		const ranked = rankCandidates(notes, config);
		const eligible = inCategory(ranked.eligible, this.options.category);
		const heldBack = inCategory(ranked.heldBack, this.options.category);
		const section = page.createDiv({ cls: "stacks-section" });
		const bookcase = section.createDiv({ cls: "stacks-bookcase is-single" });
		const plaque = bookcase.createDiv({ cls: "stacks-plaque" });
		plaque.createSpan({ cls: "stacks-plaque-label", text: "Up next" });
		if (eligible.length > 0) plaque.createSpan({ cls: "stacks-plaque-count", text: String(eligible.length) });
		const shelves = bookcase.createDiv({ cls: "stacks-shelves" });

		if (eligible.length === 0) {
			shelves.createDiv({ cls: "stacks-shelf-note", text: "Backlog empty." });
		}
		const startLabel = config.statuses.find((s) => s.value === firstStatusOf(config, "active"))?.label ?? "Start";
		eligible.slice(0, UP_NEXT_SHOWN).forEach((n, i) => {
			const slot = shelves.createDiv({ cls: "stacks-slot" });
			slot.createDiv({ cls: "stacks-rank", text: String(i + 1) });
			makeInteractive(renderBook(slot, this.host, config, n, "shelf"), this.host, config, n);
			const start = slot.createEl("button", { cls: "stacks-button is-primary stacks-start", text: "Start" });
			start.setAttr("aria-label", `${startLabel}: ${n.title}`);
			start.addEventListener("click", (evt) => {
				evt.stopPropagation();
				void this.host.actions.start(n.path, config);
			});
		});

		const notesEl = section.createDiv({ cls: "stacks-footnote" });
		if (eligible.length > UP_NEXT_SHOWN) notesEl.createDiv({ text: `…and ${eligible.length - UP_NEXT_SHOWN} more in the backlog.` });
		if (heldBack.length > 0) {
			notesEl.createDiv({
				text: `${heldBack.length} held back until an earlier volume is started: ${heldBack.map((n) => n.title).join(", ")}.`,
			});
		}
	}
}
