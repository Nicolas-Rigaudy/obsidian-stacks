// The settings tab as data, for Obsidian's declarative getSettingDefinitions (1.13).
// Pure: type-only `obsidian` imports, so the tests drive it without the app.

import type {
	Setting,
	SettingControl,
	SettingDefinition,
	SettingDefinitionItem,
	SettingDefinitionPage,
	SettingGroupItem,
} from "obsidian";
import { STATUS_BUCKETS, type MediaTypeConfig, type StatusBucket } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { CATALOG_SOURCES } from "../catalog/sources.ts";
import { TEMPLATE_PLACEHOLDERS } from "../logic/newNote.ts";
import { libraryHints } from "./hints.ts";
import { addLibraryFromPreset, PRESETS, removeLibrary } from "./presets.ts";
import { DEFAULT_LOG_SECTION, DEFAULT_PROGRESS, DEFAULT_SERIES, type StacksSettings } from "./settings.ts";

/** How a change must reach disk and the screen. */
export interface Change {
	/** Typing saves after a pause; toggles and list edits save at once. */
	save: "soon" | "now";
	/** The set of definitions changed (rows added or removed, a page title): rebuild. */
	redraw?: boolean;
	/** Only visible/disabled predicates changed: re-evaluate in place. */
	refresh?: boolean;
}

export interface ModelHost {
	settings: StacksSettings;
	index: { get(id: string): readonly MediaNote[] };
	folderExists(path: string): boolean;
	changed(change: Change): void;
}

interface Binding {
	get(): unknown;
	set(value: unknown): void;
	change: Change;
}

const BUCKET_LABELS: Record<StatusBucket, string> = {
	backlog: "Backlog (up-next candidates)",
	active: "Active (in progress)",
	done: "Done (counts as finished)",
	other: "Other (wishlist, dropped...)",
};

const APPEARANCES: Record<string, string> = {
	books: "Books in a bookcase",
	games: "Game cases in a media cabinet (by platform)",
	films: "Disc cases in a cinema cabinet",
};

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter((x) => x !== "");
const SOON: Change = { save: "soon" };
const NOW: Change = { save: "now" };

/** Definitions plus the key → field bindings their controls read and write. */
export class SettingsModel {
	private bindings = new Map<string, Binding>();

	private readonly host: ModelHost;

	constructor(host: ModelHost) {
		this.host = host;
	}

	getValue(key: string): unknown {
		return this.bindings.get(key)?.get();
	}

	/** Applies the value and reports how it must be saved and redrawn. */
	setValue(key: string, value: unknown): void {
		const b = this.bindings.get(key);
		if (!b) return;
		b.set(value);
		this.host.changed(b.change);
	}

	definitions(): SettingDefinitionItem[] {
		this.bindings = new Map();
		const { settings } = this.host;
		const libraries = Object.entries(settings.mediaTypes);
		return [
			{
				type: "group",
				heading: "Catalogue lookups",
				items: [
					{
						name: "What is sent",
						desc: "Quick add and the cover picker send what you type to Open Library, Steam, Wikipedia, TVmaze and Kitsu, only while you search. Each library can switch sources off.",
					},
					this.text("catalog.steamRegion", "Steam store region", "Two-letter country code, e.g. US, FR, DE.", {
						get: () => settings.catalog.steamRegion,
						set: (v) => (settings.catalog.steamRegion = v.trim().toUpperCase()),
						validate: (v) => (/^[A-Za-z]{2}$/.test(v.trim()) ? undefined : "Use two letters, e.g. US."),
					}),
					this.text("catalog.steamLanguage", "Steam language", "Language of game titles and descriptions, e.g. english, french, german.", {
						get: () => settings.catalog.steamLanguage,
						set: (v) => (settings.catalog.steamLanguage = v.trim().toLowerCase()),
						validate: (v) => (/^[a-z]+$/i.test(v.trim()) ? undefined : "Use letters only, e.g. english."),
					}),
				],
			},
			{
				type: "list",
				heading: "Libraries",
				emptyState: "No library yet. Add one from a preset below, then choose the folder that holds its notes.",
				items: libraries.map(([id, config]) => this.libraryPage(id, config)),
			},
			{
				type: "group",
				heading: "Add a library",
				items: [this.addLibraryRow()],
			},
		];
	}

