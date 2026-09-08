# Frontend tests

Covers the same three workflows as the backend suite, from the UI side:

```
src/tests/
  setup.ts                 # jest-dom matchers + auto-cleanup between tests
  helpers/
    mockFetch.ts            # tiny URL/method router for stubbing global fetch
  group-formation/
    GroupRequest.test.tsx           # components/student/GroupRequest.tsx
  milestone-creation/
    ProjectOverview.test.tsx        # Pages/StudentPages/ProjectOverview.tsx
  task-creation/
    MilestoneProgressBoard.test.tsx # Pages/StudentPages/MilestoneProgressBoard.tsx
```

Each test renders the real component with React Testing Library, drives it
the way a student would (typing into fields, picking from the search
dropdowns, clicking buttons), and stubs `fetch` so no real backend is
required. No network, database, or dev server needed.

## How to run

From `Edusync/`:

```bash
npm install      # one-time — installs vitest + Testing Library as devDependencies
npm test         # runs the whole suite once
npm run test:watch   # interactive watch mode while you work
```

To run just one workflow's tests:

```bash
npx vitest run src/tests/group-formation
npx vitest run src/tests/milestone-creation
npx vitest run src/tests/task-creation
```

To run a single test by name:

```bash
npx vitest run -t "creates a new milestone"
```

## Notes on a couple of test choices

- **`ProjectOverview.test.tsx`** always passes `memberCount={1}` (an
  "Individual Project" / group-of-one). That's the one prop value that keeps
  the unrelated `<ScopeDivision>` panel out of the tree, so each test only
  has to stub the milestone endpoints it actually cares about instead of
  Scope Division's own fetches too.
- **`MilestoneProgressBoard.test.tsx`**'s "outside the milestone's own range"
  test submits via `fireEvent.submit(form)` rather than clicking the Add Task
  button. That form has no `noValidate`, so the Due field's own HTML `max`
  attribute (kept in sync with the milestone's end date) makes the browser
  block a real click-submit before the date ever reaches React — the same
  way it would in an actual browser. Dispatching `submit` directly is the
  only way to exercise the component's own (defense-in-depth) date-range
  check in that scenario.
