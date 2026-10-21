import { type App, debounce, type Plugin, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import type { MediaNote } from "../types/mediaNote.ts";
import { type Change, SettingsModel } from "./settingDefinitions.ts";
import type { StacksSettings } from "./settings.ts";

/** What the tab needs from the plugin (avoids importing main.ts). */
export interface SettingsHost extends Plugin {
	settings: StacksSettings;
	saveSettings(): Promise<void>;
	index: { get(id: string): readonly MediaNote[] };
}

/** The settings tab, rendered by Obsidian from `getSettingDefinitions` (1.13+). */
export class StacksSettingTab extends PluginSettingTab {
	private readonly host: SettingsHost;
	private readonly model: SettingsModel;
	/** Text edits save after typing pauses; structural edits save immediately. */
	private readonly saveSoon = debounce(() => void this.host.saveSettings(), 500, true);

	constructor(app: App, host: SettingsHost) {
		super(app, host);
		this.host = host;
		this.model = new SettingsModel({
			settings: host.settings,
			index: host.index,
			folderExists: (path) => path === "" || this.app.vault.getFolderByPath(path) !== null,
			changed: (change) => this.onChanged(change),
		});
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return this.model.definitions();
	}

	getControlValue(key: string): unknown {
		return this.model.getValue(key);
	}

	setControlValue(key: string, value: unknown): void {
		this.model.setValue(key, value);
	}

	private onChanged(change: Change): void {
		if (change.save === "now") void this.host.saveSettings();
		else this.saveSoon();
		if (change.redraw) this.update();
		else if (change.refresh) this.refreshDomState();
	}
}
