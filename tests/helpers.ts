import type { MediaNote } from "../src/types/mediaNote.ts";

/** A book-shaped MediaNote with sensible defaults for tests. */
export function note(
	title: string,
	status: string,
	series?: { name: string; position?: number | null; positionEnd?: number | null },
): MediaNote {
	return {
		path: `Books/${title}.md`,
		title,
		category: "book",
		facet: "book",
		status,
		cover: null,
		rating: null,
		progress: null,
		series: series
			? { name: series.name, position: series.position ?? null, positionEnd: series.positionEnd ?? null }
			: null,
		frontmatter: {},
	};
}

export const titles = (notes: MediaNote[]) => notes.map((n) => n.title);
