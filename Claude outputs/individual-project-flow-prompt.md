# Prompt: Build the Individual Project flow (Level 3 & Level 4)

## Objective
When a student on the Level 3 or Level 4 page selects **"Individual Project"**
on the toggle added in the previous prompt
(`add-group-individual-toggle-level-pages-prompt.md`), replace the current
placeholder with a real inner-tab workspace, matching the same visual style
as the existing Group Project workspace (same page frame, tab-switcher
underline style, card shapes, spacing — see the attached Level 3 screenshot
for the reference look). This prompt covers exactly three inner tabs:

1. **Project Stages**
2. **Request Supervisor**
3. **Documents**

After the supervisor approves the request submitted in "Request Supervisor",
the student should be able to start **Project Management** for their
individual project, reusing the same project management experience already
built for groups (Project Overview + My Tasks), just adapted for a
single-person project (see "Project Management for individual projects"
below).

## Scope — read carefully before touching anything
- Affects **only** the Individual Project path on Level 3 and Level 4 pages
  (the side of the toggle added in the prior prompt).
- Do **not** change anything on the Group Project side — same five tabs
  (Project States, Group Formation, Groups, Submissions, Marks), same
  components, same behavior, completely untouched.
- Do **not** change Level 1, Level 2, other student dashboard sections
  (Dashboard, Calendar, Communication, Announcements), or any other role's
  pages (Coordinator, Supervisor, Mentor, Admin) beyond what's strictly
  needed so a supervisor can see and approve an individual request (see
  Supervisor-side note below).
- This is additive: reuse existing components and endpoints wherever the
  functionality is genuinely the same, rather than duplicating code.

## Tab 1: Project Stages
- Mirrors the existing "Project States" tab from the Group Project side —
  same card style, same numbered milestone/stage list with a due-date
  badge (e.g. the "Final evaluation — final submission — 4/9/2026" card
  shown in the reference screenshot).
- Content is scoped to this student's individual project record instead of
  a group record, but the component/markup should be the same or a thin
  wrapper around the existing one — don't rebuild this from scratch if the
  existing "Project States" component can accept an individual project's ID
  instead of a group ID.

## Tab 2: Request Supervisor
- Same form and visual design as the existing **Group Formation** form,
  with one difference: **no "add members" step or field** — there is no
  team to invite, so that entire part of the form is removed for this
  path.
- The student submits the request solo. Under the hood, follow the
  "group of one" model already agreed for individual projects: the request
  creates the same kind of record a group request would, just with exactly
  one member (this student), so everything downstream (Project Management,
  milestones, tasks) can reuse existing group-based logic without a parallel
  data model.
- Submission goes to the supervisor for approval, the same way group
  requests do today.
- **Confirmed**: unlike group requests (which use a dual-supervisor-approval
  flow, since a group can request two supervisors and both must accept),
  an individual project only ever needs **one supervisor's approval**. The
  Request Supervisor form should let the student pick/request a single
  supervisor, and approval is final as soon as that one supervisor accepts
  — no second-supervisor step, no "both must accept" logic. Build this as
  the simpler single-approver case, not a stripped-down version of the
  dual-supervisor flow.
- **Supervisor-side note**: whichever supervisor dashboard/page currently
  shows and approves group requests will need to also show individual
  requests (likely just another row in the same request list, distinguished
  by a small "Individual" tag) — this is the one small, necessary touch
  outside the student role. Keep it minimal: don't restructure the
  supervisor's page, just make sure individual requests appear in whatever
  list/approval mechanism already exists for group requests.

## Tab 3: Documents
- Same file upload and document download UI/behavior as the existing
  **Submissions** tab on the Group Project side — reuse the same upload
  component, file list, and download links rather than building a new
  file-handling flow.
- Scoped to this student's individual project instead of a group's.

## Project Management for individual projects
- Once the supervisor approves the "Request Supervisor" submission, the
  student should get access to Project Management (Project Overview + My
  Tasks) in the same way a group's leader/members do once their group is
  approved.
- Since this is effectively a "group of one," the parts of Project
  Management that only make sense for multiple people should not render:
  no Scope Division card (nothing to divide), no "who's working on this
  milestone" panel, no duplicate-task warning (per the earlier "group of
  one" design discussion). Everything else — milestone creation, task
  self-add, the Gantt/schedule preview — works exactly the same as it does
  for a group, since the underlying data shape is the same.
- This part should require little new code if Project Management already
  operates per-group-id: the individual project's single-member group
  record just flows through the exact same page with the multi-person
  panels conditionally hidden when member count is 1.

## What NOT to do
- Don't touch the Group Project tabs, components, or data flow.
- Don't touch Level 1, Level 2, or any other role's dashboard beyond the
  minimal supervisor-side visibility noted above.
- Don't build a separate file-storage/document backend — reuse the
  existing Submissions upload/download endpoints.
- Don't add a "Marks" or "Groups" tab to the Individual Project side unless
  you confirm that's wanted — this prompt only specifies Project Stages,
  Request Supervisor, and Documents. (Flag this to the student/requester
  before adding anything beyond these three, since marks/evaluation for
  individual projects may need its own follow-up prompt.)

## Acceptance checklist
- [ ] Individual Project side shows exactly three tabs: Project Stages, Request Supervisor, Documents — styled to match the Group Project side.
- [ ] Request Supervisor form has no member-add step.
- [ ] Submitting a request creates a one-member project record reusing existing group-based data structures.
- [ ] Supervisor can see and approve/reject individual requests from wherever they already handle group requests, with a clear "Individual" indicator, using single-supervisor approval (no dual-approval logic).
- [ ] Approved individual projects unlock Project Management with Scope Division and team-visibility panels hidden (since there's only one member).
- [ ] Documents tab reuses the existing upload/download components without duplicating them.
- [ ] No change to the Group Project path, other levels, or other roles beyond the noted minimal supervisor-list visibility.
