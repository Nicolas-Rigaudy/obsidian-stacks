import { Modal, type App } from "obsidian";
import { secondaryLine } from "../logic/cardText.ts";
import { seriesView } from "../logic/series.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import { QuickAddModal } from "./quickAdd.ts";
import { makeInteractive, renderBook, type StacksHost } from "./shared.ts";

/**
 * A series at a glance: every volume in the vault with its status, the gaps,
 * read-in-order, and adding the next volume.
 */
export class SeriesPanel extends Modal {
	private readonly host: StacksHost;
	private readonly libraryId: string;
	private readonly name: string;
	/** Stand the pile up on the shelf (the pile's key in the bookcase), or null from elsewhere. */
	private readonly standUp: (() => void) | null;
	private ref: ReturnType<StacksHost["index"]["onChanged"]> | null = null;

	constructor(app: App, host: StacksHost, libraryId: string, name: string, standUp: (() => void) | null) {
		super(app);
		this.host = host;
		this.libraryId = libraryId;
		this.name = name;
		this.standUp = standUp;
	}

	private get config(): MediaTypeConfig {
		return this.host.settings.mediaTypes[this.libraryId];
	}

	onOpen(): void {
		this.modalEl.addClass("stacks-modal", "is-wide", "stacks-series-panel");
		this.modalEl.dataset.appearance = this.config.appearance;
		this.titleEl.setText(this.name);
		this.render();
		// Stays live: a status change elsewhere (or here) re-renders the panel.
		this.ref = this.host.index.onChanged((ids) => {
			if (ids.includes(this.libraryId)) this.render();
		});
	}

	onClose(): void {
		if (this.ref) this.host.index.offref(this.ref);
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		const config = this.config;
		contentEl.empty();
		const v = seriesView(this.host.index.get(this.libraryId), config, this.name);

		const summary = contentEl.createDiv({ cls: "stacks-series-summary" });
		const parts = [`${v.volumes.length} in the library`, `${v.counts.read} ${config.statuses.find((s) => s.bucket === "done")?.label.toLowerCase() ?? "done"}`];
		if (config.wishlistStatus) parts.push(`${v.counts.owned} owned`, `${v.counts.wishlist} on the wishlist`);
		if (v.gaps.length) parts.push(`${v.gaps.length} missing`);
		summary.setText(parts.join(" · "));

		const controls = contentEl.createDiv({ cls: "stacks-series-controls" });
		const order = controls.createDiv({ cls: "stacks-seg is-small", attr: { role: "radiogroup", "aria-label": "Order" } });
		for (const [ordered, label] of [[true, "Read in order"], [false, "Any order"]] as const) {
			const b = order.createEl("button", { cls: "stacks-seg-btn", text: config.appearance === "games" ? label.replace("Read", "Play") : label });
			b.toggleClass("is-active", v.ordered === ordered);
			b.addEventListener("click", () => void this.setOrdered(ordered));
		}
		const next = controls.createEl("button", { cls: "stacks-button is-primary", text: `Add #${v.next}` });
		next.addEventListener("click", () => this.addVolume(v.next));
		if (this.standUp) {
			const up = controls.createEl("button", { cls: "stacks-button", text: "Stand them up on the shelf" });
			up.addEventListener("click", () => {
				this.standUp?.();
				this.close();
			});
		}

		const grid = contentEl.createDiv({ cls: "stacks-series-grid" });
		// Volumes and gaps in position order.
		const rows: Array<{ pos: number; el: () => void }> = [];
		for (const n of v.volumes) {
			rows.push({
				pos: n.series?.position ?? 1e9,
				el: () => {
					const card = grid.createDiv({ cls: "stacks-series-vol" });
					const book = renderBook(card, this.host, config, n, "thumb");
					makeInteractive(book, this.host, config, n);
					const text = card.createDiv({ cls: "stacks-series-text" });
					const pos = n.series?.position !== null && n.series?.position !== undefined ? `#${n.series.position}${n.series.positionEnd ? `–${n.series.positionEnd}` : ""}  ` : "";
					text.createDiv({ cls: "stacks-series-title", text: `${pos}${n.title}${n.starred ? "  ★" : ""}` });
					const sub = secondaryLine(n, config).replace(`${this.name} #${n.series?.position} · `, "");
					if (sub) text.createDiv({ cls: "stacks-series-sub", text: sub });
					const select = text.createEl("select", { cls: "stacks-select" });
					for (const s of config.statuses) select.createEl("option", { text: s.label || s.value, value: s.value });
					select.value = n.status ?? "";
					select.addEventListener("change", () => void this.host.actions.changeStatus(n.path, config, select.value));
				},
			});
		}
		for (const g of v.gaps) {
			rows.push({
				pos: g,
				el: () => {
					const gap = grid.createDiv({ cls: "stacks-series-vol is-gap" });
					gap.createDiv({ cls: "stacks-series-gapnum", text: `#${g}` });
					const text = gap.createDiv({ cls: "stacks-series-text" });
					text.createDiv({ cls: "stacks-series-title", text: "Not in the library" });
					const add = text.createEl("button", { cls: "stacks-button", text: `Add #${g}` });
					add.addEventListener("click", () => this.addVolume(g));
				},
			});
		}
		rows.sort((a, b) => a.pos - b.pos).forEach((r) => r.el());
	}

	private async setOrdered(ordered: boolean): Promise<void> {
		const s = this.config.series;
		if (!s) return;
		const flipped = ordered !== s.orderedByDefault;
		s.exceptions = s.exceptions.filter((x) => x !== this.name);
		if (flipped) s.exceptions.push(this.name);
		await this.host.saveSettings();
		this.render();
	}

	private addVolume(position: number): void {
		const config = this.config;
		const sample = seriesView(this.host.index.get(this.libraryId), config, this.name).volumes[0];
		const modal = new QuickAddModal(this.app, this.host, this.libraryId, sample?.category ?? undefined);
		modal.presetSeries(this.name, position);
		if (config.appearance === "games" && sample?.facet) modal.presetPlatform(sample.facet);
		modal.open();
	}
}
