// Plain-words hints for a library's settings, from the notes it currently finds.
// Pure: zero `obsidian` imports.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";

const sample = (values: string[]) => {
	const unique = [...new Set(values)];
	return unique.slice(0, 3).map((v) => `“${v}”`).join(", ") + (unique.length > 3 ? ", …" : "");
};

/** What the user should look at: empty list when the library looks fine. */
export function libraryHints(config: MediaTypeConfig, notes: readonly MediaNote[], folderExists: boolean): string[] {
	const hints: string[] = [];
	if (config.folder !== "" && !folderExists) {
		hints.push(`The folder “${config.folder}” does not exist in this vault.`);
		return hints;
	}
	if (notes.length === 0) {
		const where = config.folder === "" ? "the vault" : `“${config.folder}”`;
		const cats = config.categoryValues.length > 0 ? ` with ${config.categoryField} ${config.categoryValues.join(" or ")}` : "";
		hints.push(`No notes found in ${where}${cats}. Check the folder, the category field and its values.`);
		return hints;
	}
	const noStatus = notes.filter((n) => n.status === null).length;
	if (noStatus > 0) hints.push(`${noStatus} of ${notes.length} notes have no “${config.statusField}” field, so they sit outside the board.`);
	const known = new Set(config.statuses.map((s) => s.value));
	const unknown = notes.flatMap((n) => (n.status !== null && !known.has(n.status) ? [n.status] : []));
	if (unknown.length > 0) hints.push(`${unknown.length} notes use a status not listed below (${sample(unknown)}); they sit outside the board.`);
	return hints;
}
