import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SettingDefinitionItem } from "obsidian";
import { type Change, move, SettingsModel } from "../src/settings/settingDefinitions.ts";
import { DEFAULT_SETTINGS, mergeSettings, type StacksSettings } from "../src/settings/settings.ts";
import { addLibraryFromPreset } from "../src/settings/presets.ts";

interface Row {
	name?: string;
	control?: { key: string; type: string; validate?: (v: string) => string | undefined };
	render?: (setting: unknown) => void;
	visible?: boolean | (() => boolean);
	[k: string]: unknown;
}

function setup(configure?: (s: StacksSettings) => void, folderExists = true) {
	const settings = mergeSettings(structuredClone(DEFAULT_SETTINGS));
	addLibraryFromPreset(settings, "books");
	configure?.(settings);
	const changes: Change[] = [];
	const model = new SettingsModel({
		settings,
		index: { get: () => [] },
		folderExists: () => folderExists,
		changed: (c) => changes.push(c),
	});
	return { settings, model, changes, defs: model.definitions() };
}

/** Every row below groups, lists and pages, with the page it sits in. */
function rows(items: SettingDefinitionItem[] | undefined, page = ""): { page: string; row: Row }[] {
	const out: { page: string; row: Row }[] = [];
	for (const it of items ?? []) {
		const d = it as unknown as { type?: string; items?: SettingDefinitionItem[]; name?: string };
		if (d.type === "page") out.push(...rows(d.items, d.name ?? ""));
		else if (d.type === "group" || d.type === "list") out.push(...rows(d.items, page));
		else out.push({ page, row: it as unknown as Row });
	}
	return out;
}

const last = <T,>(a: T[]): T | undefined => a[a.length - 1];

const find = (defs: SettingDefinitionItem[], name: string, page?: string) => {
	const hit = rows(defs).find((r) => r.row.name === name && (page === undefined || r.page === page));
	assert.ok(hit, `row “${name}” not found`);
	return hit.row;
};

const lists = (defs: SettingDefinitionItem[]) => {
	const out: Record<string, unknown>[] = [];
	const walk = (items: SettingDefinitionItem[] | undefined) => {
		for (const it of items ?? []) {
			const d = it as unknown as Record<string, unknown>;
			if (d.type === "list") out.push(d);
			if (d.items) walk(d.items as SettingDefinitionItem[]);
		}
	};
	walk(defs);
	return out;
};

