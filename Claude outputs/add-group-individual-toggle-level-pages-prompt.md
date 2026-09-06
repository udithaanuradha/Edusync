# Prompt: Add Group/Individual Project toggle to Level 3 and Level 4 pages

## Objective
On both the **Level 3** and **Level 4** pages (under Academic Level in the
student sidebar), add a two-option toggle button — **"Group Project"** /
**"Individual Project"** — positioned on the right side of the same row that
currently holds the page heading ("Level 3 Projects" / "Level 4 Projects").

Selecting **Group Project** must continue exactly the existing flow (no
behavior change at all): the same five tabs (Project States, Group
Formation, Groups, Submissions, Marks) and everything under them, unchanged.

Selecting **Individual Project** switches the page to a different set of
tabs/pages that are **not yet defined** — this prompt only covers adding the
toggle and wiring it to show a placeholder for that path. The actual
Individual Project pages will be specified in a follow-up prompt; don't
invent their content now beyond a simple placeholder panel.

## Scope — read carefully before touching anything
- Affects **only** the Level 3 and Level 4 pages inside the Student role's
  Academic Level section.
- Do **not** change Level 1 or Level 2 pages — they have no project
  concept and should not get this toggle.
- Do **not** change anything else in the student dashboard: Dashboard,
  Calendar, Communication, Announcements, or the sidebar navigation
  structure itself.
- Do **not** change any other role's pages (Coordinator, Supervisor,
  Mentor, Admin).
- Do **not** alter the existing Group Project tabs' components, routes, or
  data fetching in any way — they must keep working exactly as they do
  today when "Group Project" is selected.
- This is additive UI work. No backend schema changes are strictly
  required yet for the toggle itself (see Data notes below for how the
  student's current selection should be read/stored).

## Placement and style
- The toggle sits in the same header row as the page title (see attached
  reference screenshot layout: "Level 3 Projects" heading + subtitle line
  above the tab strip), right-aligned opposite the heading text.
- Style it as a compact two-segment control matching the app's existing
  design language — e.g. a pill-shaped switch with two segments, using the
  same color tokens as the rest of the page (primary color for the active
  segment, muted background for the inactive one, consistent border-radius
  and font-weight with other buttons/badges already on this page).
- It should look like a natural extension of the existing header, not a
  separate card — no heavy box shadow or contrasting background beyond
  what distinguishes the active segment from the inactive one.
- Reuse existing shared button/segmented-control styling if the codebase
  already has one (check for an existing toggle/switch component before
  building a new one from scratch).

## Behavior
1. **Default state / current selection**: when the page loads, show
   whichever option the student has already chosen (if any), fetched from
   wherever this session's design ends up storing it (see Data notes). If
   the student hasn't chosen yet, decide a sensible default per the
   business rule already agreed for this app (e.g., Level 3 defaults to
   Individual since it's typically not optional there, Level 4 has no
   default and should prompt a choice — confirm this rule before
   implementing, since it directly affects first-load behavior).
2. **Selecting "Group Project"**: renders the five existing tabs (Project
   States, Group Formation, Groups, Submissions, Marks) with no change to
   their current implementation.
3. **Selecting "Individual Project"**: renders a new, currently-placeholder
   tab strip/panel with a simple message like "Individual Project pages
   coming soon" — enough structure to swap in the real pages later without
   another restructuring pass, but no real functionality yet.
4. Switching the toggle should not lose or corrupt any data on the Group
   Project side — treat it purely as a display switch for now, not a
   destructive action.
5. If the student has already been approved into an active group (i.e.
   there's a real backend record of a formed/approved group for this
   level), the toggle should not be able to silently switch away from
   "Group Project" without at least a confirmation, since doing so
   shouldn't orphan an already-approved group. (Exact locking rules can be
   refined later — flag this as an open question rather than deciding
   silently.)

## Data notes (for whoever implements this)
- Decide where "which project type did this student pick for this level"
  is stored — likely a small addition to the student's per-level project
  record (e.g. a `project_type` column: `'group' | 'individual'`) rather
  than something purely client-side, so the choice persists across
  sessions and devices.
- This prompt does not require building the full Individual Project
  backend flow — just enough to read/write this one field so the toggle
  has real state instead of resetting on every reload.

## What NOT to do
- Don't remove, rename, or restructure the existing Group Project tabs.
- Don't build out real Individual Project functionality yet — placeholder
  only, per the "I'll tell you later" note.
- Don't touch Level 1, Level 2, or any other role's pages.
- Don't change the sidebar, header, or any shared layout component beyond
  what's needed to add this one row-level toggle.

## Acceptance checklist
- [ ] Toggle appears only on Level 3 and Level 4 pages, right-aligned in the heading row.
- [ ] Group Project tabs/content are pixel- and behavior-identical to today when that option is active.
- [ ] Individual Project shows a clearly-labeled placeholder, not an error or blank page.
- [ ] No other page, role, or shared component changed.
- [ ] Toggle visually matches the existing design system (colors, radius, typography).
