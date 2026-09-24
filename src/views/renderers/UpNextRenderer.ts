import { progressFraction, secondaryLine } from "../../logic/cardText.ts";
import { compareShelfOrder } from "../../logic/shelf.ts";
import { bucketOf, firstStatusOf, rankCandidates } from "../../logic/upNext.ts";
import type { MediaTypeConfig } from "../../types/mediaConfig.ts";
import type { MediaNote } from "../../types/mediaNote.ts";
import { emptyState, LibraryRenderer, makeInteractive, renderBook } from "../shared.ts";

const UP_NEXT_SHOWN = 6;

/**
 * The reading desk: what's in progress (with page controls) and the up-next
 * shelf. Port of Reading.md's "Reading now" and "Up next" widgets.
 */
export class UpNextRenderer extends LibraryRenderer {
	protected render(el: HTMLElement, config: MediaTypeConfig, _filtered: readonly MediaNote[]): void {
		el.addClass("is-upnext");
		// Up next always looks at the whole library: eligibility depends on every volume.
		const notes = this.host.index.get(this.options.libraryId);
		const page = el.createDiv({ cls: "stacks-upnext" });
		this.desk(page, config, notes);
		this.nextShelf(page, config, notes);
	}

	private desk(page: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void {
		const active = notes.filter((n) => bucketOf(n.status, config) === "active").sort(compareShelfOrder);
		const activeStatus = config.statuses.find((s) => s.bucket === "active");
		const section = page.createDiv({ cls: "stacks-section" });
		const h = section.createDiv({ cls: "stacks-heading" });
		h.createSpan({ text: `${activeStatus?.label ?? "In progress"} now` });
		if (active.length > 0) h.createSpan({ cls: "stacks-heading-count", text: String(active.length) });

		if (active.length === 0) {
			emptyState(section, "Nothing in progress. Start one from up next.");
			return;
		}
		const desk = section.createDiv({ cls: "stacks-desk" });
		for (const n of active) this.deskItem(desk, config, n);
	}

	private deskItem(desk: HTMLElement, config: MediaTypeConfig, note: MediaNote): void {
		const item = desk.createDiv({ cls: "stacks-desk-item" });
		makeInteractive(renderBook(item, this.host, config, note, "desk"), this.host, config, note);

		const info = item.createDiv({ cls: "stacks-desk-info" });
		const title = info.createDiv({ cls: "stacks-desk-title", text: note.title });
		makeInteractive(title, this.host, config, note);
		const sub = secondaryLine(note, config);
		if (sub) info.createDiv({ cls: "stacks-desk-sub", text: sub });

		const p = config.progress;
		if (p && note.progress) {
			const unit = p.unitLabel;
			const row = info.createDiv({ cls: "stacks-progress-row" });
			const input = row.createEl("input", {
				cls: "stacks-page-input",
				attr: { type: "number", min: "0", inputmode: "numeric", "aria-label": `Current ${unit || "progress"}` },
			});
			input.value = String(note.progress.current);
			const total = note.progress.total;
			row.createSpan({ cls: "stacks-progress-of", text: total !== null ? `of ${total}${unit ? ` ${unit}` : ""}` : unit });
			const pct = row.createSpan({ cls: "stacks-progress-pct" });
			const bar = info.createDiv({ cls: "stacks-meter is-large" }).createSpan();

			const show = (value: number) => {
				input.value = String(value);
				const f = progressFraction({ ...note, progress: { current: value, total } });
				pct.setText(f !== null ? `${Math.round(f * 100)}%` : "");
				bar.style.setProperty("width", f !== null ? `${Math.round(f * 100)}%` : "0%");
			};
			show(note.progress.current);

			input.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter") input.blur();
			});
			input.addEventListener("change", () => {
				const v = Number(input.value);
				if (!Number.isFinite(v)) return show(note.progress?.current ?? 0);
				void this.host.actions.correct(note.path, config, Math.round(v)).then((r) => r !== null && show(r));
			});

			const actions = info.createDiv({ cls: "stacks-actions" });
			const incs = p.quickIncrements.filter((n) => n > 0);
			const buttons = incs.length > 0 ? [-incs[0], ...incs] : [];
			for (const delta of buttons) {
				const b = actions.createEl("button", { cls: "stacks-btn", text: `${delta > 0 ? "+" : "−"}${Math.abs(delta)}` });
				b.setAttr("aria-label", `${delta > 0 ? "Add" : "Remove"} ${Math.abs(delta)} ${unit}`);
				// No disabling: the per-note queue applies every click in order.
				b.addEventListener("click", () => {
					void this.host.actions.bump(note.path, config, delta).then((r) => r !== null && show(r));
				});
			}
			this.finishButton(actions, config, note);
		} else {
			this.finishButton(info.createDiv({ cls: "stacks-actions" }), config, note);
		}
	}

	private finishButton(parent: HTMLElement, config: MediaTypeConfig, note: MediaNote): void {
		const done = config.statuses.find((s) => s.bucket === "done");
		if (!done) return;
		const b = parent.createEl("button", { cls: "stacks-btn is-primary", text: `Mark ${(done.label || done.value).toLowerCase()}` });
		b.addEventListener("click", () => void this.host.actions.finish(note.path, config));
	}

	private nextShelf(page: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void {
		const { eligible, heldBack } = rankCandidates(notes, config);
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
			const start = slot.createEl("button", { cls: "stacks-btn is-primary stacks-start", text: "Start" });
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
