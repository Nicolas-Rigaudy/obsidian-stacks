import "./obsidian-shim.ts";
import { CoverPickerModal } from "../../src/views/coverPicker.ts";
import { DEFAULT_SETTINGS } from "../../src/settings/settings.ts";
document.body.classList.add("theme-dark");
const config = DEFAULT_SETTINGS.mediaTypes.book;
const note: any = { path: "x.md", title: "The Blighted Stars", category: "book", cover: null, frontmatter: { author: "Megan E. O'Keefe" }, series: null, status: "wishlist", facet: "book", rating: null, progress: null };
const host: any = { settings: DEFAULT_SETTINGS, app: { metadataCache: { getFirstLinkpathDest: () => null }, vault: { getResourcePath: () => "" } }, actions: {} };
new CoverPickerModal(host.app, host, config, note).open();
setTimeout(() => ((window as any).__ready = true), 9000);
