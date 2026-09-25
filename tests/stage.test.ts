import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cartridgeKind, deviceKind, stageDevices } from "../src/logic/stage.ts";
import { GAME_CONFIG } from "../src/settings/settings.ts";
import type { MediaNote } from "../src/types/mediaNote.ts";
import { note } from "./helpers.ts";

const game = (title: string, status: string, platform?: string): MediaNote => ({
	...note(title, status),
	category: "game",
	frontmatter: platform ? { platform } : {},
});

describe("deviceKind", () => {
	test("real platform names in the vault", () => {
		assert.equal(deviceKind("Switch"), "switch");
		assert.equal(deviceKind("Nintendo Switch 2"), "switch");
		assert.equal(deviceKind("PC"), "pc");
		assert.equal(deviceKind("Steam Deck"), "pc");
		assert.equal(deviceKind("Miyoo"), "handheld");
		assert.equal(deviceKind("Anbernic RG35XX"), "handheld");
		assert.equal(deviceKind("PS5"), "console");
		assert.equal(deviceKind(null), "console");
	});
});

describe("cartridgeKind", () => {
	test("real cartridges per platform; boxed platforms get none", () => {
		assert.equal(cartridgeKind("Switch"), "switch");
		assert.equal(cartridgeKind("Nintendo Switch 2"), "switch");
		assert.equal(cartridgeKind("Miyoo"), "gba");
		assert.equal(cartridgeKind("Game Boy Advance"), "gba");
		assert.equal(cartridgeKind("GBA"), "gba");
		assert.equal(cartridgeKind("Game Boy"), "gb");
		assert.equal(cartridgeKind("GBC"), "gb");
		assert.equal(cartridgeKind("DS"), "ds");
		assert.equal(cartridgeKind("Nintendo DS"), "ds");
		assert.equal(cartridgeKind("3DS"), "3ds");
		assert.equal(cartridgeKind("New 3DS XL"), "3ds");
		assert.equal(cartridgeKind("PC"), null);
		assert.equal(cartridgeKind("PS5"), null);
		assert.equal(cartridgeKind(null), null);
	});
});

describe("stageDevices", () => {
	const library = [
		...Array.from({ length: 5 }, (_, i) => game(`S${i}`, "backlog", "Switch")),
		...Array.from({ length: 3 }, (_, i) => game(`P${i}`, "finished", "PC")),
		game("M0", "played", "Miyoo"),
		game("PS", "backlog", "PS5"),
	];

	test("nothing playing: the most-used platforms, switched off", () => {
		const slots = stageDevices(library, GAME_CONFIG);
		assert.deepEqual(slots.map((s) => [s.platform, s.kind, s.playing.length]), [
			["Switch", "switch", 0],
			["PC", "pc", 0],
			["Miyoo", "handheld", 0],
		]);
	});

	test("devices with a game in progress come first, with their games", () => {
		const slots = stageDevices([...library, game("Hades", "playing", "Switch"), game("Balatro", "playing", "PC"), game("Celeste", "playing", "Switch")], GAME_CONFIG);
		assert.deepEqual(slots.map((s) => s.platform), ["PC", "Switch", "Miyoo"]);
		assert.deepEqual(slots[1].playing.map((n) => n.title), ["Celeste", "Hades"]);
	});

	test("more playing platforms than the minimum are all shown", () => {
		const slots = stageDevices([game("A", "playing", "Switch"), game("B", "playing", "PC"), game("C", "playing", "PS5"), game("D", "playing", "Miyoo")], GAME_CONFIG);
		assert.equal(slots.length, 4);
	});

	test("a playing game with no platform goes on a generic console", () => {
		const slots = stageDevices([game("Mystery", "playing")], GAME_CONFIG);
		assert.deepEqual(slots.map((s) => [s.platform, s.kind]), [["Other", "console"]]);
	});
});
