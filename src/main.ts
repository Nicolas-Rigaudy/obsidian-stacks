import { ItemView, Plugin, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_STACKS_HELLO = "stacks-hello-view";

/**
 * Phase 0 hello-world view. Its only job is to prove that a standalone
 * ItemView opens in its own leaf from a ribbon icon — confirming the whole
 * build -> deploy -> enable loop works before any real feature code lands.
 */
class StacksHelloView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_STACKS_HELLO;
	}

	getDisplayText(): string {
		return "Stacks";
	}

	getIcon(): string {
		return "layers";
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("stacks-hello");
		container.createEl("h2", { text: "Stacks" });
		container.createEl("p", {
			text: "Hello world — a standalone ItemView is rendering in its own leaf.",
		});
		container.createEl("p", {
			cls: "stacks-hello-meta",
			text: "Phase 0 milestone: the build → deploy → enable loop works.",
		});
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}

export default class StacksPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(
			VIEW_TYPE_STACKS_HELLO,
			(leaf) => new StacksHelloView(leaf),
		);

		this.addRibbonIcon("layers", "Open Stacks", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-stacks-hello",
			name: "Open Stacks (hello world)",
			callback: () => void this.activateView(),
		});
	}

	async onunload(): Promise<void> {
		// Obsidian detaches this plugin's leaves automatically on unload.
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		const existing = workspace.getLeavesOfType(VIEW_TYPE_STACKS_HELLO);
		if (existing.length > 0) {
			workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = workspace.getLeaf(true);
		await leaf.setViewState({
			type: VIEW_TYPE_STACKS_HELLO,
			active: true,
		});
		workspace.revealLeaf(leaf);
	}
}
