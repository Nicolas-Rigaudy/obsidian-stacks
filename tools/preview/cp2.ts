import "./obsidian-shim.ts";
import { CoverPickerModal } from "../../src/views/coverPicker.ts";
import { DEFAULT_SETTINGS } from "../../src/settings/settings.ts";
document.body.classList.add("theme-dark");
const note: any = { path: "x.md", title: "Mistborn: The Final Empire", category: "book", cover: "https://covers.openlibrary.org/b/id/11329782-L.jpg", frontmatter: { author: "Brandon Sanderson" }, series: null, status: "wishlist", facet: "book", rating: null, progress: null };
const host: any = { settings: DEFAULT_SETTINGS, app: { metadataCache: { getFirstLinkpathDest: () => null }, vault: { getResourcePath: () => "" } }, actions: {} };
new CoverPickerModal(host.app, host, DEFAULT_SETTINGS.mediaTypes.book, note).open();
setTimeout(() => ((window as any).__ready = true), 12000);
