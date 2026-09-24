// What the views' buttons, drags and menus do. Every write to a note goes
// through one queue per note, so rapid clicks apply in order against the value
// the previous click left (the stale-button bug can't come back from the UI side).

import { Notice, type App, type TFile } from "obsidian";
import { SerialQueue } from "../logic/serialQueue.ts";
import { bucketOf, firstStatusOf } from "../logic/upNext.ts";
import type { MediaTypeConfig, StatusBucket } from "../types/mediaConfig.ts";
import { appendLog } from "./activityLog.ts";
import { bumpProgress, setProgress, setStatus, type ProgressChange } from "./frontmatterWriter.ts";

export class LibraryActions {
	private readonly app: App;
	private readonly queue = new SerialQueue();

	constructor(app: App) {
		this.app = app;
	}

	/** Move a note to `status`; logs "Started"/"Finished" when it enters an active/done bucket. */
	async changeStatus(path: string, config: MediaTypeConfig, status: string): Promise<void> {
		await this.run(path, "change the status", async (file) => {
			const previous = await setStatus(this.app, file, config, status);
			if (previous === status) return;
			const was = bucketOf(previous, config);
			const now = bucketOf(status, config);
			if (now === "active" && was !== "active") await appendLog(this.app, file, config, { kind: "started" });
			if (now === "done" && was !== "done") await appendLog(this.app, file, config, { kind: "finished" });
		});
	}

	start(path: string, config: MediaTypeConfig): Promise<void> {
		return this.toBucket(path, config, "active");
	}

	finish(path: string, config: MediaTypeConfig): Promise<void> {
		return this.toBucket(path, config, "done");
	}

	/** Add pages (negative to go back). Resolves to the new value, or null on failure. */
	bump(path: string, config: MediaTypeConfig, delta: number): Promise<number | null> {
		return this.run(path, "update progress", async (file) =>
			this.logProgress(file, config, await bumpProgress(this.app, file, config, delta)),
		);
	}

	/** Set an exact value (the typed correction). */
	correct(path: string, config: MediaTypeConfig, value: number): Promise<number | null> {
		return this.run(path, "update progress", async (file) =>
			this.logProgress(file, config, await setProgress(this.app, file, config, value), "corrected"),
		);
	}

	private async logProgress(
		file: TFile,
		config: MediaTypeConfig,
		change: ProgressChange | null,
		note?: string,
	): Promise<number | null> {
		if (!change) return null;
		if (change.value !== change.previous) {
			await appendLog(this.app, file, config, { kind: "progress", value: change.value, note });
		}
		return change.value;
	}

	private toBucket(path: string, config: MediaTypeConfig, bucket: StatusBucket): Promise<void> {
		const status = firstStatusOf(config, bucket);
		if (status === null) {
			new Notice(`Stacks: ${config.label} has no "${bucket}" status. Add one in Settings → Stacks.`);
			return Promise.resolve();
		}
		return this.changeStatus(path, config, status);
	}

	private async run<T>(path: string, what: string, task: (file: TFile) => Promise<T>): Promise<T | null> {
		try {
			return await this.queue.run(path, async () => {
				const file = this.app.vault.getFileByPath(path);
				if (!file) throw new Error(`${path} no longer exists.`);
				return task(file);
			});
		} catch (err) {
			console.error("Stacks:", err);
			new Notice(`Stacks: couldn't ${what}. ${err instanceof Error ? err.message : String(err)}`);
			return null;
		}
	}
}
