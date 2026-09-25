// What the in-progress "stage" shows for games: one device per platform, with
// the games being played on it. Pure: zero `obsidian` imports.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { creatorOf } from "./cardText.ts";
import { compareShelfOrder } from "./shelf.ts";
import { bucketOf } from "./upNext.ts";
import { slugify } from "./values.ts";

export type DeviceKind = "switch" | "pc" | "handheld" | "console";

/** Which device to draw for a platform name. */
export function deviceKind(platform: string | null): DeviceKind {
	const s = slugify(platform ?? "");
	if (/switch|nintendo/.test(s)) return "switch";
	if (/^pc$|^pc-|steam|windows|^mac|linux/.test(s)) return "pc";
	if (/miyoo|anbernic|retroid|handheld|game-?boy|^rg-?\d/.test(s)) return "handheld";
	return "console";
}

export type CartridgeKind = "switch" | "gba" | "gb" | "ds" | "3ds";

/**
 * Which real cartridge a platform's games are drawn as on the shelf, or null
 * for boxed platforms (PC, consoles). Retro handhelds like the Miyoo mostly
 * play Game Boy Advance games, so they default to GBA cartridges.
 */
export function cartridgeKind(platform: string | null): CartridgeKind | null {
	const s = slugify(platform ?? "");
	if (/switch/.test(s)) return "switch";
	if (/(^|-)3ds|new-3ds|2ds/.test(s)) return "3ds";
	if (/(^|-)n?ds(-|$)|nintendo-ds/.test(s)) return "ds";
	if (/advance|(^|-)gba(-|$)|miyoo|anbernic|retroid|rg-?\d/.test(s)) return "gba";
	if (/game-?boy|(^|-)gbc?(-|$)/.test(s)) return "gb";
	return null;
}

export interface DeviceSlot {
	platform: string;
	kind: DeviceKind;
	/** In-progress games on this platform, library order. */
	playing: MediaNote[];
}

const NO_PLATFORM = "Other";

/**
 * Devices with a game in progress first (by platform name), then the library's
 * most-used other platforms, switched off, up to `minDevices` in total, so
 * there's always somewhere to drop a game.
 */
export function stageDevices(notes: readonly MediaNote[], config: MediaTypeConfig, minDevices = 3): DeviceSlot[] {
	const platformOf = (n: MediaNote) => creatorOf(n, config) ?? NO_PLATFORM;
	const byPlatform = new Map<string, MediaNote[]>();
	for (const n of notes) {
		if (bucketOf(n.status, config) !== "active") continue;
		const p = platformOf(n);
		byPlatform.set(p, [...(byPlatform.get(p) ?? []), n]);
	}
	const slots: DeviceSlot[] = [...byPlatform.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([platform, playing]) => ({ platform, kind: deviceKind(platform), playing: playing.sort(compareShelfOrder) }));

	const counts = new Map<string, number>();
	for (const n of notes) {
		const p = creatorOf(n, config);
		if (p !== null) counts.set(p, (counts.get(p) ?? 0) + 1);
	}
	const idle = [...counts.entries()]
		.filter(([p]) => !byPlatform.has(p))
		.sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b));
	for (const [platform] of idle) {
		if (slots.length >= minDevices) break;
		slots.push({ platform, kind: deviceKind(platform), playing: [] });
	}
	return slots;
}
