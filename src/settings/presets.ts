// Library presets: the starting point when a user adds a library from the
// settings tab. Each one is neutral (no folder, no vault-specific fields) and
// is a plain MediaTypeConfig the user can then remap. Pure: zero `obsidian` imports.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import { blankMediaTypeConfig, type StacksSettings } from "./settings.ts";

export interface LibraryPreset {
	id: string;
	label: string;
	/** One line shown next to the choice. */
	description: string;
	build(): MediaTypeConfig;
}

const note = (...tags: string[]) => ({ folder: "", extras: { tags } });

function books(): MediaTypeConfig {
	return {
		...blankMediaTypeConfig("Books"),
		appearance: "books",
		categoryValues: ["book"],
		statuses: [
			{ value: "wishlist", label: "Wishlist", bucket: "other", hint: "don't own it yet" },
			{ value: "backlog", label: "Backlog", bucket: "backlog", hint: "own it, not started" },
			{ value: "reading", label: "Reading", bucket: "active" },
			{ value: "read", label: "Read", bucket: "done", hint: "finished it" },
		],
		creatorField: "author",
		creatorLabel: "Author",
		startedField: "started",
		finishedField: "finished",
		progress: { categories: [], currentField: "pages_read", totalField: "pages_total", unitLabel: "pages", quickIncrements: [10, 25] },
		series: { seriesField: "series", positionField: "position", positionEndField: "position_end", orderedByDefault: true, exceptions: [] },
		wishlistStatus: "wishlist",
		newNotes: { book: note("book") },
	};
}

function comics(): MediaTypeConfig {
	return {
		...books(),
		label: "Comics",
		categoryValues: ["comic"],
		statuses: [
			{ value: "wishlist", label: "Wishlist", bucket: "other", hint: "don't own it yet" },
			{ value: "backlog", label: "Backlog", bucket: "backlog", hint: "own it, not started" },
			{ value: "reading", label: "Reading", bucket: "active" },
			{ value: "read", label: "Read", bucket: "done", hint: "finished it" },
		],
		progress: null,
		newNotes: { comic: note("comic") },
	};
}

function games(): MediaTypeConfig {
	return {
		...blankMediaTypeConfig("Video games"),
		appearance: "games",
		categoryValues: ["game"],
		categoryFilters: [
			{ value: "PC", label: "PC" },
			{ value: "Switch", label: "Switch" },
			{ value: "PlayStation", label: "PlayStation" },
			{ value: "Xbox", label: "Xbox" },
		],
		filterField: "platform",
		statuses: [
			{ value: "backlog", label: "Backlog", bucket: "backlog", hint: "not started" },
			{ value: "playing", label: "Playing", bucket: "active" },
			{ value: "played", label: "Played", bucket: "other", hint: "stopped, might come back" },
			{ value: "finished", label: "Finished", bucket: "done", hint: "reached the end" },
			{ value: "dropped", label: "Dropped", bucket: "other", hint: "not going back" },
		],
		creatorField: "platform",
		creatorLabel: "Platform",
		startedField: "started",
		finishedField: "finished",
		series: { seriesField: "series", positionField: "position", positionEndField: "", orderedByDefault: false, exceptions: [] },
		newNotes: { game: note("game") },
	};
}

function watching(): MediaTypeConfig {
	return {
		...blankMediaTypeConfig("Films & series"),
		appearance: "films",
		categoryValues: ["movie", "series"],
		categoryFilters: [
			{ value: "movie", label: "Films" },
			{ value: "series", label: "Series" },
		],
		statuses: [
			{ value: "backlog", label: "Backlog", bucket: "backlog", hint: "not started" },
			{ value: "watching", label: "Watching", bucket: "active" },
			{ value: "watched", label: "Watched", bucket: "done", hint: "seen it all" },
			{ value: "dropped", label: "Dropped", bucket: "other", hint: "not going back" },
		],
		creatorField: "network",
		creatorLabel: "Network",
		finishedField: "finished",
		progress: { categories: ["series"], currentField: "episodes_watched", totalField: "episodes_total", unitLabel: "episodes", quickIncrements: [1] },
		series: { seriesField: "series", positionField: "position", positionEndField: "", orderedByDefault: true, exceptions: [] },
		newNotes: { movie: note("movie"), series: note("series") },
	};
}

function anime(): MediaTypeConfig {
	return {
		...watching(),
		label: "Anime",
		categoryValues: ["anime"],
		categoryFilters: [],
		progress: { categories: [], currentField: "episodes_watched", totalField: "episodes_total", unitLabel: "episodes", quickIncrements: [1] },
		newNotes: { anime: note("anime") },
	};
}

export const PRESETS: readonly LibraryPreset[] = [
	{ id: "books", label: "Books", description: "Bookcase shelves, reading progress in pages, series in order.", build: books },
	{ id: "games", label: "Video games", description: "Game cases by platform, backlog to finished.", build: games },
	{ id: "watching", label: "Films & series", description: "Films and series with episode progress.", build: watching },
	{ id: "comics", label: "Comics", description: "Comics and graphic novels, series in order.", build: comics },
	{ id: "anime", label: "Anime", description: "Anime with episode progress.", build: anime },
];

/** A library id not yet in `settings`: "books", then "books-2", "books-3"... */
export function freshLibraryId(settings: StacksSettings, base: string): string {
	if (!(base in settings.mediaTypes)) return base;
	for (let i = 2; ; i++) if (!(`${base}-${i}` in settings.mediaTypes)) return `${base}-${i}`;
}

/** Add a library built from a preset; returns its id, or null for an unknown preset. */
export function addLibraryFromPreset(settings: StacksSettings, presetId: string): string | null {
	const preset = PRESETS.find((p) => p.id === presetId);
	if (!preset) return null;
	const id = freshLibraryId(settings, preset.id);
	settings.mediaTypes[id] = preset.build();
	return id;
}

/** Remove a library and its remembered view state. */
export function removeLibrary(settings: StacksSettings, id: string): void {
	delete settings.mediaTypes[id];
	delete settings.prefs[id];
}
