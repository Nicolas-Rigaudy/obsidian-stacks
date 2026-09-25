// Network side of the catalogue: search and enrich per source, with Obsidian's
// requestUrl (no CORS limits, works on mobile). Parsing is in parse.ts.

import { requestUrl } from "obsidian";
import type { CatalogKind } from "../logic/newNote.ts";
import { todayISO } from "../logic/values.ts";
import {
	countAiredEpisodes,
	infoboxImage,
	parseKitsu,
	parseOpenLibrary,
	parseSteamSearch,
	parseTvmazeSearch,
	parseWikipediaSearch,
	rankCandidates,
	steamPortrait,
	type Candidate,
} from "./parse.ts";

const HEADERS = { "Api-User-Agent": "Stacks Obsidian plugin (personal library)" };

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
	const r = await requestUrl({ url, headers: { ...HEADERS, ...headers }, throw: false });
	if (r.status >= 400) throw new Error(`${new URL(url).hostname} answered ${r.status}`);
	return r.json;
}

/** A real image: 200, an image type, and more than a placeholder pixel's worth of bytes. */
export async function checkImage(url: string): Promise<boolean> {
	try {
		const r = await requestUrl({ url, throw: false });
		const type = r.headers["content-type"] ?? r.headers["Content-Type"] ?? "";
		return r.status === 200 && type.startsWith("image/") && r.arrayBuffer.byteLength > 5000;
	} catch {
		return false;
	}
}

const q = encodeURIComponent;

/** Search the catalogue that fits the kind; results ranked by title match. */
export async function searchCatalog(kind: CatalogKind, query: string): Promise<Candidate[]> {
	const term = query.trim();
	if (term.length < 2) return [];
	const settle = async (jobs: Promise<Candidate[]>[]) =>
		(await Promise.allSettled(jobs)).flatMap((r) => (r.status === "fulfilled" ? r.value : []));

	let list: Candidate[] = [];
	if (kind === "book") {
		const fields = "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn";
		const isbn = term.replace(/[^0-9Xx]/g, "");
		const url = /^(\d{9}[\dXx]|\d{13})$/.test(isbn)
			? `https://openlibrary.org/search.json?isbn=${isbn}&fields=${fields}`
			: `https://openlibrary.org/search.json?q=${q(term)}&limit=15&fields=${fields}`;
		list = parseOpenLibrary(await getJson(url));
	} else if (kind === "game") {
		list = await settle([
			getJson(`https://store.steampowered.com/api/storesearch/?term=${q(term)}&cc=FR&l=english`).then(parseSteamSearch),
			wikiSearch(`${term} video game`),
		]);
	} else if (kind === "series") {
		list = parseTvmazeSearch(await getJson(`https://api.tvmaze.com/search/shows?q=${q(term)}`));
	} else if (kind === "anime") {
		list = parseKitsu(await getJson(`https://kitsu.io/api/edge/anime?filter%5Btext%5D=${q(term)}&page%5Blimit%5D=12`, { Accept: "application/vnd.api+json" }));
	} else {
		list = await settle([
			wikiSearch(`${term} film`),
			getJson(`https://kitsu.io/api/edge/anime?filter%5Btext%5D=${q(term)}&filter%5Bsubtype%5D=movie&page%5Blimit%5D=5`, { Accept: "application/vnd.api+json" }).then(parseKitsu),
		]);
	}
	return rankCandidates(term, list).slice(0, 18);
}

async function wikiSearch(term: string): Promise<Candidate[]> {
	return parseWikipediaSearch(await getJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=6&format=json&origin=*&srsearch=${q(term)}`));
}

/** Box art from a Wikipedia article's infobox (non-free images aren't in the page-image API). */
export async function wikipediaBoxArt(article: string): Promise<string | null> {
	const parsed = (await getJson(`https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&section=0&redirects=1&format=json&origin=*&page=${q(article)}`)) as { parse?: { wikitext?: { "*"?: string } } };
	const file = infoboxImage(parsed.parse?.wikitext?.["*"] ?? "");
	if (!file) return null;
	const info = (await getJson(`https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&origin=*&titles=${q(`File:${file}`)}`)) as { query?: { pages?: Record<string, { imageinfo?: Array<{ url?: string }> }> } };
	const url = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0]?.url?.replace(/\?utm_[^#]*$/, "") ?? null;
	return url && (await checkImage(url)) ? url : null;
}

/** Steam portrait art: the standard path, or the exact file from the store's asset list. */
async function steamCover(appId: string): Promise<string | null> {
	const plain = steamPortrait(appId);
	if (await checkImage(plain)) return plain;
	const input = JSON.stringify({ ids: [{ appid: Number(appId) }], context: { language: "english", country_code: "FR" }, data_request: { include_assets: true } });
	const d = (await getJson(`https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${q(input)}`)) as { response?: { store_items?: Array<{ assets?: { asset_url_format?: string; library_capsule_2x?: string } }> } };
	const a = d.response?.store_items?.[0]?.assets;
	if (!a?.asset_url_format || !a.library_capsule_2x) return null;
	const url = `https://shared.akamai.steamstatic.com/store_item_assets/${a.asset_url_format.replace(/\$\{FILENAME\}.*/, "")}${a.library_capsule_2x}`;
	return (await checkImage(url)) ? url : null;
}

/**
 * Fill in what search results don't carry: verified cover (Steam portrait,
 * Wikipedia box art), aired episode count (TVmaze).
 */
export async function enrichCandidate(c: Candidate): Promise<Candidate> {
	const out = { ...c, covers: [...c.covers] };
	try {
		if (c.source === "steam") {
			const cover = await steamCover(c.id);
			out.covers = cover ? [cover] : [];
		} else if (c.source === "wikipedia") {
			const cover = await wikipediaBoxArt(c.id);
			out.covers = cover ? [cover] : [];
		} else if (c.source === "tvmaze") {
			out.total = countAiredEpisodes(await getJson(`https://api.tvmaze.com/shows/${q(c.id)}/episodes`), todayISO()) || null;
		}
	} catch {
		// keep what the search gave
	}
	return out;
}

/** More covers for one book: the covers of its other editions (Open Library). */
export async function editionCovers(workKey: string): Promise<string[]> {
	try {
		const d = (await getJson(`https://openlibrary.org${workKey}/editions.json?limit=40`)) as { entries?: Array<{ covers?: number[] }> };
		const ids = new Set<number>();
		for (const e of d.entries ?? []) for (const id of e.covers ?? []) if (id > 0) ids.add(id);
		return [...ids].slice(0, 24).map((id) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`);
	} catch {
		return [];
	}
}