	// ---- bindings ---------------------------------------------------------

	private bind(key: string, get: () => unknown, set: (v: never) => void, change: Change): string {
		this.bindings.set(key, { get, set, change });
		return key;
	}

	private text(
		key: string,
		name: string,
		desc: string,
		o: { get(): string; set(v: string): void; validate?: (v: string) => string | undefined; placeholder?: string; visible?: () => boolean },
	): SettingDefinition {
		const control: SettingControl = { type: "text", key: this.bind(key, () => o.get(), (v: string) => o.set(v), SOON), placeholder: o.placeholder, validate: o.validate };
		return { name, desc, control, visible: o.visible };
	}

	/** A plain text field of a library: trimmed on save. */
	private field(id: string, name: string, desc: string, get: () => string, set: (v: string) => void, visible?: () => boolean): SettingDefinition {
		return this.text(`${id}:${name}`, name, desc, { get, set: (v) => set(v.trim()), visible });
	}

	private list(id: string, name: string, desc: string, get: () => string[], set: (v: string[]) => void, visible?: () => boolean): SettingDefinition {
		return this.text(`${id}:${name}`, name, desc, { get: () => get().join(", "), set: (v) => set(splitList(v)), visible });
	}

	private toggle(key: string, name: string, desc: string, get: () => boolean, set: (v: boolean) => void, change: Change = NOW): SettingDefinition {
		return { name, desc, control: { type: "toggle", key: this.bind(key, get, set, change) } };
	}

	// ---- one library ------------------------------------------------------

