## req_001_r_d_what_should_come_after_stacks_1_0_and_what_to_cut - R&D: what should come after Stacks 1.0, and what to cut
> From version: 0.1.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: R&D note on what Stacks should do after 1.0, what to prioritise, and what to cut or defer. Proposals only; nothing here is a commitment or a backlog item.
- Keywords: roadmap, prioritisation, bases, post-1.0, facets, mobile, recommendations, research
- Use when: Planning the work after the 1.0 directory submission, or revisiting road_001 milestones 1.1 to 1.3.
- Skip when: Executing a single 1.0 item.

# Needs
- Decide what comes after 1.0 and in what order, given where similar tools are heading.

# Context
Written overnight 2026-10-22, when no eligible item remained in road_001. As of that night: 0.2 to 0.4 are built, task_004 is closed, task_006 is at 95%, and what is left for 1.0 is owner work (manual checks in Obsidian, the screenshots, the first tag, the directory PR).

What similar tools do (one web search plus general knowledge, not verified in depth):
- Obsidian core Bases (properties-driven tables and cards) is the main neighbour. Community plugins already add card, grid and masonry layouts on top of it (Dynamic Views, Advanced Bases, PowerBases, Keep Bases View). Those layouts are generic and do not know about reading progress, series order, stages or catalogue lookups.
- Media DB style plugins focus on catalogue lookup and note creation, not on a shelf or board.
- Dedicated trackers (Goodreads, StoryGraph, Backloggd, Letterboxd, Trakt) have lists, ratings, stats, year-in-review and recommendations, but their data lives outside your notes.

Stacks' niche is therefore the combination: plain-Markdown notes, media-aware behaviour (series, progress, stages, Up next) and quick add. It should not try to be a generic card view.

## Proposed priorities after 1.0 (proposals, none created as backlog items)
1. Bases interoperability (new, small). Make sure Stacks' notes and properties work as a Bases source and document a ready-made `.base` file per preset. This answers "why not Bases?" in the README and costs little. Reason: the biggest adoption risk is being seen as a duplicate of a core feature.
2. 1.1 facets, but only category, genre and tags first. Reason: large libraries are the first real pain after launch. Franchise or setting and platform facets can follow once the filter model is proven.
3. 1.1 mobile, after facets and only if issue volume asks for it. Reason: it is the costliest item (touch drag, toolbar layout) and the shelf styling is custom. A read-only mobile mode (shelf and list, no drag) could ship earlier and cheaply.
4. Stats and year in review (new). Counts, finished per month, average rating, from data already in the notes. Reason: the most-loved feature of the hosted trackers and it needs no new data source.
5. Hardening of quick add: provider fallbacks, rate-limit handling, an optional user API key per provider. Reason: free catalogues change without notice (already a risk in road_001).

## Proposed cuts or deferrals
- 1.2 Boards beyond media: defer. It pulls Stacks toward a generic kanban, where Bases, Kanban and Projects plugins already compete, and it dilutes the media niche. Revisit only if users ask for it.
- 1.3 Recommendations: defer, keep only the research spike. Reason: it needs sources that are reliable, free and per medium, and results are hard to make good; the exit signal ("accepted more often than not") is hard to measure.
- More consoles and case styles: do on demand, one at a time, from user reports. Reason: low value per hour and endless.
- Comics and anime presets: ship as already listed, but do not extend them.

## Risks to watch
- Directory review may ask for changes to the two remaining lint warnings or to default-on network lookups.
- Bases may add media-oriented views itself and shrink the niche; the Bases interop item hedges against this.
- Maintenance load from catalogue APIs grows with each preset.

## Open questions for the owner
- Is Stacks meant to stay a personal tool that is also published, or to grow a user base? The answer changes how much to invest in mobile and in stats.
- Is a dependency on Bases (Obsidian 1.9 or later) acceptable for the optional interop item?

# Acceptance criteria
- AC1: The note states priorities and cuts with reasons.
- AC2: Every proposed item is labelled a proposal, and no backlog item or code was created.
- AC3: Open questions for the owner are listed.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_001_stacks_a_shelf_for_your_media_notes`
- Architecture decision(s): (none yet)

# References
- `logics/roadmap/road_001_stacks_to_1_0.md`
- https://forum.obsidian.md/t/dynamic-views-brings-elegant-grid-and-masonry-cards-views-to-bases/112134
- https://community.obsidian.md/plugins/advanced-bases

# Backlog
- none
