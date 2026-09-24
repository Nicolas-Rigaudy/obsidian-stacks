// What a `cover` value points at. Pure; views resolve vault links to files.

export type CoverRef = { kind: "url"; url: string } | { kind: "vault"; link: string };

/** A URL, or a vault link (`[[img.jpg]]`, `![[img.jpg|200]]`, `Attachments/img.jpg`). */
export function parseCoverRef(raw: string | null): CoverRef | null {
	if (raw === null) return null;
	const v = raw.trim();
	if (v === "") return null;
	if (/^(https?:|data:|app:|file:)/i.test(v)) return { kind: "url", url: v };
	const link = v.replace(/^!?\[\[/, "").replace(/\]\]$/, "").split("|")[0].trim();
	return link === "" ? null : { kind: "vault", link };
}
