// Settings and note data for the preview pages. `?data=vault` uses the pre-0.3
// vault libraries and the private snapshots; the default is the sample vault.
import { DEFAULT_SETTINGS, type StacksSettings } from "../../src/settings/settings.ts";
import { BOOK_CONFIG, GAME_CONFIG, WATCHING_CONFIG } from "../../src/settings/legacy.ts";
import { PRESETS } from "../../src/settings/presets.ts";
import type { MediaTypeConfig } from "../../src/types/mediaConfig.ts";

export interface Snapshot { path: string; basename: string; fm: Record<string, unknown> }

const vault = new URLSearchParams(location.search).get("data") === "vault";

const preset = (id: string, folder: string): MediaTypeConfig => ({ ...PRESETS.find((p) => p.id === id)!.build(), folder });

export const settings: StacksSettings = {
	...DEFAULT_SETTINGS,
	mediaTypes: vault
		? { book: BOOK_CONFIG, game: GAME_CONFIG, watching: WATCHING_CONFIG }
		: { book: preset("books", "Books"), game: preset("games", "Games"), watching: preset("watching", "Watching") },
};

function readJson(file: string): any {
	const xhr = new XMLHttpRequest();
	xhr.open("GET", file, false);
	xhr.send();
	return JSON.parse(xhr.responseText);
}

/** Notes of a library: `sample.json` (from `node sample.mts`), or the vault snapshots. */
export function snapshots(lib: string, demo = false): Snapshot[] {
	if (!vault) return readJson("sample.json")[lib] ?? [];
	const file = { book: "books", game: demo ? "games-demo" : "games", watching: demo ? "media-demo" : "media" }[lib];
	return file ? readJson(`${file}.json`) : [];
}
