import type { ViewKind } from "../../logic/viewKinds.ts";
import type { LibraryRenderer, RenderOptions, StacksHost } from "../shared.ts";
import { BoardRenderer } from "./BoardRenderer.ts";
import { ListRenderer } from "./ListRenderer.ts";
import { ShelfRenderer } from "./ShelfRenderer.ts";
import { UpNextRenderer } from "./UpNextRenderer.ts";

export function createRenderer(kind: ViewKind, host: StacksHost, el: HTMLElement, options: RenderOptions): LibraryRenderer {
	switch (kind) {
		case "shelf":
			return new ShelfRenderer(host, el, options);
		case "board":
			return new BoardRenderer(host, el, options);
		case "list":
			return new ListRenderer(host, el, options);
		case "upnext":
			return new UpNextRenderer(host, el, options);
	}
}
