import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { LiveIndex } from "../data/liveIndex.ts";
import { rankCandidates } from "../logic/upNext.ts";
import type { StacksSettings } from "../settings/settings.ts";
import type { MediaNote } from "../types/mediaNote.ts";

export const VIEW_TYPE_INDEX_STATUS = "stacks-index-status";

export interface StatusViewHost {
	settings: StacksSettings;
	index: LiveIndex;
}

const UP_NEXT_SHOWN = 8;

function seriesLabel(n: MediaNote): string {
	if (!n.series) return "";
	return n.series.position === null ? ` (${n.series.name})` : ` (${n.series.name} #${n.series.position})`;
}

/**
 * Phase 1 check view: what the live index sees for each library. Re-renders on
 * every index rebuild, so editing a note (in Obsidian or outside it) should
 * update the counts within a second. Replaced by the real views in Phase 2.
 */
export class IndexStatusView extends ItemView {
	private readonly host: StatusViewHost;

	constructor(leaf: WorkspaceLeaf, host: StatusViewHost) {
		super(leaf);
		this.host = host;
	}

	getViewType(): string {
		return VIEW_TYPE_INDEX_STATUS;
	}

	getDisplayText(): string {
		return "Stacks: library status";
	}

	getIcon(): string {
		return "layers";
	}

	async onOpen(): Promise<void> {
		this.registerEvent(this.host.index.onChanged(() => this.render()));
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private render(): void {
		const el = this.contentEl;
		el.empty();
		el.addClass("stacks-status");
		el.createEl("h2", { text: "Stacks" });
		el.createEl("p", {
			cls: "stacks-muted",
			text: `Live index, last rebuilt ${new Date().toLocaleTimeString()}.`,
		});

		const libraries = Object.entries(this.host.settings.mediaTypes).filter(([, c]) => c.enabled);
		if (libraries.length === 0) {
			el.createEl("p", { text: "No libraries enabled. Turn one on in Settings → Stacks." });
			return;
		}

		for (const [id, config] of libraries) {
			const notes = this.host.index.get(id);
			const section = el.createDiv({ cls: "stacks-status-library" });
			section.createEl("h3", { text: config.label || id });
			section.createEl("p", {
				cls: "stacks-muted",
				text: `${notes.length} notes in ${config.folder || "the whole vault"}`,
			});

			const counts = new Map<string, number>();
			for (const n of notes) counts.set(n.status ?? "(none)", (counts.get(n.status ?? "(none)") ?? 0) + 1);
			const table = section.createEl("table", { cls: "stacks-status-table" });
			for (const s of config.statuses) {
				const row = table.createEl("tr");
				row.createEl("td", { text: s.label || s.value });
				row.createEl("td", { cls: "stacks-muted", text: s.bucket });
				row.createEl("td", { text: String(counts.get(s.value) ?? 0) });
				counts.delete(s.value);
			}
			for (const [value, count] of counts) {
				const row = table.createEl("tr", { cls: "stacks-status-unknown" });
				row.createEl("td", { text: value });
				row.createEl("td", { text: "not in settings" });
				row.createEl("td", { text: String(count) });
			}

			const { eligible, heldBack } = rankCandidates(notes, config);
			section.createEl("h4", { text: `Up next (${eligible.length} eligible, ${heldBack.length} held back)` });
			if (eligible.length === 0) {
				section.createEl("p", { cls: "stacks-muted", text: "Backlog empty." });
			} else {
				const list = section.createEl("ol");
				for (const n of eligible.slice(0, UP_NEXT_SHOWN)) list.createEl("li", { text: n.title + seriesLabel(n) });
				if (eligible.length > UP_NEXT_SHOWN) {
					section.createEl("p", { cls: "stacks-muted", text: `…and ${eligible.length - UP_NEXT_SHOWN} more` });
				}
			}
			if (heldBack.length > 0) {
				section.createEl("p", {
					cls: "stacks-muted",
					text: `Held back: ${heldBack.map((n) => n.title + seriesLabel(n)).join(", ")}`,
				});
			}
		}
	}
}
