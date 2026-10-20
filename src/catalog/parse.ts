// Catalogue results → one Candidate shape. Pure: the network lives in
// providers.ts; these parse the JSON each service returns (tested against
// saved real responses in tests/fixtures).

import { slugify } from "../logic/values.ts";

export type CatalogSource = "openlibrary" | "steam" | "wikipedia" | "tvmaze" | "kitsu" | "manual";

export interface Candidate {
	source: CatalogSource;
	/** The source's own id (Open Library work key, Steam app id, TVmaze show id...). */
	id: string;
	title: string;
	creators: string[];
	year: number | null;
	/** Cover URLs, best first. Some are filled in later by `enrich` (Steam portrait art, Wikipedia box art). */
	covers: string[];
	/** Pages or episodes, when the source says. */
	total: number | null;
	isbn: string | null;
	/** Where to read more (shown as the source in the picker). */
	link: string | null;
	/** Extra facts worth showing ("TV", "Movie", "Apple TV"...). */
	note: string | null;
}

type Json = Record<string, unknown>;
const isRec = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const yearOf = (v: unknown): number | null => {
	const m = /^(\d{4})/.exec(str(v) ?? "");
	return m ? Number(m[1]) : null;
};

/** Some catalogue titles come wrapped in literal quote marks. */
const unquote = (t: string | null): string | null => (t ? t.replace(/^["“”«»'\s]+|["“”«»'\s]+$/g, "") || null : null);

/** What the person typed, when no catalogue has it: a note to fill in by hand. */
export function manualCandidate(title: string): Candidate {
	return { source: "manual", id: title, title: title.trim(), creators: [], year: null, covers: [], total: null, isbn: null, link: null, note: null };
}

/** Open Library search.json → books. Covers by cover id (never by ISBN: that endpoint is rate-limited). */
export function parseOpenLibrary(json: unknown): Candidate[] {
	const docs = isRec(json) && Array.isArray(json.docs) ? json.docs : [];
	return docs.filter(isRec).flatMap((d) => {
		const title = unquote(str(d.title));
		if (!title) return [];
		const cover = num(d.cover_i);
		const isbns = Array.isArray(d.isbn) ? d.isbn.map(str).filter((x): x is string => x !== null) : [];
		const key = str(d.key) ?? title;
		return [{
			source: "openlibrary" as const,
			id: key,
			title,
			creators: Array.isArray(d.author_name) ? d.author_name.map(str).filter((x): x is string => x !== null) : [],
			year: num(d.first_publish_year),
			covers: cover ? [`https://covers.openlibrary.org/b/id/${cover}-L.jpg`] : [],
			total: num(d.number_of_pages_median),
			isbn: isbns.find((i) => i.length === 13) ?? isbns[0] ?? null,
			link: `https://openlibrary.org${key.startsWith("/") ? key : `/${key}`}`,
			note: null,
		}];
	});
}

/** Steam storesearch → games (apps only). The portrait cover is resolved later. */
export function parseSteamSearch(json: unknown): Candidate[] {
	const items = isRec(json) && Array.isArray(json.items) ? json.items : [];
	return items.filter(isRec).flatMap((it) => {
		const title = str(it.name);
		const id = num(it.id);
		if (!title || id === null || (it.type !== undefined && it.type !== "app")) return [];
		return [{
			source: "steam" as const,
			id: String(id),
			title,
			creators: [],
			year: null,
			covers: [steamPortrait(id)],
			total: null,
			isbn: null,
			link: `https://store.steampowered.com/app/${id}`,
			note: "PC (Steam)",
		}];
	});
}

export function steamPortrait(appId: number | string): string {
	return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
}

/** TVmaze search/shows → series. The aired episode count is fetched on selection. */
export function parseTvmazeSearch(json: unknown): Candidate[] {
	const rows = Array.isArray(json) ? json : [];
	return rows.filter(isRec).flatMap((r) => {
		const show = isRec(r.show) ? r.show : null;
		const title = show ? str(show.name) : null;
		if (!show || !title) return [];
		const image = isRec(show.image) ? str(show.image.original) ?? str(show.image.medium) : null;
		const channel = isRec(show.network) ? str(show.network.name) : isRec(show.webChannel) ? str(show.webChannel.name) : null;
		return [{
			source: "tvmaze" as const,
			id: String(num(show.id) ?? title),
			title,
			creators: channel ? [channel] : [],
			year: yearOf(show.premiered),
			covers: image ? [image] : [],
			total: null,
			isbn: null,
			link: str(show.url),
			note: channel,
		}];
	});
}

/** Episodes aired on or before `today` (TVmaze lists announced ones too). */
export function countAiredEpisodes(json: unknown, today: string): number {
	const eps = Array.isArray(json) ? json : [];
	return eps.filter((e) => isRec(e) && typeof e.airdate === "string" && e.airdate !== "" && e.airdate <= today).length;
}

/** Kitsu anime search → anime (TV, films, OVAs). */
export function parseKitsu(json: unknown): Candidate[] {
	const data = isRec(json) && Array.isArray(json.data) ? json.data : [];
	return data.filter(isRec).flatMap((d) => {
		const a = isRec(d.attributes) ? d.attributes : null;
		const canonical = a ? str(a.canonicalTitle) : null;
		const titles = a && isRec(a.titles) ? a.titles : {};
		// English title when there is one (the vault uses English titles), the romanised one otherwise.
		// ...unless the English one is a stylised all-caps logotype ("DAN DA DAN").
		const english = str(titles.en) ?? str(titles.en_us);
		const title = english && /\p{Ll}/u.test(english) ? english : canonical ?? english;
		if (!a || !title) return [];
		const poster = isRec(a.posterImage) ? str(a.posterImage.large) ?? str(a.posterImage.original) : null;
		const subtype = str(a.subtype);
		const slug = str(a.slug);
		return [{
			source: "kitsu" as const,
			id: typeof d.id === "string" || typeof d.id === "number" ? String(d.id) : title,
			title,
			creators: [],
			year: yearOf(a.startDate),
			covers: poster ? [poster] : [],
			total: num(a.episodeCount),
			isbn: null,
			link: slug ? `https://kitsu.app/anime/${slug}` : null,
			note: [subtype ? (subtype === "movie" ? "Film" : subtype) : null, canonical && canonical !== title ? canonical : null].filter(Boolean).join(" · ") || null,
		}];
	});
}

/** Wikipedia search → article titles (games off Steam, films). Box art comes from the infobox on selection. */
export function parseWikipediaSearch(json: unknown): Candidate[] {
	const q = isRec(json) && isRec(json.query) && Array.isArray(json.query.search) ? json.query.search : [];
	return q.filter(isRec).flatMap((r) => {
		const title = str(r.title);
		// Articles about the work, not lists, soundtracks, novels or franchises.
		if (!title || /^List of |\((?:[^)]*\s)?(?:soundtrack|album|song|novel|book|franchise|comics|character)\)$/i.test(title)) return [];
		const snippet = (str(r.snippet) ?? "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
		return [{
			source: "wikipedia" as const,
			id: title,
			title: title.replace(/\s*\((?:video game|film|\d{4} film|\d{4} video game)\)$/i, ""),
			creators: [],
			year: yearOf((/\b(19|20)\d{2}\b/.exec(snippet) ?? [""])[0]),
			covers: [],
			total: null,
			isbn: null,
			link: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
			note: snippet.slice(0, 90) || null,
		}];
	});
}

/** The file name in an infobox's image/cover field, or null (logos and SVGs are not box art). */
export function infoboxImage(wikitext: string): string | null {
	const m = /\|\s*(?:image|cover)\s*=\s*(?:\[\[)?(?:File:|Image:)?([^\n|\]]+\.(?:jpe?g|png|webp))/i.exec(wikitext);
	if (!m) return null;
	const file = m[1].trim();
	return /logo|wordmark|icon/i.test(file) ? null : file;
}

const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };

/** Lowercase words, punctuation gone, standalone roman numerals as digits ("Hades II" → "hades 2"). */
function norm(s: string): string {
	return slugify(s).split("-").map((w) => ROMAN[w] ?? w).join(" ");
}

/** 0..1 similarity (Dice coefficient on character bigrams), with and without spaces ("Dan da dan" ≈ "Dandadan"). */
export function similarity(a: string, b: string): number {
	return Math.max(dice(norm(a), norm(b)), dice(norm(a).replace(/ /g, ""), norm(b).replace(/ /g, "")));
}

function dice(x: string, y: string): number {
	if (x === y) return 1;
	if (x.length < 2 || y.length < 2) return 0;
	const grams = (s: string) => {
		const m = new Map<string, number>();
		for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
		return m;
	};
	const gx = grams(x), gy = grams(y);
	let overlap = 0;
	for (const [g, n] of gx) overlap += Math.min(n, gy.get(g) ?? 0);
	return (2 * overlap) / (x.length - 1 + (y.length - 1));
}

/** Best matches first: title similarity to the query, then having a cover, then recency. */
export function rankCandidates(query: string, list: Candidate[]): Candidate[] {
	const q = query.split(/\s+[-–·|]\s+|\s+by\s+/i)[0];
	return list
		.map((c, i) => ({ c, i, s: similarity(q, c.title) + (norm(c.title).startsWith(norm(q)) ? 0.15 : 0) }))
		.sort((a, b) => b.s - a.s || Number(b.c.covers.length > 0) - Number(a.c.covers.length > 0) || a.i - b.i)
		.map(({ c }) => c);
}

/**
 * Merge the results of several catalogues searched at once. One failing source
 * is fine (the others still answer), but if every source failed, rethrow the
 * first error: "Nothing found" would hide that the network is down.
 */
export function mergeSettled(results: readonly PromiseSettledResult<Candidate[]>[]): Candidate[] {
	const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
	if (results.length > 0 && failed.length === results.length) throw failed[0].reason;
	return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

/** A catalogue failure in words a reader can act on (offline, rate limit, server down, odd answer). */
export function catalogErrorMessage(err: unknown): string {
	const raw = err instanceof Error ? err.message : String(err);
	if (/net::ERR_|ENOTFOUND|EAI_AGAIN|ECONN(REFUSED|RESET)|ETIMEDOUT|Failed to fetch|NetworkError/i.test(raw)) {
		return "Couldn't reach the catalogue. Check the connection and try again.";
	}
	const http = /^(\S+) answered (\d{3})$/.exec(raw);
	if (http) {
		const [, host, code] = http;
		if (code === "429") return `${host} is limiting requests. Wait a minute and try again.`;
		if (code.startsWith("5")) return `${host} is having trouble (${code}). Try again later.`;
	}
	return raw;
}
