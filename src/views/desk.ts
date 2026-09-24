// The reading desk: notes in progress, with page controls. Shared by the Shelf
// (top of the library) and Up next.

import { progressFraction, secondaryLine } from "../logic/cardText.ts";
import { compareShelfOrder } from "../logic/shelf.ts";
import { bucketOf, firstStatusOf } from "../logic/upNext.ts";
import { toStr } from "../logic/values.ts";
import { renderSessionControls } from "./stage.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { acceptNoteDrops, makeDraggable, makeInteractive, renderBook, type StacksHost } from "./shared.ts";

export interface DeskOptions {
	libraryId: string;
	/** Renderer root, for drag state. */
	root: HTMLElement;
	/** Shown when nothing is in progress. */
	emptyText: string;
	/** Accept dropped notes and start them. */
	droppable: boolean;
}

/** Renders nothing if the library has no active status. */
export function renderDesk(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, notes: readonly MediaNote[], opts: DeskOptions): void {
	const activeStatus = config.statuses.find((s) => s.bucket === "active");
	if (!activeStatus) return;
	const active = notes.filter((n) => bucketOf(n.status, config) === "active").sort(compareShelfOrder);

	const section = parent.createDiv({ cls: "stacks-section stacks-desk-section" });
	const h = section.createDiv({ cls: "stacks-heading" });
	h.createSpan({ text: `${activeStatus.label || activeStatus.value} now` });
	if (active.length > 0) h.createSpan({ cls: "stacks-heading-count", text: String(active.length) });

	const desk = section.createDiv({ cls: "stacks-desk" });
	if (active.length === 0) desk.createDiv({ cls: "stacks-desk-empty", text: opts.emptyText });
	for (const n of active) deskItem(desk, host, config, n, opts.root);

	if (opts.droppable) {
		const start = firstStatusOf(config, "active");
		acceptNoteDrops(section, (path) => {
			const note = host.index.get(opts.libraryId).find((n) => n.path === path);
			if (start && note && bucketOf(note.status, config) !== "active") void host.actions.changeStatus(path, config, start);
		});
	}
}

function deskItem(desk: HTMLElement, host: StacksHost, config: MediaTypeConfig, note: MediaNote, root: HTMLElement): void {
	const item = desk.createDiv({ cls: "stacks-desk-item" });
	item.dataset.path = note.path;
	const book = renderBook(item.createDiv({ cls: "stacks-desk-book" }), host, config, note, "desk");
	makeInteractive(book, host, config, note);
	makeDraggable(book, root, note);

	const side = item.createDiv({ cls: "stacks-desk-info" });
	// The reading card: a paper card propped against the book.
	const card = side.createDiv({ cls: "stacks-reading-card" });
	const title = card.createDiv({ cls: "stacks-desk-title", text: note.title });
	makeInteractive(title, host, config, note);
	const sub = secondaryLine(note, config);
	if (sub) card.createDiv({ cls: "stacks-desk-sub", text: sub });
	const started = config.startedField ? toStr(note.frontmatter[config.startedField]) : null;
	if (started) card.createDiv({ cls: "stacks-desk-started", text: `Started ${formatDay(started)}` });

	const controls = side.createDiv({ cls: "stacks-desk-controls" });
	const p = config.progress;
	if (p && note.progress) {
		const unit = p.unitLabel;
		const row = card.createDiv({ cls: "stacks-progress-row" });
		const input = row.createEl("input", {
			cls: "stacks-page-input",
			attr: { type: "number", min: "0", inputmode: "numeric", "aria-label": `Current ${unit || "progress"}` },
		});
		const total = note.progress.total;
		row.createSpan({ cls: "stacks-progress-of", text: total !== null ? `of ${total}${unit ? ` ${unit}` : ""}` : unit });
		const pct = row.createSpan({ cls: "stacks-progress-pct" });
		const ribbon = card.createDiv({ cls: "stacks-ribbon-track" }).createDiv({ cls: "stacks-ribbon" });

		const show = (value: number, pulse = false) => {
			input.value = String(value);
			const f = progressFraction({ ...note, progress: { current: value, total } });
			pct.setText(f !== null ? `${Math.round(f * 100)}%` : "");
			ribbon.style.setProperty("width", f !== null ? `${Math.max(2, Math.round(f * 100))}%` : "2%");
			if (pulse) {
				input.removeClass("is-bumped");
				void input.offsetWidth; // restart the animation
				input.addClass("is-bumped");
			}
		};
		show(note.progress.current);

		input.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") input.blur();
		});
		input.addEventListener("change", () => {
			const v = Number(input.value);
			if (!Number.isFinite(v)) return show(note.progress?.current ?? 0);
			void host.actions.correct(note.path, config, Math.round(v)).then((r) => r !== null && show(r, true));
		});

		// Leather page tabs: back one step, then each quick increment.
		const tabs = controls.createDiv({ cls: "stacks-page-tabs" });
		const incs = p.quickIncrements.filter((n) => n > 0);
		for (const delta of incs.length > 0 ? [-incs[0], ...incs] : []) {
			const b = tabs.createEl("button", { cls: `stacks-page-tab${delta < 0 ? " is-back" : ""}`, text: `${delta > 0 ? "+" : "−"}${Math.abs(delta)}` });
			b.setAttr("aria-label", `${delta > 0 ? "Add" : "Remove"} ${Math.abs(delta)} ${unit}`);
			// No disabling: the per-note queue applies every click in order.
			b.addEventListener("click", () => {
				void host.actions.bump(note.path, config, delta).then((r) => r !== null && show(r, true));
			});
		}
	}

	const done = config.statuses.find((s) => s.bucket === "done");
	if (done) {
		const label = done.label || done.value;
		const seal = controls.createEl("button", { cls: "stacks-seal", attr: { "aria-label": `Mark ${label.toLowerCase()}` } });
		seal.createSpan({ cls: "stacks-seal-mark", text: "✓" });
		seal.createSpan({ cls: "stacks-seal-label", text: label });
		seal.addEventListener("click", () => {
			seal.addClass("is-pressed");
			void host.actions.finish(note.path, config);
		});
	}
	renderSessionControls(controls, host, config, note, false);
}

/** "2026-09-24" → "24 Sep 2026" in the reader's locale; anything else as written. */
function formatDay(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return iso;
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
