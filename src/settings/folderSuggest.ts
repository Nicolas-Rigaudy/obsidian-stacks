import { AbstractInputSuggest, type App, type TFolder } from "obsidian";

/** Folder autocomplete for a settings text field. */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private readonly vaultApp: App;
	private readonly onPick: (path: string) => void;

	constructor(app: App, inputEl: HTMLInputElement, onPick: (path: string) => void) {
		super(app, inputEl);
		this.vaultApp = app;
		this.onPick = onPick;
	}

	protected getSuggestions(query: string): TFolder[] {
		const q = query.toLowerCase();
		return this.vaultApp.vault
			.getAllFolders(false)
			.filter((f) => f.path.toLowerCase().includes(q))
			.slice(0, 50);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.setValue(folder.path);
		this.onPick(folder.path);
		this.close();
	}
}
