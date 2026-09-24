import { type App, debounce, type Plugin, PluginSettingTab, Setting } from "obsidian";
import { STATUS_BUCKETS, type MediaTypeConfig, type StatusBucket } from "../types/mediaConfig.ts";
import { FolderSuggest } from "./folderSuggest.ts";
import {
	DEFAULT_LOG_SECTION,
	DEFAULT_PROGRESS,
	DEFAULT_SERIES,
	type StacksSettings,
} from "./settings.ts";

/** What the tab needs from the plugin (avoids importing main.ts). */
export interface SettingsHost extends Plugin {
	settings: StacksSettings;
	saveSettings(): Promise<void>;
}

const BUCKET_LABELS: Record<StatusBucket, string> = {
	backlog: "Backlog (up-next candidates)",
	active: "Active (in progress)",
	done: "Done (counts as finished)",
	other: "Other (wishlist, dropped...)",
};

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter((x) => x !== "");

export class StacksSettingTab extends PluginSettingTab {
	private readonly host: SettingsHost;
	/** Library sections left open across re-renders. */
	private readonly open = new Set<string>(["book"]);
	/** Text edits save after typing pauses; structural edits save immediately. */
	private readonly saveSoon = debounce(() => void this.host.saveSettings(), 500, true);

	constructor(app: App, host: SettingsHost) {
		super(app, host);
		this.host = host;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Each library maps a folder of notes to gallery, board and up-next views. Field names refer to note frontmatter.",
		});
		for (const [id, config] of Object.entries(this.host.settings.mediaTypes)) {
			this.renderLibrary(containerEl, id, config);
		}
	}

	private async saveNow(): Promise<void> {
		await this.host.saveSettings();
	}

	/** Save and redraw (for toggles and list edits that change the layout). */
	private async saveAndRedraw(): Promise<void> {
		await this.saveNow();
		this.display();
	}

	private renderLibrary(parent: HTMLElement, id: string, config: MediaTypeConfig): void {
		const details = parent.createEl("details", { cls: "stacks-settings-library" });
		details.open = this.open.has(id);
		details.addEventListener("toggle", () => {
			if (details.open) this.open.add(id);
			else this.open.delete(id);
		});
		details.createEl("summary", { text: `${config.label || id}${config.enabled ? "" : " (disabled)"}` });
		const el = details.createDiv({ cls: "stacks-settings-body" });

		new Setting(el).setName("Enabled").addToggle((t) =>
			t.setValue(config.enabled).onChange(async (v) => {
				config.enabled = v;
				await this.saveAndRedraw();
			}),
		);
		this.text(el, "Label", "Shown in view titles and menus.", config.label, (v) => (config.label = v));
		new Setting(el)
			.setName("Look")
			.setDesc("How items and shelves look.")
			.addDropdown((d) =>
				d
					.addOption("books", "Books in a bookcase")
					.addOption("games", "Game cases in a media cabinet (by platform)")
					.addOption("films", "Disc cases in a cinema cabinet")
					.setValue(config.appearance)
					.onChange(async (v) => {
						config.appearance = v as MediaTypeConfig["appearance"];
						await this.saveNow();
					}),
			);

		new Setting(el)
			.setName("Folder")
			.setDesc("Notes in this folder and its subfolders. Empty = whole vault.")
			.addText((t) => {
				t.setPlaceholder("20 Personal/Hobbies/Reading/Books").setValue(config.folder).onChange((v) => {
					config.folder = v.trim();
					this.saveSoon();
				});
				new FolderSuggest(this.app, t.inputEl, (path) => {
					config.folder = path;
					void this.saveNow();
				});
			});

		this.text(el, "Category field", "", config.categoryField, (v) => (config.categoryField = v));
		new Setting(el)
			.setName("Category values")
			.setDesc("Comma-separated. A note must have one of these. Empty = no filter.")
			.addText((t) =>
				t.setValue(config.categoryValues.join(", ")).onChange((v) => {
					config.categoryValues = splitList(v);
					this.saveSoon();
				}),
			);

		this.renderFilters(el, config);

		el.createEl("h4", { text: "Fields" });
		this.text(el, "Title", "Falls back to the file name.", config.titleField, (v) => (config.titleField = v));
		this.text(el, "Creator", "Shown on cards after the series, e.g. author or platform. Empty = none.", config.creatorField, (v) => (config.creatorField = v));
		this.text(el, "Creator label", "Column name in the list, e.g. Author, Platform.", config.creatorLabel, (v) => (config.creatorLabel = v));
		this.text(el, "Cover", "Image URL or vault path.", config.coverField, (v) => (config.coverField = v));
		this.text(el, "Rating", "", config.ratingField, (v) => (config.ratingField = v));
		this.text(el, "Started date", "Stamped when moved to an active status. Empty = don't track.", config.startedField, (v) => (config.startedField = v));
		this.text(el, "Finished date", "Stamped when moved to a done status. Empty = don't track.", config.finishedField, (v) => (config.finishedField = v));

		this.renderStatuses(el, config);
		this.renderProgress(el, config);
		this.renderSeries(el, config);
		this.renderLogSection(el, config);
	}

	private renderStatuses(el: HTMLElement, config: MediaTypeConfig): void {
		el.createEl("h4", { text: "Statuses" });
		this.text(el, "Status field", "", config.statusField, (v) => (config.statusField = v));
		el.createEl("p", {
			cls: "setting-item-description",
			text: "Order = board column order. The bucket tells Stacks what a status means: up next only suggests backlog items, and a series volume counts as finished when its status is in a done bucket.",
		});

		config.statuses.forEach((status, i) => {
			const row = new Setting(el).setClass("stacks-status-row");
			row.addText((t) =>
				t.setPlaceholder("value").setValue(status.value).onChange((v) => {
					status.value = v.trim();
					this.saveSoon();
				}),
			);
			row.addText((t) =>
				t.setPlaceholder("label").setValue(status.label).onChange((v) => {
					status.label = v;
					this.saveSoon();
				}),
			);
			row.addText((t) =>
				t.setPlaceholder("what it means (optional)").setValue(status.hint ?? "").onChange((v) => {
					if (v.trim()) status.hint = v.trim();
					else delete status.hint;
					this.saveSoon();
				}),
			);
			row.addDropdown((d) => {
				for (const b of STATUS_BUCKETS) d.addOption(b, BUCKET_LABELS[b]);
				d.setValue(status.bucket).onChange(async (v) => {
					status.bucket = v as StatusBucket;
					await this.saveNow();
				});
			});
			row.addExtraButton((b) =>
				b.setIcon("arrow-up").setTooltip("Move up").setDisabled(i === 0).onClick(async () => {
					[config.statuses[i - 1], config.statuses[i]] = [config.statuses[i], config.statuses[i - 1]];
					await this.saveAndRedraw();
				}),
			);
			row.addExtraButton((b) =>
				b.setIcon("arrow-down").setTooltip("Move down").setDisabled(i === config.statuses.length - 1).onClick(async () => {
					[config.statuses[i], config.statuses[i + 1]] = [config.statuses[i + 1], config.statuses[i]];
					await this.saveAndRedraw();
				}),
			);
			row.addExtraButton((b) =>
				b.setIcon("trash").setTooltip("Remove").onClick(async () => {
					config.statuses.splice(i, 1);
					await this.saveAndRedraw();
				}),
			);
		});

		new Setting(el).addButton((b) =>
			b.setButtonText("Add status").onClick(async () => {
				config.statuses.push({ value: "", label: "", bucket: "other" });
				await this.saveAndRedraw();
			}),
		);
	}

	private renderFilters(el: HTMLElement, config: MediaTypeConfig): void {
		new Setting(el)
			.setName("Filter chips")
			.setDesc("Category values offered as chips in the toolbar (All / Films / Series...). Two or more to show them.")
			.addButton((b) =>
				b.setButtonText("Add chip").onClick(async () => {
					config.categoryFilters.push({ value: "", label: "" });
					await this.saveAndRedraw();
				}),
			);
		config.categoryFilters.forEach((f, i) => {
			new Setting(el)
				.setClass("stacks-status-row")
				.addText((t) =>
					t.setPlaceholder("category value").setValue(f.value).onChange((v) => {
						f.value = v.trim();
						this.saveSoon();
					}),
				)
				.addText((t) =>
					t.setPlaceholder("label").setValue(f.label).onChange((v) => {
						f.label = v;
						this.saveSoon();
					}),
				)
				.addExtraButton((b) =>
					b.setIcon("trash").setTooltip("Remove").onClick(async () => {
						config.categoryFilters.splice(i, 1);
						await this.saveAndRedraw();
					}),
				);
		});
	}

	private renderProgress(el: HTMLElement, config: MediaTypeConfig): void {
		el.createEl("h4", { text: "Progress" });
		this.groupToggle(el, "Track progress", "Adds +N buttons and a progress bar.", config.progress !== null, (on) => {
			config.progress = on ? structuredClone(DEFAULT_PROGRESS) : null;
		});
		const p = config.progress;
		if (!p) return;
		this.text(el, "Current field", "", p.currentField, (v) => (p.currentField = v));
		this.text(el, "Total field", "", p.totalField, (v) => (p.totalField = v));
		this.text(el, "Unit label", "e.g. pages, tomes.", p.unitLabel, (v) => (p.unitLabel = v));
		new Setting(el)
			.setName("Only for categories")
			.setDesc("Comma-separated. Only notes of these categories get page controls (e.g. book, not bd). Empty = all.")
			.addText((t) =>
				t.setValue(p.categories.join(", ")).onChange((v) => {
					p.categories = splitList(v);
					this.saveSoon();
				}),
			);
		new Setting(el)
			.setName("Quick increments")
			.setDesc("Comma-separated, e.g. 10, 25.")
			.addText((t) =>
				t.setValue(p.quickIncrements.join(", ")).onChange((v) => {
					p.quickIncrements = splitList(v).map(Number).filter((n) => Number.isFinite(n) && n !== 0);
					this.saveSoon();
				}),
			);
	}

	private renderSeries(el: HTMLElement, config: MediaTypeConfig): void {
		el.createEl("h4", { text: "Series" });
		this.groupToggle(el, "Series sequencing", "Hide later volumes from up next until earlier ones are done.", config.series !== null, (on) => {
			config.series = on ? structuredClone(DEFAULT_SERIES) : null;
		});
		const s = config.series;
		if (!s) return;
		this.text(el, "Series field", "", s.seriesField, (v) => (s.seriesField = v));
		this.text(el, "Position field", "", s.positionField, (v) => (s.positionField = v));
		this.text(el, "Position end field", "For omnibus editions covering several volumes. Empty = unused.", s.positionEndField, (v) => (s.positionEndField = v));
	}

	private renderLogSection(el: HTMLElement, config: MediaTypeConfig): void {
		el.createEl("h4", { text: "Activity log" });
		this.groupToggle(el, "Write log lines", "Append dated lines to a section of the note on start, finish and progress.", config.logSection !== null, (on) => {
			config.logSection = on ? structuredClone(DEFAULT_LOG_SECTION) : null;
		});
		const log = config.logSection;
		if (!log) return;
		this.text(el, "Section heading", "Level-2 heading text, without ##.", log.heading, (v) => (log.heading = v));
		this.text(el, "Started line", "Placeholders: {date}.", log.startedLine, (v) => (log.startedLine = v));
		this.text(el, "Finished line", "Placeholders: {date}.", log.finishedLine, (v) => (log.finishedLine = v));
		this.text(el, "Progress line", "Placeholders: {value}, {unit}, {date}.", log.progressLine, (v) => (log.progressLine = v));
	}

	private groupToggle(el: HTMLElement, name: string, desc: string, value: boolean, set: (on: boolean) => void): void {
		new Setting(el).setName(name).setDesc(desc).addToggle((t) =>
			t.setValue(value).onChange(async (on) => {
				set(on);
				await this.saveAndRedraw();
			}),
		);
	}

	private text(el: HTMLElement, name: string, desc: string, value: string, set: (v: string) => void): void {
		new Setting(el).setName(name).setDesc(desc).addText((t) =>
			t.setValue(value).onChange((v) => {
				set(v.trim());
				this.saveSoon();
			}),
		);
	}
}
