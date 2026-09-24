// Frontmatter value coercion. YAML hands back strings, numbers, nulls or lists
// depending on how a field was typed, so every read goes through these.

/** Trimmed non-empty string, or null (`series: ""` counts as no series). */
export function toStr(v: unknown): string | null {
	if (typeof v === "string") {
		const t = v.trim();
		return t === "" ? null : t;
	}
	if (typeof v === "number" && Number.isFinite(v)) return String(v);
	return null;
}

/** Finite number, or null. Accepts numeric strings (`position: "2"`). */
export function toNum(v: unknown): number | null {
	if (typeof v === "number") return Number.isFinite(v) ? v : null;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

/** Local-time YYYY-MM-DD, matching the vault's date fields. */
export function todayISO(now: Date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