describe("declarative settings", () => {
	test("keys are unique and every control key resolves to a value", () => {
		const { model, defs } = setup();
		const keys = rows(defs).flatMap((r) => (r.row.control ? [r.row.control.key] : []));
		assert.ok(keys.length > 30);
		assert.equal(new Set(keys).size, keys.length);
		for (const k of keys) assert.notEqual(model.getValue(k), undefined, k);
	});

	test("each library is a page named after it, with a warning when its folder is missing", () => {
		const ok = setup();
		const pagesOf = (defs: SettingDefinitionItem[]) =>
			defs.flatMap((d) => ((d as { items?: unknown[] }).items ?? []) as { type?: string; name?: string; status?: () => string | null }[]).filter((d) => d.type === "page");
		assert.deepEqual(pagesOf(ok.defs).map((p) => p.name), ["Books"]);
		assert.equal(pagesOf(ok.defs)[0].status!(), "warning"); // no notes indexed
		const missing = setup((s) => (s.mediaTypes.books.folder = "Nowhere"), false);
		assert.equal(pagesOf(missing.defs)[0].status!(), "warning");
	});

	test("a text field writes its trimmed value and asks for a pause-save", () => {
		const { model, settings, changes, defs } = setup();
		const key = find(defs, "Label", "Books").control!.key;
		model.setValue(key, "  Shelf ");
		assert.equal(settings.mediaTypes.books.label, "Shelf");
		assert.deepEqual(last(changes), { save: "soon" });
	});

	test("lists of values round-trip through comma text", () => {
		const { model, settings, defs } = setup();
		const key = find(defs, "Category values", "Books").control!.key;
		model.setValue(key, "book, bd ,");
		assert.deepEqual(settings.mediaTypes.books.categoryValues, ["book", "bd"]);
		assert.equal(model.getValue(key), "book, bd");
	});

	test("Steam fields reject bad values and normalise good ones", () => {
		const { model, settings, defs } = setup();
		const region = find(defs, "Steam store region").control!;
		assert.ok(region.validate!("France"));
		assert.equal(region.validate!(" fr "), undefined);
		model.setValue(region.key, " fr ");
		assert.equal(settings.catalog.steamRegion, "FR");
		const lang = find(defs, "Steam language").control!;
		assert.ok(lang.validate!("fr-FR"));
		model.setValue(lang.key, "French");
		assert.equal(settings.catalog.steamLanguage, "french");
	});

	test("a catalogue toggle switches a source off and on", () => {
		const { model, settings, changes, defs } = setup();
		const key = find(defs, "Steam", "Books").control!.key;
		assert.equal(model.getValue(key), true);
		model.setValue(key, false);
		assert.deepEqual(settings.mediaTypes.books.disabledCatalogs.includes("steam"), true);
		assert.equal(model.getValue(key), false);
		assert.deepEqual(last(changes), { save: "now" });
		model.setValue(key, true);
		assert.equal(settings.mediaTypes.books.disabledCatalogs.includes("steam"), false);
	});

	test("progress group: toggle creates and drops it, fields hide meanwhile", () => {
		const { model, settings, changes, defs } = setup();
		const book = settings.mediaTypes.books;
		const toggle = find(defs, "Track progress", "Books").control!.key;
		const unit = find(defs, "Unit label", "Books");
		assert.equal(typeof unit.visible, "function");
		assert.equal((unit.visible as () => boolean)(), true);
		model.setValue(toggle, false);
		assert.equal(book.progress, null);
		assert.deepEqual(last(changes), { save: "now", refresh: true });
		assert.equal((unit.visible as () => boolean)(), false);
		// a stale write while off is ignored, not a crash
		model.setValue(unit.control!.key, "pages");
		assert.equal(book.progress, null);
		model.setValue(toggle, true);
		assert.ok(book.progress);
		model.setValue(unit.control!.key, " tomes ");
		assert.equal(settings.mediaTypes.books.progress!.unitLabel, "tomes");
	});

	test("quick increments drop junk", () => {
		const { model, settings, defs } = setup();
		model.setValue(find(defs, "Quick increments", "Books").control!.key, "5, x, 0, 50");
		assert.deepEqual(settings.mediaTypes.books.progress!.quickIncrements, [5, 50]);
	});

	test("series and log toggles follow the same pattern", () => {
		const { model, settings, defs } = setup();
		model.setValue(find(defs, "Series sequencing", "Books").control!.key, false);
		assert.equal(settings.mediaTypes.books.series, null);
		model.setValue(find(defs, "Write log lines", "Books").control!.key, false);
		assert.equal(settings.mediaTypes.books.logSection, null);
	});

	test("enabled and a folder change ask for a rebuild (page subtitle)", () => {
		const { model, settings, changes, defs } = setup();
		model.setValue(find(defs, "Enabled", "Books").control!.key, false);
		assert.equal(settings.mediaTypes.books.enabled, false);
		assert.equal(last(changes)?.redraw, true);
		model.setValue(find(defs, "Folder", "Books").control!.key, " Library/books ");
		assert.equal(settings.mediaTypes.books.folder, "Library/books");
		assert.equal(last(changes)?.redraw, true);
	});

	test("quick add folder per category writes newNotes and keeps extras", () => {
		const { model, settings, defs } = setup((s) => {
			s.mediaTypes.books.newNotes.book = { folder: "", extras: { tags: ["x"] } };
		});
		const key = find(defs, "Folder for new “book” notes", "Books").control!.key;
		model.setValue(key, " Inbox ");
		assert.deepEqual(settings.mediaTypes.books.newNotes.book, { folder: "Inbox", extras: { tags: ["x"] } });
	});

	test("default status offers Automatic and the library's statuses", () => {
		const { defs, settings } = setup();
		const row = find(defs, "Status for new items", "Books") as unknown as { control: { options: Record<string, string> } };
		assert.deepEqual(Object.keys(row.control.options), ["", ...settings.mediaTypes.books.statuses.map((s) => s.value).filter(Boolean)]);
	});

	test("status list: add, delete and reorder edit the config and ask for a rebuild", () => {
		const { settings, changes, defs } = setup();
		const statuses = settings.mediaTypes.books.statuses;
		const list = lists(defs).find((l) => (l.items as unknown[]).length === statuses.length && l.addItem && (l.addItem as { name: string }).name === "Add status")!;
		const before = statuses.map((s) => s.value);
		(list.onReorder as (a: number, b: number) => void)(0, 2);
		assert.deepEqual(statuses.map((s) => s.value), [before[1], before[2], before[0], before[3]]);
		(list.onDelete as (i: number) => void)(0);
		assert.equal(statuses.length, 3);
		(list.addItem as { action: () => void }).action();
		assert.equal(statuses.length, 4);
		assert.deepEqual(last(statuses), { value: "", label: "", bucket: "other" });
		assert.deepEqual(last(changes), { save: "now", redraw: true });
	});

	test("chip list: add, delete and reorder", () => {
		const { settings, defs } = setup((s) => s.mediaTypes.books.categoryFilters.push({ value: "a", label: "A" }, { value: "b", label: "B" }));
		const chips = settings.mediaTypes.books.categoryFilters;
		const list = lists(defs).find((l) => (l.addItem as { name: string } | undefined)?.name === "Add chip")!;
		(list.onReorder as (a: number, b: number) => void)(1, 0);
		assert.deepEqual(chips.map((c) => c.value), ["b", "a"]);
		(list.onDelete as (i: number) => void)(0);
		assert.deepEqual(chips.map((c) => c.value), ["a"]);
		(list.addItem as { action: () => void }).action();
		assert.deepEqual(last(chips), { value: "", label: "" });
	});

	test("status row renders four inputs that edit that status", () => {
		const { settings, changes, defs } = setup();
		const status = settings.mediaTypes.books.statuses[0];
		const list = lists(defs).find((l) => (l.addItem as { name: string } | undefined)?.name === "Add status")!;
		const row = (list.items as Row[])[0];
		const texts: { onChange: (v: string) => void }[] = [];
		let dropdown: { onChange: (v: string) => void } | undefined;
		const fake = {
			setClass() {},
			addText(cb: (t: unknown) => void) {
				const t = { onChange(fn: (v: string) => void) { this.fn = fn; return this; }, setPlaceholder() { return this; }, setValue() { return this; }, fn: (_: string) => {} };
				cb(t);
				texts.push({ onChange: (v) => t.fn(v) });
				return fake;
			},
			addDropdown(cb: (d: unknown) => void) {
				const d = { addOption() {}, setValue() { return this; }, onChange(fn: (v: string) => void) { this.fn = fn; return this; }, fn: (_: string) => {} };
				cb(d);
				dropdown = { onChange: (v) => d.fn(v) };
				return fake;
			},
		};
		row.render!(fake);
		assert.equal(texts.length, 3);
		texts[0].onChange(" new ");
		texts[1].onChange("New");
		texts[2].onChange("  ");
		dropdown!.onChange("done");
		assert.equal(status.value, "new");
		assert.equal(status.label, "New");
		assert.equal(status.hint, undefined);
		assert.equal(status.bucket, "done");
		assert.deepEqual(last(changes), { save: "now" });
	});

	test("adding a library through its row, removing it through its button", () => {
		const { settings, changes, defs } = setup();
		const addRow = find(defs, "Add a library");
		let add: (() => void) | undefined;
		const chain = (cb: (c: unknown) => void, extra: Record<string, unknown>) => {
			const c: Record<string, unknown> = { setButtonText: () => c, setCta: () => c, setDestructive: () => c, addOption() {}, setValue: () => c, onChange: () => c, onClick: (fn: () => void) => ((add = fn), c), ...extra };
			cb(c);
		};
		const fake: Record<string, unknown> = {
			addDropdown: (cb: (c: unknown) => void) => (chain(cb, {}), fake),
			addButton: (cb: (c: unknown) => void) => (chain(cb, {}), fake),
		};
		addRow.render!(fake);
		add!();
		assert.deepEqual(Object.keys(settings.mediaTypes), ["books", "books-2"].filter((k) => k in settings.mediaTypes));
		assert.equal(Object.keys(settings.mediaTypes).length, 2);
		assert.deepEqual(last(changes), { save: "now", redraw: true });

		const remove = find(defs, "Remove library", "Books");
		remove.render!(fake);
		add!();
		assert.equal(settings.mediaTypes.books, undefined);
	});

	test("move puts an element at its new index and ignores bad indices", () => {
		const a = [1, 2, 3, 4];
		move(a, 0, 2);
		assert.deepEqual(a, [2, 3, 1, 4]);
		move(a, 9, 0);
		assert.deepEqual(a, [2, 3, 1, 4]);
		move(a, 3, -5);
		assert.deepEqual(a, [4, 2, 3, 1]);
	});
});
