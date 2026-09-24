// The in-progress "stage" at the top of the Shelf and Up next, per library look:
// books → the reading desk; games → the devices they're played on; films → a TV.

import { secondaryLine } from "../logic/cardText.ts";
import { compareShelfOrder } from "../logic/shelf.ts";
import { stageDevices, type DeviceSlot } from "../logic/stage.ts";
import { bucketOf, firstStatusOf } from "../logic/upNext.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { renderDesk } from "./desk.ts";
import { Menu } from "obsidian";
import { acceptNoteDrops, makeInteractive, resolveCover, type StacksHost } from "./shared.ts";

export interface StageOptions {
	libraryId: string;
	/** Renderer root, for drag state. */
	root: HTMLElement;
	/** Accept dropped notes and start them. */
	droppable: boolean;
	/** Which item each screen features when several are in progress (kept across re-renders). */
	featured: Map<string, string>;
	/** Re-render after switching the featured item. */
	refresh: () => void;
}

export function renderStage(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, notes: readonly MediaNote[], opts: StageOptions): void {
	if (config.appearance === "books") {
		renderDesk(parent, host, config, notes, {
			libraryId: opts.libraryId,
			root: opts.root,
			emptyText: "Nothing in progress. Drag one onto the desk to start it.",
			droppable: opts.droppable,
		});
		return;
	}
	const activeStatus = config.statuses.find((s) => s.bucket === "active");
	if (!activeStatus) return;
	const section = parent.createDiv({ cls: `stacks-section stacks-stage is-${config.appearance}` });
	const active = notes.filter((n) => bucketOf(n.status, config) === "active");
	const h = section.createDiv({ cls: "stacks-heading" });
	h.createSpan({ text: `${activeStatus.label || activeStatus.value} now` });
	if (active.length > 0) h.createSpan({ cls: "stacks-heading-count", text: String(active.length) });

	if (config.appearance === "games") renderDevices(section, host, config, notes, opts);
	else renderTv(section, host, config, active.sort(compareShelfOrder), opts);

	if (opts.droppable) {
		const start = firstStatusOf(config, "active");
		acceptNoteDrops(section, (path) => {
			const note = host.index.get(opts.libraryId).find((n) => n.path === path);
			if (start && note && bucketOf(note.status, config) !== "active") void host.actions.changeStatus(path, config, start);
		});
	}
}

/**
 * A screen showing one item: its cover blurred behind as backlight, the art in
 * front, a title bar; tiles to switch when several are in progress; "off" when
 * nothing is.
 */
function renderScreen(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, items: MediaNote[], key: string, idleText: string, opts: StageOptions): MediaNote | null {
	const screen = parent.createDiv({ cls: "stacks-screen" });
	if (items.length === 0) {
		screen.addClass("is-off");
		screen.createDiv({ cls: "stacks-screen-idle", text: idleText });
		return null;
	}
	const featuredPath = opts.featured.get(key);
	const current = items.find((n) => n.path === featuredPath) ?? items[0];
	const src = resolveCover(host.app, current);
	if (src) {
		screen.createDiv({ cls: "stacks-screen-glow" }).style.setProperty("background-image", `url("${src.replace(/"/g, "%22")}")`);
		screen.createEl("img", { cls: "stacks-screen-art", attr: { src, alt: current.title, draggable: "false" } });
	} else {
		screen.addClass("is-blank");
	}
	const bar = screen.createDiv({ cls: "stacks-screen-bar" });
	bar.createDiv({ cls: "stacks-screen-title", text: current.title });
	const sub = secondaryLine(current, config);
	if (sub) bar.createDiv({ cls: "stacks-screen-sub", text: sub });
	makeInteractive(screen, host, config, current);

	if (items.length > 1) {
		const tiles = screen.createDiv({ cls: "stacks-screen-tiles" });
		for (const n of items) {
			const tile = tiles.createEl("button", { cls: "stacks-screen-tile", attr: { "aria-label": `Show ${n.title}` } });
			tile.toggleClass("is-current", n === current);
			const t = resolveCover(host.app, n);
			if (t) tile.createEl("img", { attr: { src: t, alt: "", draggable: "false" } });
			else tile.setText(n.title.slice(0, 1));
			tile.addEventListener("click", (evt) => {
				evt.stopPropagation();
				opts.featured.set(key, n.path);
				opts.refresh();
			});
		}
	}
	return current;
}

/**
 * How a session ends: one clear main action (the first done status: Finished,
 * Watched, Read) and a "Stop …" menu with the other ways out, each with its
 * meaning spelled out (Played: stopped, might come back; Dropped: not going
 * back; back to the backlog).
 */
export function renderSessionControls(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, note: MediaNote, withDone = true): void {
	const row = parent.createDiv({ cls: "stacks-session" });
	const done = config.statuses.find((s) => s.bucket === "done");
	if (withDone && done) {
		const b = row.createEl("button", { cls: "stacks-button is-primary", text: `✓ ${done.label || done.value}` });
		b.setAttr("aria-label", `${note.title}: ${done.label || done.value}${done.hint ? ` (${done.hint})` : ""}`);
		b.addEventListener("click", () => void host.actions.changeStatus(note.path, config, done.value));
	}
	const activeAt = config.statuses.findIndex((s) => s.bucket === "active");
	const active = config.statuses[activeAt];
	const exits = [
		...config.statuses.filter((s, i) => i > activeAt && s.bucket === "other"),
		...config.statuses.filter((s) => s.bucket === "backlog").slice(0, 1),
	];
	if (exits.length === 0) return;
	const stop = row.createEl("button", { cls: "stacks-button", text: `Stop ${(active?.label || "this").toLowerCase()} ▾` });
	stop.addEventListener("click", (evt) => {
		const menu = new Menu();
		for (const s of exits) {
			const name = s.bucket === "backlog" ? `Back to ${(s.label || s.value).toLowerCase()}` : s.label || s.value;
			menu.addItem((i) =>
				i
					.setTitle(s.hint ? `${name} — ${s.hint}` : name)
					.setIcon(s.bucket === "backlog" ? "undo-2" : s.value === "dropped" ? "x-circle" : "pause-circle")
					.onClick(() => void host.actions.changeStatus(note.path, config, s.value)),
			);
		}
		menu.showAtMouseEvent(evt);
	});
}

