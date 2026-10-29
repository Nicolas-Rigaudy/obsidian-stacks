import { describe, test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { PRESETS } from "../src/settings/presets.ts";
import { DEFAULT_SETTINGS, type StacksSettings } from "../src/settings/settings.ts";

registerHooks({
	resolve: (specifier, context, next) =>
		specifier === "obsidian" ? { url: new URL("./stubs/obsidian.ts", import.meta.url).href, shortCircuit: true } : next(specifier, context),
});
const { Events } = await import("./stubs/obsidian.ts");
const { LiveIndex } = await import("../src/data/liveIndex.ts");

interface FakeFile { path: string; basename: string; stat: { ctime: number } }

/** A vault whose metadata cache the test edits by hand, as an outside editor would. */
function fakeVault(layoutReady = true) {
	const files: FakeFile[] = [];
	const frontmatter = new Map<string, Record<string, unknown>>();
	const metadataCache = Object.assign(new Events(), { getFileCache: (f: FakeFile) => ({ frontmatter: frontmatter.get(f.path) }) });
	const vault = Object.assign(new Events(), { getMarkdownFiles: () => files });
	const app = { metadataCache, vault, workspace: { layoutReady, onLayoutReady: () => {} } };
	const plugin = { app, registerEvent: () => {}, register: () => {} };
	const write = (path: string, fm: Record<string, unknown>): FakeFile => {
		let file = files.find((f) => f.path === path);
		if (!file) files.push((file = { path, basename: path.split("/").pop()!.replace(/\.md$/, ""), stat: { ctime: 0 } }));
		frontmatter.set(path, fm);
		return file;
	};
	return { plugin, metadataCache, vault, files, write };
}

const settings: StacksSettings = { ...DEFAULT_SETTINGS, mediaTypes: { books: { ...PRESETS.find((p) => p.id === "books")!.build(), folder: "Books" } } };
const book = (status: string) => ({ category: "book", title: "Dracula", status });

describe("live index: edits made outside Obsidian reach the views", () => {
	beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
	afterEach(() => mock.timers.reset());

	function setup() {
		const v = fakeVault();
		const file = v.write("Books/Dracula.md", book("backlog"));
		const index = new LiveIndex(v.plugin as never, () => settings);
		index.start();
		mock.timers.tick(200);
		const changes: string[][] = [];
		index.onChanged((ids) => changes.push(ids));
		return { ...v, file, index, changes };
	}

	test("a changed note in a library folder rebuilds that library with the new value", () => {
		const { index, metadataCache, write, changes } = setup();
		assert.equal(index.get("books")[0].status, "backlog");
		metadataCache.trigger("changed", write("Books/Dracula.md", book("reading")));
		mock.timers.tick(200);
		assert.deepEqual(changes, [["books"]]);
		assert.equal(index.get("books")[0].status, "reading");
	});

	test("a burst of changes rebuilds once, after the quiet period", () => {
		const { metadataCache, file, changes } = setup();
		for (let i = 0; i < 10; i++) {
			metadataCache.trigger("changed", file);
			mock.timers.tick(100);
		}
		assert.equal(changes.length, 0);
		mock.timers.tick(100);
		assert.equal(changes.length, 1);
	});

	test("a change outside every library folder does nothing", () => {
		const { metadataCache, write, changes } = setup();
		metadataCache.trigger("changed", write("Journal/Today.md", {}));
		mock.timers.tick(200);
		assert.equal(changes.length, 0);
	});

	test("a new note, a delete and a rename all show up", () => {
		const { index, metadataCache, vault, files, write, changes } = setup();
		metadataCache.trigger("changed", write("Books/Emma.md", { category: "book", title: "Emma", status: "read" }));
		mock.timers.tick(200);
		assert.equal(index.get("books").length, 2);
		const gone = files.splice(0, 1)[0];
		vault.trigger("delete", gone);
		mock.timers.tick(200);
		assert.deepEqual(index.get("books").map((n) => n.title), ["Emma"]);
		files[0].path = "Elsewhere/Emma.md";
		vault.trigger("rename", files[0], "Books/Emma.md");
		mock.timers.tick(200);
		assert.equal(index.get("books").length, 0);
		assert.equal(changes.length, 3);
	});
});

describe("live index: cold start", () => {
	test("not ready until the metadata cache has resolved, then every library rebuilds", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		try {
			const v = fakeVault(false);
			v.write("Books/Dracula.md", book("reading"));
			const index = new LiveIndex(v.plugin as never, () => settings);
			const changes: string[][] = [];
			index.onChanged((ids) => changes.push(ids));
			index.start();
			assert.equal(index.ready, false);
			v.metadataCache.trigger("resolved");
			assert.equal(index.ready, true);
			mock.timers.tick(200);
			assert.deepEqual(changes, [["books"]]);
			assert.equal(index.get("books").length, 1);
		} finally {
			mock.timers.reset();
		}
	});
});

describe("live index: settings changes", () => {
	test("a field remapped in settings shows on the next rebuild, without an edit to the note", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		try {
			const v = fakeVault();
			v.write("Books/Dracula.md", { ...book("reading"), page: 140, pages_total: 418 });
			const books = { ...PRESETS.find((p) => p.id === "books")!.build(), folder: "Books" };
			const own: StacksSettings = { ...DEFAULT_SETTINGS, mediaTypes: { books } };
			const index = new LiveIndex(v.plugin as never, () => own);
			index.start();
			mock.timers.tick(200);
			assert.notEqual(index.get("books")[0].progress?.current, 140);
			books.progress = { ...books.progress!, currentField: "page" };
			index.settingsChanged();
			mock.timers.tick(200);
			assert.equal(index.get("books")[0].progress?.current, 140);
		} finally {
			mock.timers.reset();
		}
	});
});
