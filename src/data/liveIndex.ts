import { debounce, Events, type EventRef, type Plugin } from "obsidian";
import { isInFolder } from "../logic/parseNote.ts";
import { ReadyGate } from "../logic/readyGate.ts";
import type { StacksSettings } from "../settings/settings.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { listNotes } from "./vaultReader.ts";

/** Show the library anyway this long after the layout is ready, if "resolved" never came. */
const READY_FALLBACK_MS = 5000;

/**
 * Per-library note lists, kept in sync with the vault.
 *
 * Any metadata change inside a library's folder (including edits made outside
 * Obsidian, e.g. by Syncthing) marks that library dirty. Dirty libraries are
 * rebuilt from the metadata cache after a short quiet period, then "changed"
 * fires. Consumers call get() on each change instead of keeping a copy, so
 * nobody holds a stale snapshot (the Dataview staleness problem).
 *
 * At startup the cache fills in over a moment: until it has resolved once,
 * `ready` is false and views show a loading state instead of a partial shelf.
 */
export class LiveIndex extends Events {
	private readonly plugin: Plugin;
	private readonly getSettings: () => StacksSettings;
	private readonly lists = new Map<string, MediaNote[]>();
	private readonly dirty = new Set<string>();
	private readonly scheduleRebuild: () => void;
	/** Opens when the cache has resolved once (or the fallback/rescan says so); rebuilds everything. */
	private readonly gate = new ReadyGate(() => this.markAll());

	constructor(plugin: Plugin, getSettings: () => StacksSettings) {
		super();
		this.plugin = plugin;
		this.getSettings = getSettings;
		// Reset the timer on every event so a burst of external edits rebuilds once.
		this.scheduleRebuild = debounce(() => this.rebuildDirty(), 150, true);
	}

	start(): void {
		const { app } = this.plugin;
		this.plugin.registerEvent(app.metadataCache.on("changed", (file) => this.markPath(file.path)));
		// Deletes and renames can move whole folders in or out: just rebuild everything.
		this.plugin.registerEvent(app.vault.on("delete", () => this.markAll()));
		this.plugin.registerEvent(app.vault.on("rename", () => this.markAll()));
		// Until the cache finishes its first full pass, early reads may be partial.
		const firstResolve = app.metadataCache.on("resolved", () => {
			app.metadataCache.offref(firstResolve);
			this.gate.open();
		});
		this.plugin.registerEvent(firstResolve);
		if (app.workspace.layoutReady) {
			// Enabled mid-session: the cache is already complete.
			this.gate.open();
		} else {
			// "resolved" may have fired before we listened: don't wait forever.
			app.workspace.onLayoutReady(() => {
				const timer = window.setTimeout(() => this.gate.open(), READY_FALLBACK_MS);
				this.plugin.register(() => window.clearTimeout(timer));
			});
		}
	}

	/** False until the metadata cache has resolved once after startup. */
	get ready(): boolean {
		return this.gate.isOpen;
	}

	/** Current notes of a library (built on first use). Treat as read-only. */
	get(id: string): readonly MediaNote[] {
		if (!this.lists.has(id)) this.build(id);
		return this.lists.get(id) ?? [];
	}

	/** Subscribe to rebuilds. The callback gets the ids of the libraries that changed. */
	onChanged(callback: (ids: string[]) => void): EventRef {
		return this.on("changed", (...data: unknown[]) => callback(data[0] as string[]));
	}

	/** Rebuild every library from the metadata cache now (the "Rescan libraries" command). */
	rescan(): void {
		this.lists.clear();
		if (!this.gate.open()) this.markAll();
	}

	/** Call after settings are saved: folders, fields or statuses may have changed. */
	settingsChanged(): void {
		for (const id of this.lists.keys()) {
			if (!(id in this.getSettings().mediaTypes)) this.lists.delete(id);
		}
		this.markAll();
	}

	private markPath(path: string): void {
		for (const [id, config] of Object.entries(this.getSettings().mediaTypes)) {
			if (config.enabled && isInFolder(path, config.folder)) this.dirty.add(id);
		}
		if (this.dirty.size > 0) this.scheduleRebuild();
	}

	private markAll(): void {
		for (const id of Object.keys(this.getSettings().mediaTypes)) this.dirty.add(id);
		this.scheduleRebuild();
	}

	private build(id: string): void {
		const config = this.getSettings().mediaTypes[id];
		if (config?.enabled) this.lists.set(id, listNotes(this.plugin.app, config));
		else this.lists.delete(id);
	}

	private rebuildDirty(): void {
		const ids = [...this.dirty];
		this.dirty.clear();
		for (const id of ids) this.build(id);
		if (ids.length > 0) this.trigger("changed", ids);
	}
}
