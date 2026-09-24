// Deterministic looks for books without cover art and for spines in a pile:
// the same title always gets the same colour and width. Pure.

/** FNV-1a, 32-bit. */
export function hashString(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Hue 0..359 for a cloth binding. */
export function bindingHue(key: string): number {
	return hashString(key) % 360;
}

/** An integer in [min, max], stable per key (spine widths, slight tilts). */
export function stableRange(key: string, min: number, max: number): number {
	if (max <= min) return min;
	return min + (hashString(`${key}#range`) % (max - min + 1));
}