	private libraryPage(id: string, config: MediaTypeConfig): SettingDefinitionPage {
		const folderExists = this.host.folderExists(config.folder.replace(/^\/+|\/+$/g, ""));
		const hints = libraryHints(config, this.host.index.get(id), folderExists);
		const f = (name: string, desc: string, get: () => string, set: (v: string) => void, visible?: () => boolean) =>
			this.field(id, name, desc, get, set, visible);

		const hasProgress = () => config.progress !== null;
		const hasSeries = () => config.series !== null;
		const hasLog = () => config.logSection !== null;
		const pr = () => config.progress ?? structuredClone(DEFAULT_PROGRESS);
		const se = () => config.series ?? structuredClone(DEFAULT_SERIES);
		const lg = () => config.logSection ?? structuredClone(DEFAULT_LOG_SECTION);
		// A group switched off has no object: its fields only write while it exists.

		const cats = config.categoryValues.length > 0 ? config.categoryValues : Object.keys(config.newNotes);
		const quickAdd: SettingDefinition[] = cats.map((cat) => ({
			name: `Folder for new “${cat}” notes`,
			control: {
				type: "folder",
				includeRoot: true,
				key: this.bind(
					`${id}:newNotes:${cat}`,
					() => config.newNotes[cat]?.folder ?? config.folder,
					(v: string) => (config.newNotes[cat] = { folder: v.trim(), extras: config.newNotes[cat]?.extras ?? {} }),
					SOON,
				),
			},
		}));

		const items: SettingDefinitionItem[] = [
			...hints.map((h): SettingDefinition => ({
				name: h,
				render: (setting) => void setting.settingEl.addClass("mod-warning"),
			})),
			{
				type: "group",
				items: [
					this.toggle(`${id}:enabled`, "Enabled", "", () => config.enabled, (v) => (config.enabled = v), { save: "now", redraw: true }),
					this.text(`${id}:label`, "Label", "Shown in view titles and menus.", {
						get: () => config.label,
						set: (v) => (config.label = v.trim()),
					}),
					{
						name: "Look",
						desc: "How items and shelves look.",
						control: {
							type: "dropdown",
							options: APPEARANCES,
							key: this.bind(`${id}:appearance`, () => config.appearance, (v: string) => (config.appearance = v as MediaTypeConfig["appearance"]), NOW),
						},
					},
					{
						name: "Folder",
						desc: "Notes in this folder and its subfolders. Empty = whole vault.",
						control: {
							type: "folder",
							includeRoot: true,
							placeholder: "Library/books",
							key: this.bind(`${id}:folder`, () => config.folder, (v: string) => (config.folder = v.trim()), { save: "soon", redraw: true }),
						},
					},
					f("Category field", "", () => config.categoryField, (v) => (config.categoryField = v)),
					this.list(id, "Category values", "Comma-separated. A note must have one of these. Empty = no filter.", () => config.categoryValues, (v) => (config.categoryValues = v)),
				],
			},
			...this.filtersList(id, config),
			{
				type: "group",
				heading: "Fields",
				items: [
					f("Title", "Falls back to the file name.", () => config.titleField, (v) => (config.titleField = v)),
					f("Creator", "Shown on cards after the series, e.g. author or platform. Empty = none.", () => config.creatorField, (v) => (config.creatorField = v)),
					f("Creator label", "Column name in the list, e.g. Author, Platform.", () => config.creatorLabel, (v) => (config.creatorLabel = v)),
					f("Cover", "Image URL or vault path.", () => config.coverField, (v) => (config.coverField = v)),
					f("Rating", "", () => config.ratingField, (v) => (config.ratingField = v)),
					f("Started date", "Stamped when moved to an active status. Empty = don't track.", () => config.startedField, (v) => (config.startedField = v)),
					f("Finished date", "Stamped when moved to a done status. Empty = don't track.", () => config.finishedField, (v) => (config.finishedField = v)),
					f("Buy-next star field", "Frontmatter flag set by “Star for Buy next”. Empty = no stars.", () => config.starField, (v) => (config.starField = v)),
					f("Wishlist status", "The status meaning “don't own it yet”: series follow-ups in Buy next come from it. Empty = none.", () => config.wishlistStatus, (v) => (config.wishlistStatus = v)),
				],
			},
			{
				type: "group",
				heading: "Quick add",
				items: [
					...quickAdd,
					f(
						"Note template",
						`Optional vault path of a template for new notes, e.g. Templates/Book. Placeholders: ${TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`).join(" ")}. Empty = a plain note with the cover shown.`,
						() => config.templatePath,
						(v) => (config.templatePath = v),
					),
					{
						name: "Status for new items",
						desc: "What quick add starts with. Automatic = the wishlist, else the first backlog status.",
						control: {
							type: "dropdown",
							options: {
								"": "Automatic",
								...Object.fromEntries(config.statuses.filter((s) => s.value !== "").map((s) => [s.value, s.label || s.value])),
							},
							key: this.bind(`${id}:defaultStatus`, () => config.defaultStatus, (v: string) => (config.defaultStatus = v), NOW),
						},
					},
				],
			},
			{
				type: "group",
				heading: "Catalogues",
				items: CATALOG_SOURCES.map((source): SettingDefinition =>
					this.toggle(
						`${id}:catalog:${source.id}`,
						source.label,
						`Looks up ${source.covers}.`,
						() => !config.disabledCatalogs.includes(source.id),
						(on) => {
							const rest = config.disabledCatalogs.filter((c) => c !== source.id);
							config.disabledCatalogs = on ? rest : [...rest, source.id];
						},
					),
				),
			},
			...this.statusesList(id, config),
			{
				type: "group",
				heading: "Progress",
				items: [
					this.toggle(`${id}:progress`, "Track progress", "Adds +N buttons and a progress bar.", hasProgress, (on) => (config.progress = on ? structuredClone(DEFAULT_PROGRESS) : null), { save: "now", refresh: true }),
					f("Current field", "", () => pr().currentField, (v) => config.progress && (config.progress.currentField = v), hasProgress),
					f("Total field", "", () => pr().totalField, (v) => config.progress && (config.progress.totalField = v), hasProgress),
					f("Unit label", "e.g. pages, tomes.", () => pr().unitLabel, (v) => config.progress && (config.progress.unitLabel = v), hasProgress),
					this.list(id, "Only for categories", "Comma-separated. Only notes of these categories get page controls (e.g. book, not bd). Empty = all.", () => pr().categories, (v) => config.progress && (config.progress.categories = v), hasProgress),
					this.text(`${id}:Quick increments`, "Quick increments", "Comma-separated, e.g. 10, 25.", {
						get: () => pr().quickIncrements.join(", "),
						set: (v) => config.progress && (config.progress.quickIncrements = splitList(v).map(Number).filter((n) => Number.isFinite(n) && n !== 0)),
						visible: hasProgress,
					}),
				],
			},
			{
				type: "group",
				heading: "Series",
				items: [
					this.toggle(`${id}:series`, "Series sequencing", "Hide later volumes from up next until earlier ones are done.", hasSeries, (on) => (config.series = on ? structuredClone(DEFAULT_SERIES) : null), { save: "now", refresh: true }),
					f("Series field", "", () => se().seriesField, (v) => config.series && (config.series.seriesField = v), hasSeries),
					f("Position field", "", () => se().positionField, (v) => config.series && (config.series.positionField = v), hasSeries),
					f("Position end field", "For omnibus editions covering several volumes. Empty = unused.", () => se().positionEndField, (v) => config.series && (config.series.positionEndField = v), hasSeries),
					{
						...this.toggle(
							`${id}:orderedByDefault`,
							"Series are in order by default",
							"On: later volumes wait for earlier ones (books). Off: one universe, any order (games like Assassin's Creed).",
							() => se().orderedByDefault,
							(v) => config.series && (config.series.orderedByDefault = v),
						),
						visible: hasSeries,
					},
					{
						name: "Exceptions",
						desc: "Series names that go the other way, comma-separated. Also set from a series panel.",
						visible: hasSeries,
						control: {
							type: "textarea",
							key: this.bind(`${id}:exceptions`, () => se().exceptions.join(", "), (v: string) => config.series && (config.series.exceptions = splitList(v)), SOON),
						},
					},
				],
			},
			{
				type: "group",
				heading: "Activity log",
				items: [
					this.toggle(`${id}:logSection`, "Write log lines", "Append dated lines to a section of the note on start, finish and progress.", hasLog, (on) => (config.logSection = on ? structuredClone(DEFAULT_LOG_SECTION) : null), { save: "now", refresh: true }),
					f("Section heading", "Level-2 heading text, without ##.", () => lg().heading, (v) => config.logSection && (config.logSection.heading = v), hasLog),
					f("Started line", "Placeholders: {date}.", () => lg().startedLine, (v) => config.logSection && (config.logSection.startedLine = v), hasLog),
					f("Finished line", "Placeholders: {date}.", () => lg().finishedLine, (v) => config.logSection && (config.logSection.finishedLine = v), hasLog),
					f("Progress line", "Placeholders: {value}, {unit}, {date}.", () => lg().progressLine, (v) => config.logSection && (config.logSection.progressLine = v), hasLog),
				],
			},
			{
				type: "group",
				items: [
					{
						name: "Remove library",
						desc: "Forgets this library's settings and view state. Your notes are not touched.",
						render: (setting) => {
							setting.addButton((b) =>
								b.setButtonText("Remove").setDestructive().onClick(() => {
									removeLibrary(this.host.settings, id);
									this.host.changed({ save: "now", redraw: true });
								}),
							);
						},
					},
				],
			},
		];

		return {
			type: "page",
			name: config.label || id,
			desc: config.enabled ? config.folder || "Whole vault" : "Disabled",
			displayValue: () => (config.enabled ? "" : "Disabled"),
			status: () => (hints.length > 0 ? "warning" : null),
			items,
		};
	}

	private filtersList(id: string, config: MediaTypeConfig): SettingDefinitionItem[] {
		const rows = config.categoryFilters.map((flt): SettingGroupItem => ({
			name: flt.label || flt.value || "New chip",
			render: (setting) => {
				addPair(setting, [
					{ placeholder: "Category value", get: () => flt.value, set: (v) => (flt.value = v.trim()) },
					{ placeholder: "Label", get: () => flt.label, set: (v) => (flt.label = v) },
				], () => this.host.changed(SOON));
			},
		}));
		return [
			{
				type: "group",
				heading: "Filter chips",
				items: [this.field(id, "Filter field", "Field the chips filter on, e.g. platform. Empty = the category field.", () => config.filterField, (v) => (config.filterField = v))],
			},
			{
			type: "list",
			emptyState: "No chips. Two or more are shown as All / Films / Series... in the toolbar.",
			items: rows,
			addItem: {
				name: "Add chip",
				action: () => {
					config.categoryFilters.push({ value: "", label: "" });
					this.host.changed({ save: "now", redraw: true });
				},
			},
			onDelete: (i) => {
				config.categoryFilters.splice(i, 1);
				this.host.changed({ save: "now", redraw: true });
			},
			onReorder: (from, to) => {
				move(config.categoryFilters, from, to);
				this.host.changed({ save: "now", redraw: true });
			},
			},
		];
	}

	private statusesList(id: string, config: MediaTypeConfig): SettingDefinitionItem[] {
		const rows = config.statuses.map((status): SettingGroupItem => ({
			name: status.label || status.value || "New status",
			render: (setting) => {
				addPair(setting, [
					{ placeholder: "Value", get: () => status.value, set: (v) => (status.value = v.trim()) },
					{ placeholder: "Label", get: () => status.label, set: (v) => (status.label = v) },
					{
						placeholder: "What it means (optional)",
						get: () => status.hint ?? "",
						set: (v) => {
							if (v.trim()) status.hint = v.trim();
							else delete status.hint;
						},
					},
				], () => this.host.changed(SOON));
				setting.addDropdown((d) => {
					for (const b of STATUS_BUCKETS) d.addOption(b, BUCKET_LABELS[b]);
					d.setValue(status.bucket).onChange((v) => {
						status.bucket = v as StatusBucket;
						this.host.changed(NOW);
					});
				});
			},
		}));
		return [
			{
				type: "group",
				heading: "Statuses",
				items: [
					this.field(id, "Status field", "", () => config.statusField, (v) => (config.statusField = v)),
					{
						name: "Order and buckets",
						desc: "Order = board column order. The bucket tells Stacks what a status means: up next only suggests backlog items, and a series volume counts as finished when its status is in a done bucket.",
					},
				],
			},
			{
			type: "list",
			emptyState: "No status yet. Add one: notes need a status to appear on the board.",
			items: rows,
			addItem: {
				name: "Add status",
				action: () => {
					config.statuses.push({ value: "", label: "", bucket: "other" });
					this.host.changed({ save: "now", redraw: true });
				},
			},
			onDelete: (i) => {
				config.statuses.splice(i, 1);
				this.host.changed({ save: "now", redraw: true });
			},
			onReorder: (from, to) => {
				move(config.statuses, from, to);
				this.host.changed({ save: "now", redraw: true });
			},
			},
		];
	}

	private addLibraryRow(): SettingDefinition {
		let choice = PRESETS[0].id;
		return {
			name: "Add a library",
			desc: "Starts from a preset; folder, fields and statuses can all be changed afterwards.",
			render: (setting) => {
				setting
					.addDropdown((d) => {
						for (const p of PRESETS) d.addOption(p.id, `${p.label}: ${p.description}`);
						d.setValue(choice).onChange((v) => (choice = v));
					})
					.addButton((b) =>
						b.setButtonText("Add").setCta().onClick(() => {
							if (addLibraryFromPreset(this.host.settings, choice)) this.host.changed({ save: "now", redraw: true });
						}),
					);
			},
		};
	}
}

/** Moves one element to a new index (the index it ends up at). */
export function move<T>(list: T[], from: number, to: number): void {
	if (from < 0 || from >= list.length) return;
	const [item] = list.splice(from, 1);
	list.splice(Math.max(0, Math.min(to, list.length)), 0, item);
}

interface Box {
	placeholder: string;
	get(): string;
	set(v: string): void;
}

/** Text inputs side by side on one row. */
function addPair(setting: Setting, boxes: Box[], onEdit: () => void): void {
	setting.setClass("stacks-status-row");
	for (const box of boxes) {
		setting.addText((t) =>
			t.setPlaceholder(box.placeholder).setValue(box.get()).onChange((v) => {
				box.set(v);
				onEdit();
			}),
		);
	}
}