/** −1 / "Episode 3 of 12" / +1, for items that track progress (series, anime). */
function renderEpisodes(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, note: MediaNote): void {
	const p = config.progress;
	if (!p || !note.progress) return;
	const total = note.progress.total;
	const box = parent.createDiv({ cls: "stacks-episodes" });
	const minus = box.createEl("button", { cls: "stacks-button is-round", text: "−", attr: { "aria-label": "One episode back" } });
	const label = box.createSpan({ cls: "stacks-episodes-label" });
	const plus = box.createEl("button", { cls: "stacks-button is-round", text: "+", attr: { "aria-label": "Next episode" } });
	const unit = p.unitLabel === "episodes" ? "Episode" : p.unitLabel || "Progress";
	const show = (v: number) => label.setText(total !== null ? `${unit} ${v} of ${total}` : `${unit} ${v}`);
	show(note.progress.current);
	const step = p.quickIncrements.find((n) => n > 0) ?? 1;
	for (const [btn, delta] of [[minus, -step], [plus, step]] as const) {
		// No disabling: the per-note queue applies every click in order.
		btn.addEventListener("click", () => void host.actions.bump(note.path, config, delta).then((r) => r !== null && show(r)));
	}
}

function renderDevices(section: HTMLElement, host: StacksHost, config: MediaTypeConfig, notes: readonly MediaNote[], opts: StageOptions): void {
	const row = section.createDiv({ cls: "stacks-devices" });
	for (const slot of stageDevices(notes, config)) renderDevice(row, host, config, slot, opts);
}

function renderDevice(row: HTMLElement, host: StacksHost, config: MediaTypeConfig, slot: DeviceSlot, opts: StageOptions): void {
	const wrap = row.createDiv({ cls: `stacks-device-wrap is-${slot.kind}` });
	const device = wrap.createDiv({ cls: `stacks-device is-${slot.kind}` });
	const key = `device:${slot.platform}`;
	const idle = "Drag a game here to play";

	let current: MediaNote | null = null;
	if (slot.kind === "switch") {
		device.createDiv({ cls: "stacks-joycon is-left" }).createDiv({ cls: "stacks-joycon-stick" });
		const body = device.createDiv({ cls: "stacks-switch-body" });
		current = renderScreen(body, host, config, slot.playing, key, idle, opts);
		device.createDiv({ cls: "stacks-joycon is-right" }).createDiv({ cls: "stacks-joycon-stick" });
	} else if (slot.kind === "handheld") {
		// Miyoo Mini-style: screen on top, d-pad and an X/Y/A/B diamond, select/start/menu below.
		current = renderScreen(device.createDiv({ cls: "stacks-handheld-bezel" }), host, config, slot.playing, key, idle, opts);
		const pad = device.createDiv({ cls: "stacks-handheld-pad" });
		pad.createDiv({ cls: "stacks-dpad" });
		const face = pad.createDiv({ cls: "stacks-face" });
		for (const b of ["x", "y", "a", "b"]) face.createDiv({ cls: `stacks-face-btn is-${b}`, text: b.toUpperCase() });
		const small = device.createDiv({ cls: "stacks-handheld-small" });
		for (const b of ["select", "start", "menu"]) small.createDiv({ cls: `stacks-small-btn is-${b}` });
	} else {
		current = renderScreen(device.createDiv({ cls: "stacks-monitor" }), host, config, slot.playing, key, idle, opts);
		device.createDiv({ cls: "stacks-monitor-neck" });
		device.createDiv({ cls: "stacks-monitor-base" });
	}

	const caption = wrap.createDiv({ cls: "stacks-device-caption" });
	caption.createDiv({ cls: "stacks-device-name", text: slot.platform });
	if (current) renderSessionControls(caption, host, config, current);
}

function renderTv(section: HTMLElement, host: StacksHost, config: MediaTypeConfig, active: MediaNote[], opts: StageOptions): void {
	const room = section.createDiv({ cls: "stacks-tv-room" });
	const tv = room.createDiv({ cls: "stacks-tv" });
	const current = renderScreen(tv.createDiv({ cls: "stacks-tv-bezel" }), host, config, active, "tv", "No signal · drag something here to watch it", opts);
	tv.createDiv({ cls: "stacks-tv-led" }).toggleClass("is-on", current !== null);
	const feet = tv.createDiv({ cls: "stacks-tv-feet" });
	feet.createDiv();
	feet.createDiv();
	// The media cabinet the TV stands on: top, two doors with handles.
	const cabinet = room.createDiv({ cls: "stacks-tv-cabinet" });
	for (let i = 0; i < 2; i++) cabinet.createDiv({ cls: "stacks-tv-door" });
	if (current) {
		const remote = room.createDiv({ cls: "stacks-remote" });
		remote.createDiv({ cls: "stacks-remote-dot" });
		renderEpisodes(remote, host, config, current);
		renderSessionControls(remote, host, config, current);
	}
}
