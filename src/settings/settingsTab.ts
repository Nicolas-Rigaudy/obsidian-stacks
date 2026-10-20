import { type App, debounce, type Plugin, PluginSettingTab, Setting } from "obsidian";
import { STATUS_BUCKETS, type MediaTypeConfig, type StatusBucket } from "../types/mediaConfig.ts";
import { FolderSuggest } from "./folderSuggest.ts";
import { CATALOG_SOURCES } from "../catalog/sources.ts";
import { TEMPLATE_PLACEHOLDERS } from "../logic/newNote.ts";
import { libraryHints } from "./hints.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { addLibraryFromPreset, PRESETS, removeLibrary } from "./presets.ts";
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
	index: { get(id: string): readonly MediaNote[] };
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
	private readonly open = new Set<string>();
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
		this.renderCatalogSettings(containerEl);
		const libraries = Object.entries(this.host.settings.mediaTypes);
		if (libraries.length === 0) {
			containerEl.createEl("p", { text: "No library yet. Add one from a preset below, then choose the folder that holds its notes." });
		}
		for (const [id, config] of libraries) this.renderLibrary(containerEl, id, config);
		this.renderAddLibrary(containerEl);
	}

	private renderCatalogSettings(el: HTMLElement): void {
		const store = this.host.settings.catalog;
		new Setting(el).setName("Catalogue lookups").setHeading();
		el.createEl("p", {
			cls: "setting-item-description",
			text: "Quick add and the cover picker send what you type to Open Library, Steam, Wikipedia, TVmaze and Kitsu, only while you search. Each library can switch sources off below.",
		});
		new Setting(el)
			.setName("Steam store region")
			.setDesc("Two-letter country code, e.g. US, FR, DE.")
			.addText((t) =>
				t.setValue(store.steamRegion).onChange((v) => {
					if (/^[A-Za-z]{2}$/.test(v.trim())) {
						store.steamRegion = v.trim().toUpperCase();
						this.saveSoon();
					}
				}),
			);
		new Setting(el)
			.setName("Steam language")
			.setDesc("Language of game titles and descriptions, e.g. english, french, german.")
			.addText((t) =>
				t.setValue(store.steamLanguage).onChange((v) => {
					if (/^[a-z]+$/i.test(v.trim())) {
						store.steamLanguage = v.trim().toLowerCase();
						this.saveSoon();
					}
				}),
			);
	}

	private renderCatalogChoices(el: HTMLElement, config: MediaTypeConfig): void {
		new Setting(el).setName("Catalogues").setHeading();
		for (const source of CATALOG_SOURCES) {
			new Setting(el).setName(source.label).setDesc(`Looks up ${source.covers}.`).addToggle((t) =>
				t.setValue(!config.disabledCatalogs.includes(source.id)).onChange(async (on) => {
					const rest = config.disabledCatalogs.filter((id) => id !== source.id);
					config.disabledCatalogs = on ? rest : [...rest, source.id];
					await this.saveNow();
				}),
			);
		}
		new Setting(el)
			.setName("Status for new items")
			.setDesc("What quick add starts with. Automatic = the wishlist, else the first backlog status.")
			.addDropdown((d) => {
				d.addOption("", "Automatic");
				for (const st of config.statuses) if (st.value !== "") d.addOption(st.value, st.label || st.value);
				d.setValue(config.defaultStatus).onChange(async (v) => {
					config.defaultStatus = v;
					await this.saveNow();
				});
			});
	}

	private renderAddLibrary(el: HTMLElement): void {
		let choice = PRESETS[0].id;
		new Setting(el)
			.setName("Add a library")
			.setDesc("Starts from a preset; folder, fields and statuses can all be changed afterwards.")
			.addDropdown((d) => {
				for (const p of PRESETS) d.addOption(p.id, `${p.label}: ${p.description}`);
				d.setValue(choice).onChange((v) => (choice = v));
			})
			.addButton((b) =>
				b.setButtonText("Add").setCta().onClick(async () => {
					const id = addLibraryFromPreset(this.host.settings, choice);
					if (!id) return;
					this.open.add(id);
					await this.saveAndRedraw();
				}),
			);
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
				t.setPlaceholder("Library/books").setValue(config.folder).onChange((v) => {
					config.folder = v.trim();
					this.saveSoon();
				});
				new FolderSuggest(this.app, t.inputEl, (path) => {
					config.folder = path;
					void this.saveNow();
				});
			});

		this.renderHints(el, id, config);
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

		new Setting(el).setName("Fields").setHeading();
		this.text(el, "Title", "Falls back to the file name.", config.titleField, (v) => (config.titleField = v));
		this.text(el, "Creator", "Shown on cards after the series, e.g. author or platform. Empty = none.", config.creatorField, (v) => (config.creatorField = v));
		this.text(el, "Creator label", "Column name in the list, e.g. Author, Platform.", config.creatorLabel, (v) => (config.creatorLabel = v));
		this.text(el, "Cover", "Image URL or vault path.", config.coverField, (v) => (config.coverField = v));
		this.text(el, "Rating", "", config.ratingField, (v) => (config.ratingField = v));
		this.text(el, "Started date", "Stamped when moved to an active status. Empty = don't track.", config.startedField, (v) => (config.startedField = v));
		this.text(el, "Finished date", "Stamped when moved to a done status. Empty = don't track.", config.finishedField, (v) => (config.finishedField = v));
		this.text(el, "Buy-next star field", "Frontmatter flag set by “Star for Buy next”. Empty = no stars.", config.starField, (v) => (config.starField = v));
		this.text(el, "Wishlist status", "The status meaning “don't own it yet”: series follow-ups in Buy next come from it. Empty = none.", config.wishlistStatus, (v) => (config.wishlistStatus = v));

		this.renderNewNoteFolders(el, config);
		this.text(el, "Note template", `Optional vault path of a template for new notes, e.g. Templates/Book. Placeholders: ${TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`).join(" ")}. Empty = a plain note with the cover shown.`, config.templatePath, (v) => (config.templatePath = v));
		this.renderCatalogChoices(el, config);
		this.renderStatuses(el, config);
		this.renderProgress(el, config);
		this.renderSeries(el, config);
		this.renderLogSection(el, config);

		new Setting(el)
			.setName("Remove library")
			.setDesc("Forgets this library's settings and view state. Your notes are not touched.")
			.addButton((b) =>
				b.setButtonText("Remove").setDestructive().onClick(async () => {
					removeLibrary(this.host.settings, id);
					this.open.delete(id);
					await this.saveAndRedraw();
				}),
			);
	}

	/** What this library finds right now, in words (empty folder, missing fields). */
	private renderHints(el: HTMLElement, id: string, config: MediaTypeConfig): void {
		const folderExists = config.folder === "" || this.app.vault.getFolderByPath(config.folder.replace(/^\/+|\/+$/g, "")) !== null;
		const hints = libraryHints(config, this.host.index.get(id), folderExists);
		if (hints.length === 0) return;
		const box = el.createDiv({ cls: "stacks-settings-hints" });
		for (const h of hints) box.createEl("p", { cls: "setting-item-description mod-warning", text: h });
	}

	private renderNewNoteFolders(el: HTMLElement, config: MediaTypeConfig): void {
		const cats = config.categoryValues.length > 0 ? config.categoryValues : Object.keys(config.newNotes);
		if (cats.length === 0) return;
		new Setting(el).setName("Quick add").setHeading();
		for (const cat of cats) {
			new Setting(el)
				.setName(`Folder for new “${cat}” notes`)
				.addText((t) => {
					t.setValue(config.newNotes[cat]?.folder ?? config.folder).onChange((v) => {
						config.newNotes[cat] = { folder: v.trim(), extras: config.newNotes[cat]?.extras ?? {} };
						this.saveSoon();
					});
					new FolderSuggest(this.app, t.inputEl, (path) => {
						config.newNotes[cat] = { folder: path, extras: config.newNotes[cat]?.extras ?? {} };
						void this.saveNow();
					});
				});
		}
	}

	private renderStatuses(el: HTMLElement, config: MediaTypeConfig): void {
		new Setting(el).setName("Statuses").setHeading();
		this.text(el, "Status field", "", config.statusField, (v) => (config.statusField = v));
		el.createEl("p", {
			cls: "setting-item-description",
			text: "Order = board column order. The bucket tells Stacks what a status means: up next only suggests backlog items, and a series volume counts as finished when its status is in a done bucket.",
		});

		config.statuses.forEach((status, i) => {
			const row = new Setting(el).setClass("stacks-status-row");
			row.addText((t) =>
				t.setPlaceholder("Value").setValue(status.value).onChange((v) => {
					status.value = v.trim();
					this.saveSoon();
				}),
			);
			row.addText((t) =>
				t.setPlaceholder("Label").setValue(status.label).onChange((v) => {
					status.label = v;
					this.saveSoon();
				}),
			);
			row.addText((t) =>
				t.setPlaceholder("What it means (optional)").setValue(status.hint ?? "").onChange((v) => {
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
		this.text(el, "Filter field", "Field the chips filter on, e.g. platform. Empty = the category field.", config.filterField, (v) => (config.filterField = v));
		new Setting(el)
			.setName("Filter chips")
			.setDesc("Values offered as chips in the toolbar (All / Films / Series...). Two or more to show them.")
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
					t.setPlaceholder("Category value").setValue(f.value).onChange((v) => {
						f.value = v.trim();
						this.saveSoon();
					}),
				)
				.addText((t) =>
					t.setPlaceholder("Label").setValue(f.label).onChange((v) => {
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
		new Setting(el).setName("Progress").setHeading();
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
		new Setting(el).setName("Series").setHeading();
		this.groupToggle(el, "Series sequencing", "Hide later volumes from up next until earlier ones are done.", config.series !== null, (on) => {
			config.series = on ? structuredClone(DEFAULT_SERIES) : null;
		});
		const s = config.series;
		if (!s) return;
		this.text(el, "Series field", "", s.seriesField, (v) => (s.seriesField = v));
		this.text(el, "Position field", "", s.positionField, (v) => (s.positionField = v));
		this.text(el, "Position end field", "For omnibus editions covering several volumes. Empty = unused.", s.positionEndField, (v) => (s.positionEndField = v));
		new Setting(el)
			.setName("Series are in order by default")
			.setDesc("On: later volumes wait for earlier ones (books). Off: one universe, any order (games like Assassin's Creed).")
			.addToggle((t) => t.setValue(s.orderedByDefault).onChange(async (v) => {
				s.orderedByDefault = v;
				await this.saveNow();
			}));
		new Setting(el)
			.setName("Exceptions")
			.setDesc("Series names that go the other way, comma-separated. Also set from a series panel.")
			.addTextArea((t) => t.setValue(s.exceptions.join(", ")).onChange((v) => {
				s.exceptions = splitList(v);
				this.saveSoon();
			}));
	}

	private renderLogSection(el: HTMLElement, config: MediaTypeConfig): void {
		new Setting(el).setName("Activity log").setHeading();
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
