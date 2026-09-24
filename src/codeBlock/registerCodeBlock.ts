import type { Plugin } from "obsidian";
import { parseBlockParams } from "../logic/viewKinds.ts";
import { createRenderer } from "../views/renderers/index.ts";
import { defaultLibraryId, type StacksHost } from "../views/shared.ts";

/**
 * ```stacks
 * view: shelf | board | list | upnext
 * library: book            (optional)
 * status: backlog, reading (optional)
 * filter: anime            (optional)
 * ```
 * Mounts the same renderer as the full tab, inline in the note.
 */
export function registerCodeBlock(plugin: Plugin, host: StacksHost): void {
	plugin.registerMarkdownCodeBlockProcessor("stacks", (source, el, ctx) => {
		const params = parseBlockParams(source);
		if (params.errors.length > 0) {
			const box = el.createDiv({ cls: "stacks-block-error" });
			box.createEl("strong", { text: "Stacks block" });
			for (const e of params.errors) box.createDiv({ text: e });
		}
		const libraryId = params.library ?? defaultLibraryId(host.settings);
		if (!libraryId) {
			el.createDiv({ cls: "stacks-empty", text: "No library is enabled. Turn one on in Settings → Stacks." });
			return;
		}
		ctx.addChild(createRenderer(params.view, host, el.createDiv(), { libraryId, statuses: params.statuses, category: params.filter, embedded: true }));
	});
}
