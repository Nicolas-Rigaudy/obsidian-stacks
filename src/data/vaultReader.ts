import type { App } from "obsidian";
import { isInFolder, parseNote } from "../logic/parseNote.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";

/** Every note of one library, read from the metadata cache (no Dataview). */
export function listNotes(app: App, config: MediaTypeConfig): MediaNote[] {
	const notes: MediaNote[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		if (!isInFolder(file.path, config.folder)) continue;
		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		const note = parseNote(file.path, file.basename, fm, config);
		if (note) notes.push({ ...note, added: file.stat.ctime });
	}
	return notes;
}
