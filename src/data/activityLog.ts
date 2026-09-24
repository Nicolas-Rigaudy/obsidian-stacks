import type { App, TFile } from "obsidian";
import { formatLogLine, insertLogLine } from "../logic/logSection.ts";
import { todayISO } from "../logic/values.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";

export type LogEvent =
	| { kind: "started" | "finished" }
	| { kind: "progress"; value: number; note?: string };

/**
 * Append a dated line to the library's log section (e.g. "## Reading log").
 * vault.process is atomic against concurrent edits. No-op if the library has no log section.
 */
export async function appendLog(
	app: App,
	file: TFile,
	config: MediaTypeConfig,
	event: LogEvent,
	today: string = todayISO(),
): Promise<void> {
	const log = config.logSection;
	if (!log) return;

	let line: string;
	if (event.kind === "progress") {
		line = formatLogLine(log.progressLine, {
			value: event.value,
			unit: config.progress?.unitLabel ?? "",
			date: today,
		});
		if (event.note) line += ` — ${event.note}`;
	} else {
		line = formatLogLine(event.kind === "started" ? log.startedLine : log.finishedLine, { date: today });
	}

	await app.vault.process(file, (content) => insertLogLine(content, log.heading, line));
}
