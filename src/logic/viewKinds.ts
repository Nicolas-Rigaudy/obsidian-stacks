// The four screens, and parsing of ```stacks``` embed blocks. Pure.

export type ViewKind = "shelf" | "board" | "list" | "upnext";

export const VIEW_KINDS: readonly ViewKind[] = ["shelf", "board", "list", "upnext"];

export const VIEW_LABELS: Record<ViewKind, string> = {
	shelf: "Shelf",
	board: "Board",
	list: "List",
	upnext: "Up next",
};

const ALIASES: Record<string, ViewKind> = {
	shelf: "shelf",
	shelves: "shelf",
	gallery: "shelf",
	board: "board",
	kanban: "board",
	list: "list",
	table: "list",
	upnext: "upnext",
	"up-next": "upnext",
	"up next": "upnext",
	next: "upnext",
};

export interface BlockParams {
	view: ViewKind;
	/** Null = the first enabled library. */
	library: string | null;
	/** Null = every status. */
	statuses: string[] | null;
	errors: string[];
}

/**
 * ```stacks
 * view: shelf          (shelf | board | list | upnext; default shelf)
 * library: book        (optional)
 * status: backlog, reading   (optional)
 * ```
 */
export function parseBlockParams(source: string): BlockParams {
	const params: BlockParams = { view: "shelf", library: null, statuses: null, errors: [] };
	for (const raw of source.split("\n")) {
		const line = raw.trim();
		if (line === "" || line.startsWith("#")) continue;
		const m = /^([A-Za-z_-]+)\s*:\s*(.*)$/.exec(line);
		if (!m) {
			params.errors.push(`Can't read "${line}". Use "key: value".`);
			continue;
		}
		const key = m[1].toLowerCase();
		const value = m[2].trim();
		if (key === "view") {
			const kind = ALIASES[value.toLowerCase()];
			if (kind) params.view = kind;
			else params.errors.push(`Unknown view "${value}". Use shelf, board, list or upnext.`);
		} else if (key === "library") {
			params.library = value || null;
		} else if (key === "status" || key === "statuses") {
			const list = value.split(",").map((s) => s.trim()).filter((s) => s !== "");
			params.statuses = list.length > 0 ? list : null;
		} else {
			params.errors.push(`Unknown option "${m[1]}". Options: view, library, status.`);
		}
	}
	return params;
}
