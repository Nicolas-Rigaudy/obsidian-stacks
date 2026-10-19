import { debounce, Menu, Notice, Plugin } from "obsidian";
import { registerCodeBlock } from "./codeBlock/registerCodeBlock.ts";
import { LibraryActions } from "./data/actions.ts";
import { LiveIndex } from "./data/liveIndex.ts";
import { VIEW_KINDS, VIEW_LABELS, type ViewKind } from "./logic/viewKinds.ts";
import { mergePrefs, mergeSettings, type LibraryPrefs, type StacksSettings } from "./settings/settings.ts";
import { StacksSettingTab } from "./settings/settingsTab.ts";
import { QuickAddModal } from "./views/quickAdd.ts";
import { defaultLibraryId, type StacksHost } from "./views/shared.ts";
import { StacksView, VIEW_ICONS, VIEW_TYPES } from "./views/StacksView.ts";

export default class StacksPlugin extends Plugin implements StacksHost {
	settings: StacksSettings = mergeSettings(null);
	index!: LiveIndex;
	actions!: LibraryActions;

	async onload(): Promise<void> {
		this.settings = mergeSettings(await this.loadData());
		this.index = new LiveIndex(this, () => this.settings);
		this.index.start();
		this.actions = new LibraryActions(this.app);

		for (const kind of VIEW_KINDS) {
			this.registerView(VIEW_TYPES[kind], (leaf) => new StacksView(leaf, this, kind));
			this.addCommand({
				id: `open-${kind}`,
				name: `Open ${VIEW_LABELS[kind].toLowerCase()}`,
				callback: () => void this.openView(kind),
			});
		}

		this.addRibbonIcon("library", "Stacks", (evt) => {
			const menu = new Menu();
			for (const kind of VIEW_KINDS) {
				menu.addItem((i) => i.setTitle(VIEW_LABELS[kind]).setIcon(VIEW_ICONS[kind]).onClick(() => void this.openView(kind)));
			}
			menu.showAtMouseEvent(evt);
		});

		this.addCommand({
			id: "quick-add",
			name: "Add to library…",
			callback: () => {
				const id = defaultLibraryId(this.settings);
				if (id) new QuickAddModal(this.app, this, id).open();
			},
		});
		for (const [id, config] of Object.entries(this.settings.mediaTypes)) {
			this.addCommand({
				id: `quick-add-${id}`,
				name: `Add to ${config.label}…`,
				callback: () => new QuickAddModal(this.app, this, id).open(),
			});
		}

		this.addCommand({
			id: "rescan-libraries",
			name: "Rescan libraries",
			callback: () => {
				this.index.rescan();
				new Notice("Stacks: libraries rescanned.");
			},
		});

		registerCodeBlock(this, this);
		this.addSettingTab(new StacksSettingTab(this.app, this));
	}

	prefs(libraryId: string): LibraryPrefs {
		return (this.settings.prefs[libraryId] ??= mergePrefs(undefined));
	}

	/** View preferences change often (piles, sorting): save soon, without re-indexing. */
	savePrefs = debounce(() => void this.saveData(this.settings), 800, true);

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.index.settingsChanged();
	}

	/** Focus an open tab of this screen, or open one. */
	async openView(kind: ViewKind, libraryId?: string): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPES[kind])[0];
		if (existing && libraryId === undefined) {
			await workspace.revealLeaf(existing);
			return;
		}
		const leaf = existing ?? workspace.getLeaf("tab");
		await leaf.setViewState({ type: VIEW_TYPES[kind], active: true, state: libraryId ? { library: libraryId } : {} });
		await workspace.revealLeaf(leaf);
	}
}
