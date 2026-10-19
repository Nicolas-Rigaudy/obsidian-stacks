import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	countAiredEpisodes,
	catalogErrorMessage,
	infoboxImage,
	manualCandidate,
	mergeSettled,
	parseKitsu,
	parseOpenLibrary,
	parseSteamSearch,
	parseTvmazeSearch,
	parseWikipediaSearch,
	rankCandidates,
	similarity,
	steamPortrait,
} from "../src/catalog/parse.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("catalogue parsers (real responses)", () => {
	test("Open Library: title, authors, year, pages, ISBN-13, cover by id (not by ISBN)", () => {
		const [c] = parseOpenLibrary(fixture("openlibrary-search.json"));
		assert.equal(c.title, "The Final Empire");
		assert.deepEqual(c.creators, ["Brandon Sanderson"]);
		assert.equal(c.year, 2001);
		assert.equal(c.total, 669);
		assert.equal(c.isbn, "9781484428627");
		assert.equal(c.covers[0], "https://covers.openlibrary.org/b/id/14658160-L.jpg");
		assert.equal(c.link, "https://openlibrary.org/works/OL5738148W");
	});

	test("Steam: apps with their portrait art URL", () => {
		const list = parseSteamSearch(fixture("steam-search.json"));
		assert.deepEqual(list.map((c) => c.title).slice(0, 2), ["Hades II", "Hades"]);
		assert.equal(list[1].covers[0], steamPortrait(1145360));
		assert.equal(list[1].link, "https://store.steampowered.com/app/1145360");
	});

	test("TVmaze: series with poster, year and channel; aired episodes only", () => {
		const [c] = parseTvmazeSearch(fixture("tvmaze-search.json"));
		assert.equal(c.title, "Severance");
		assert.equal(c.year, 2022);
		assert.equal(c.note, "Apple TV");
		assert.match(c.covers[0], /original_untouched/);
		assert.equal(countAiredEpisodes(fixture("tvmaze-episodes.json"), "2026-09-25"), 3);
	});

	test("Kitsu: anime with poster, episodes and type; English title unless it's an all-caps logotype", () => {
		const [c] = parseKitsu(fixture("kitsu-search.json"));
		assert.equal(c.title, "Dandadan");
		assert.equal(c.total, 12);
		assert.equal(c.year, 2024);
		assert.equal(c.note, "TV");
		const [f] = parseKitsu({ data: [{ id: "1", attributes: { canonicalTitle: "Sousou no Frieren", titles: { en: "Frieren: Beyond Journey's End" } } }] });
		assert.equal(f.title, "Frieren: Beyond Journey's End");
		assert.equal(f.note, "Sousou no Frieren");
		assert.match(c.covers[0], /media\.kitsu\.app/);
	});

	test("bad or empty responses give no candidates instead of throwing", () => {
		for (const bad of [null, "", 42, {}, { docs: "x" }, [{ nope: 1 }]]) {
			assert.deepEqual(parseOpenLibrary(bad), []);
			assert.deepEqual(parseSteamSearch(bad), []);
			assert.deepEqual(parseTvmazeSearch(bad), []);
			assert.deepEqual(parseKitsu(bad), []);
			assert.deepEqual(parseWikipediaSearch(bad), []);
		}
	});
});

describe("Wikipedia", () => {
	test("search results drop the (video game) / (film) suffix", () => {
		const [c] = parseWikipediaSearch({ query: { search: [{ title: "Astral Chain (video game)", snippet: "action game released in <span>2019</span>" }] } });
		assert.equal(c.title, "Astral Chain");
		assert.equal(c.year, 2019);
		assert.equal(c.id, "Astral Chain (video game)");
	});

	test("lists, soundtracks and novels are not the work", () => {
		const list = parseWikipediaSearch({ query: { search: [
			{ title: "Dune: Part Two" }, { title: "Dune: Part Two (soundtrack)" }, { title: "List of accolades received by Dune: Part Two" }, { title: "Dune (novel)" },
		] } });
		assert.deepEqual(list.map((c) => c.title), ["Dune: Part Two"]);
	});

	test("infobox box art; logos rejected", () => {
		assert.equal(infoboxImage("{{Infobox video game\n| image = Astral_Chain.jpg\n| caption = x"), "Astral_Chain.jpg");
		assert.equal(infoboxImage("| image = [[File:Mario Kart World Cover Artwork.png|250px]]"), "Mario Kart World Cover Artwork.png");
		assert.equal(infoboxImage("| image = Dofus_logo.png"), null);
		assert.equal(infoboxImage("| image = Valorant.svg"), null);
		assert.equal(infoboxImage("no infobox"), null);
	});
});

describe("matching", () => {
	test("similarity tolerates punctuation and case", () => {
		assert.equal(similarity("Psycho Pass", "Psycho-Pass"), 1);
		assert.ok(similarity("Dan da dan", "Dandadan") > 0.7);
		assert.ok(similarity("Deathwatch: Shadowbreaker", "Deathwatch") < 0.7);
	});

	test("ranking puts the closest title first", () => {
		const list = parseSteamSearch(fixture("steam-search.json"));
		assert.equal(rankCandidates("Hades", list)[0].title, "Hades");
		assert.equal(rankCandidates("hades 2", list)[0].title, "Hades II");
	});
});

describe("mergeSettled", () => {
	const hit = manualCandidate("Hades");
	const ok = (v: typeof hit[]): PromiseSettledResult<typeof hit[]> => ({ status: "fulfilled", value: v });
	const ko = (msg: string): PromiseSettledResult<typeof hit[]> => ({ status: "rejected", reason: new Error(msg) });

	test("one source down: the others' results still come back", () => {
		assert.deepEqual(mergeSettled([ko("offline"), ok([hit])]), [hit]);
	});

	test("every source down: the error surfaces instead of an empty list", () => {
		assert.throws(() => mergeSettled([ko("first"), ko("second")]), /first/);
	});

	test("sources that answer with nothing are a real empty result", () => {
		assert.deepEqual(mergeSettled([ok([]), ok([])]), []);
	});
});

describe("catalogErrorMessage", () => {
	test("offline errors become a connection hint", () => {
		for (const raw of ["net::ERR_INTERNET_DISCONNECTED", "getaddrinfo ENOTFOUND openlibrary.org", "Failed to fetch"]) {
			assert.match(catalogErrorMessage(new Error(raw)), /Couldn't reach the catalogue/);
		}
	});

	test("rate limits and server errors name the service", () => {
		assert.match(catalogErrorMessage(new Error("openlibrary.org answered 429")), /^openlibrary\.org is limiting requests/);
		assert.match(catalogErrorMessage(new Error("api.tvmaze.com answered 503")), /^api\.tvmaze\.com is having trouble \(503\)/);
	});

	test("anything else is passed through", () => {
		assert.equal(catalogErrorMessage(new Error("kitsu.io sent an answer Stacks couldn't read")), "kitsu.io sent an answer Stacks couldn't read");
		assert.equal(catalogErrorMessage("boom"), "boom");
	});
});
