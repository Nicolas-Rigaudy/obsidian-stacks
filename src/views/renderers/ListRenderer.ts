import { creatorOf, seriesLabel } from "../../logic/cardText.ts";
import { sortNotes, type ListColumn, type SortDir } from "../../logic/listSort.ts";
import { toStr } from "../../logic/values.ts";
import type { MediaTypeConfig } from "../../types/mediaConfig.ts";
import type { MediaNote } from "../../types/mediaNote.ts";
import { emptyState, LibraryRenderer, makeInteractive, noteMenu, renderBook } from "../shared.ts";

interface Column {
	id: ListColumn;
	label: string;
	cell: (td: HTMLTableCellElement, n: MediaNote) => void;
}

/** The catalogue ledger: every note in a sortable table. Status is editable in place. */
export class ListRenderer extends LibraryRenderer {
	private column: ListColumn = "title";
	private dir: SortDir = "asc";

	protected render(el: HTMLElement, config: MediaTypeConfig, notes: readonly MediaNote[]): void {
		el.addClass("is-list");
		if (notes.length === 0) {
			emptyState(el, `No ${config.label.toLowerCase() || "items"} here yet.`);
			return;
		}
		const sheet = el.createDiv({ cls: "stacks-ledger-wrap" }).createDiv({ cls: "stacks-ledger-sheet" });
		const head = sheet.createDiv({ cls: "stacks-ledger-head" });
		head.createSpan({ cls: "stacks-ledger-title", text: `${config.label} catalogue` });
		head.createSpan({ cls: "stacks-ledger-count", text: `${notes.length} ${notes.length === 1 ? "entry" : "entries"}` });

		const columns = this.columns(config);
		const scroller = sheet.createDiv({ cls: "stacks-ledger-scroll" });
		const table = scroller.createEl("table", { cls: "stacks-ledger" });
		const tr = table.createEl("thead").createEl("tr");
		tr.createEl("th", { cls: "is-cover" });
		for (const c of columns) {
			const th = tr.createEl("th", { text: c.label, attr: { tabindex: "0", "aria-sort": this.column === c.id ? (this.dir === "asc" ? "ascending" : "descending") : "none" } });
			if (this.column === c.id) {
				th.addClass("is-sorted");
				th.createSpan({ cls: "stacks-sort-arrow", text: this.dir === "asc" ? " ▲" : " ▼" });
			}
			const sort = () => {
				if (this.column === c.id) this.dir = this.dir === "asc" ? "desc" : "asc";
				else {
					this.column = c.id;
					this.dir = c.id === "rating" || c.id === "finished" || c.id === "progress" ? "desc" : "asc";
				}
				this.refresh();
			};
			th.addEventListener("click", sort);
			th.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter") sort();
			});
		}

		const body = table.createEl("tbody");
		for (const n of sortNotes(notes, config, this.column, this.dir)) {
			const row = body.createEl("tr");
			row.addEventListener("contextmenu", (evt) => {
				evt.preventDefault();
				noteMenu(this.host, config, n).showAtMouseEvent(evt);
			});
			renderBook(row.createEl("td", { cls: "is-cover" }), this.host, config, n, "thumb");
			for (const c of columns) c.cell(row.createEl("td"), n);
		}
	}

	private columns(config: MediaTypeConfig): Column[] {
		const cols: Column[] = [
			{
				id: "title",
				label: "Title",
				cell: (td, n) => {
					const link = td.createSpan({ cls: "stacks-ledger-link", text: n.title });
					makeInteractive(link, this.host, config, n);
				},
			},
		];
		if (config.series) cols.push({ id: "series", label: "Series", cell: (td, n) => td.setText(seriesLabel(n) ?? "") });
		if (config.creatorField) cols.push({ id: "creator", label: config.creatorLabel || "Creator", cell: (td, n) => td.setText(creatorOf(n, config) ?? "") });
		cols.push({
			id: "status",
			label: "Status",
			cell: (td, n) => {
				const select = td.createEl("select", { cls: "stacks-status-select dropdown" });
				if (n.status === null || !config.statuses.some((s) => s.value === n.status)) {
					select.createEl("option", { text: n.status ?? "—", value: n.status ?? "" });
				}
				for (const s of config.statuses) select.createEl("option", { text: s.label || s.value, value: s.value });
				select.value = n.status ?? "";
				select.addEventListener("change", () => {
					if (select.value) void this.host.actions.changeStatus(n.path, config, select.value);
				});
			},
		});
		if (config.progress) {
			const unit = config.progress.unitLabel;
			cols.push({
				id: "progress",
				label: "Progress",
				cell: (td, n) => {
					const p = n.progress;
					if (!p || (p.current === 0 && p.total === null)) return;
					td.setText(p.total !== null ? `${p.current} / ${p.total}` : `${p.current}${unit ? ` ${unit}` : ""}`);
				},
			});
		}
		cols.push({
			id: "rating",
			label: "Rating",
			cell: (td, n) => {
				if (n.rating === null) return;
				const r = Math.max(0, Math.min(5, Math.round(n.rating)));
				td.createSpan({ cls: "stacks-stars", text: "★".repeat(r) + "☆".repeat(5 - r), attr: { "aria-label": `${n.rating} out of 5` } });
			},
		});
		if (config.startedField) cols.push({ id: "started", label: "Started", cell: (td, n) => td.setText(toStr(n.frontmatter[config.startedField]) ?? "") });
		if (config.finishedField) cols.push({ id: "finished", label: "Finished", cell: (td, n) => td.setText(toStr(n.frontmatter[config.finishedField]) ?? "") });
		return cols;
	}
}
