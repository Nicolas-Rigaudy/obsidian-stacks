import { debounce, Events, type EventRef, type Plugin } from "obsidian";
import { isInFolder } from "../logic/parseNote.ts";
import type { StacksSettings } from "../settings/settings.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { listNotes } from "./vaultReader.ts";

/**
 * Per-library note lists, kept in sync with the vault.
 *
 * Any metadata change inside a library's folder (including edits made outside
 * Obsidian, e.g. by Syncthing) marks that library dirty. Dirty libraries are
 * rebuilt from the metadata cache after a short quiet period, then "changed"
 * fires. Consumers call get() on each change instead of keeping a copy, so
 * nobody holds a stale snapshot (the Dataview staleness problem).
 */
export class LiveIndex extends Events {
	private readonly plugin: Plugin;
	private readonly getSettings: () => StacksSettings;
	private readonly lists = new Map<string, MediaNote[]>();
	private readonly dirty = new Set<string>();
	private readonly scheduleRebuild: () => void;

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
			this.markAll();
		});
		this.plugin.registerEvent(firstResolve);
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
