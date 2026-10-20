// A new library note from a catalogue result, in the same shape as the notes
// already in the vault (fields, heading, cover block, log section). Pure.

import type { Candidate } from "../catalog/parse.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import { todayISO } from "./values.ts";

/** Which catalogue fits a category. */
export type CatalogKind = "book" | "game" | "series" | "anime" | "film";

export function catalogKind(category: string): CatalogKind {
	if (category === "game") return "game";
	if (category === "series") return "series";
	if (category === "anime") return "anime";
	if (category === "movie" || category === "film") return "film";
	return "book"; // book, bd, manga...
}

export interface NewNoteInput {
	config: MediaTypeConfig;
	category: string;
	candidate: Candidate;
	status: string;
	/** Games: the platform to record (the creator field). */
	platform?: string | null;
	/** The cover actually verified (may differ from candidate.covers[0]). */
	cover: string | null;
	/** Adding a volume from a series panel: its series and position. */
	series?: { name: string; position: number } | null;
	/** Text of the library's template file, when it has one and it could be read. */
	template?: string | null;
	/** Today as YYYY-MM-DD (the {{date}} placeholder). */
	today?: string;
}

/** `{{name}}` placeholders a template may use. */
export const TEMPLATE_PLACEHOLDERS = ["title", "creator", "category", "status", "cover", "year", "isbn", "link", "platform", "total", "date"] as const;

/** Fill `{{name}}` (any case, spaces allowed); unknown names are left as typed. */
export function fillTemplate(text: string, vars: Record<string, string>): string {
	return text.replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (whole, name: string) => vars[name.toLowerCase()] ?? whole);
}

/** A template's own frontmatter (raw lines, grouped by top-level key) and its body. */
export function splitTemplate(text: string): { fields: Array<{ key: string; lines: string[] }>; body: string } {
	const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
	if (!m) return { fields: [], body: text };
	const fields: Array<{ key: string; lines: string[] }> = [];
	for (const line of m[1].split(/\r?\n/)) {
		const k = /^([A-Za-z0-9_-]+):/.exec(line);
		if (k) fields.push({ key: k[1], lines: [line] });
		else if (fields.length > 0) fields[fields.length - 1].lines.push(line);
	}
	return { fields, body: text.slice(m[0].length) };
}

const HEADING_ICON: Record<string, string> = { book: "📖", bd: "📗", game: "🎮", movie: "🎬", series: "📺", anime: "🍥" };

const yaml = (v: unknown): string => {
	if (v === null || v === undefined || v === "") return "";
	if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(String(x))).join(", ")}]`;
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	return JSON.stringify(String(v));
};

/** Unsafe file-name characters out, colons as " -" (matches the vault's existing names). */
export function safeFileName(title: string): string {
	return title.replace(/:/g, " -").replace(/[\\/*?"<>|#^[\]]/g, "").replace(/\s+/g, " ").trim().replace(/\.+$/, "").slice(0, 110) || "Untitled";
}

/** A name not in `taken`: "Title", then "Title (2019)", then "Title 2", "Title 3"... */
export function uniqueFileName(title: string, year: number | null, taken: (name: string) => boolean): string {
	const base = safeFileName(title);
	if (!taken(base)) return base;
	if (year !== null && !taken(`${base} (${year})`)) return `${base} (${year})`;
	for (let i = 2; ; i++) if (!taken(`${base} ${i}`)) return `${base} ${i}`;
}

export function buildNewNote(input: NewNoteInput): string {
	const { config, category, candidate: c, status } = input;
	const extras = config.newNotes?.[category]?.extras ?? {};
	const fm: Array<[string, unknown]> = [];
	const put = (k: string, v: unknown) => {
		if (!k || fm.some(([x]) => x === k)) return;
		fm.push([k, v]);
	};

	// Only what the library's own extras name: nothing assumes a vault convention.
	if ("type" in extras) put("type", extras.type);
	if ("area" in extras) put("area", extras.area);
	put(config.categoryField, category);
	put(config.titleField, c.title);
	if (config.creatorField) {
		if (config.appearance === "games") put(config.creatorField, input.platform ?? null);
		else put(config.creatorField, c.creators.length > 1 ? c.creators : c.creators[0] ?? null);
	}
	put(config.coverField, input.cover);
	put(config.statusField, status);
	if (config.startedField) put(config.startedField, null);
	if (config.finishedField) put(config.finishedField, null);
	put(config.ratingField, null);
	const p = config.progress;
	if (p && (p.categories.length === 0 || p.categories.includes(category))) {
		put(p.currentField, 0);
		put(p.totalField, c.total);
	}
	put("year", c.year);
	if (c.isbn) put("isbn", c.isbn);
	if (config.series && (input.series || catalogKind(category) === "book")) {
		put(config.series.seriesField, input.series?.name ?? null);
		put(config.series.positionField, input.series?.position ?? null);
	}
	for (const [k, v] of Object.entries(extras)) if (k !== "type" && k !== "area") put(k, v);

	// Simple lowercase words are bare in the vault's notes (`type: log`, `status: backlog`); titles and the rest quoted.
	const value = (k: string, v: unknown) => (k !== config.titleField && typeof v === "string" && /^[a-z][a-z0-9_-]*$/.test(v) ? v : yaml(v));
	const creator = config.appearance === "games" ? input.platform : c.creators.join(", ");
	const vars: Record<string, string> = {
		title: c.title,
		creator: creator ?? "",
		category,
		status,
		cover: input.cover ?? "",
		year: c.year === null ? "" : String(c.year),
		isbn: c.isbn ?? "",
		link: c.link ?? "",
		platform: input.platform ?? "",
		total: c.total === null ? "" : String(c.total),
		date: input.today ?? todayISO(),
	};

	const tpl = input.template ? splitTemplate(input.template) : null;
	const lines = ["---", ...fm.map(([k, v]) => `${k}: ${value(k, v)}`)];
	// Fields only the template names (its own tags, aliases...) are kept after ours.
	for (const f of tpl?.fields ?? []) if (!fm.some(([k]) => k === f.key)) lines.push(...f.lines.map((l) => fillTemplate(l, vars)));
	lines.push("---", "");
	if (tpl) {
		lines.push(fillTemplate(tpl.body, vars).replace(/^\s*\n/, "").replace(/\s*$/, ""), "");
		return lines.join("\n");
	}

	lines.push(`# ${HEADING_ICON[category] ?? "📄"} ${c.title}`, "");
	if (input.cover) lines.push(`![cover|240](${input.cover})`, "");
	if (creator && config.creatorLabel) lines.push(`**${config.creatorLabel}:** ${creator}`);
	if (c.link) lines.push(`**Source:** ${c.link}`);
	lines.push("");
	if (config.logSection) {
		lines.push(`## ${config.logSection.heading}`, "<!-- dated entries, newest last: `- Started [date:: YYYY-MM-DD]`, `- Finished [date:: YYYY-MM-DD]`. -->", "");
	}
	return lines.join("\n");
}
