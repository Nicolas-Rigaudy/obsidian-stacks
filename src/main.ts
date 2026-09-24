import { Plugin } from "obsidian";
import { LiveIndex } from "./data/liveIndex.ts";
import { mergeSettings, type StacksSettings } from "./settings/settings.ts";
import { StacksSettingTab } from "./settings/settingsTab.ts";
import { IndexStatusView, VIEW_TYPE_INDEX_STATUS } from "./views/IndexStatusView.ts";

export default class StacksPlugin extends Plugin {
	settings: StacksSettings = mergeSettings(null);
	index!: LiveIndex;

	async onload(): Promise<void> {
		this.settings = mergeSettings(await this.loadData());
		this.index = new LiveIndex(this, () => this.settings);
		this.index.start();

		this.registerView(VIEW_TYPE_INDEX_STATUS, (leaf) => new IndexStatusView(leaf, this));
		this.addRibbonIcon("layers", "Open Stacks", () => void this.openStatusView());
		this.addCommand({
			id: "open-library-status",
			name: "Open library status",
			callback: () => void this.openStatusView(),
		});
		this.addSettingTab(new StacksSettingTab(this.app, this));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.index.settingsChanged();
	}

	private async openStatusView(): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_INDEX_STATUS)[0];
		if (existing) {
			await workspace.revealLeaf(existing);
			return;
		}
		const leaf = workspace.getLeaf(true);
		await leaf.setViewState({ type: VIEW_TYPE_INDEX_STATUS, active: true });
		await workspace.revealLeaf(leaf);
	}
}
