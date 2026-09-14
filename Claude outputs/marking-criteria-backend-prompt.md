# Prompt: Add staff-only "Marking Criteria" file to project stages (backend)

## Status: implemented
All of §1–§4 below have been applied directly to the local
`D:\L2S1\Software project\Edusync-Backend` checkout (branch `develop`), on
top of that repo's existing uncommitted duplicate-stage-name-check changes —
not committed or pushed, matching how that checkout already had other
unrelated local edits sitting uncommitted. Test locally against the running
server, then commit/push when ready. The rest of this doc is kept as the
design rationale for those changes, not a to-do list.

## Context
This repo (`Edusync`) is frontend-only. The React/TypeScript changes for this
feature are already implemented here:

- `src/components/coordinator/StageManagement.tsx` — Add/Edit Stage forms now
  have a second, single-file upload field labeled **"Marking Criteria"**
  (`accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"`; a hint line under the
  label reads "Visible to supervisors only. Students never see this file."
  since the label itself no longer says "(Staff Only)"). The Edit Stage modal
  also now lists a stage's already-saved Supporting Documents and current
  Marking Criteria file, each with a "✕ Remove" button — see §4, these call
  two new DELETE endpoints that don't exist on the backend yet.
- `src/pages/SupervisorPages/SupervisorLevelPage.tsx` — the Project Stages
  tab's "Coordinator Documents" list now renders `stage.marking_criteria_file`
  (if present) as a link tagged with a "Marking Rubric" badge.
- `src/components/student/CoordinatorStageUpdates.tsx` — strips
  `marking_criteria_file` out of whatever the API returns, as defense in
  depth, before it ever reaches component state.

**Confirmed symptom that §2 below has not been applied yet:** re-uploading a
Marking Criteria file for the same stage via Edit Stage (multiple attempts)
produced multiple duplicate rows of the *same* file in that stage's ordinary
"Documents" list, instead of ever appearing as a distinct Marking Criteria
entry. That's the expected behavior of an *unmodified* `upload-file` handler
receiving an unrecognized `file_category` field: it silently ignores the
field and inserts another `stage_files` row every time. Once §2 is applied,
re-uploading a rubric will instead update the single
`marking_criteria_file` column in place, with no new `stage_files` rows.

This prompt specifies the matching changes for **Edusync-Backend**
(https://github.com/udithaanuradha/Edusync-Backend), which is a separate
repository not present here. Apply the changes below there. Adjust file/model
names and query style to match that repo's actual structure — the code below
is written against the endpoints and payload shapes the frontend already
calls (`/api/projects/create`, `/api/projects/upload-file`,
`/api/projects/level/:level`, `/api/projects/update/:id`), using a generic
`mysql2/promise` + Express style since the backend repo's exact internals
weren't available to check against.

## 1. Database migration

Add one nullable column to `project_stages` to hold the rubric's file path,
alongside the existing per-stage document metadata:

```sql
ALTER TABLE project_stages
  ADD COLUMN marking_criteria_file VARCHAR(500) NULL
  AFTER resource_link;
```

`marking_criteria_file` stores a single file path/URL (same shape as the
`file_url` values already stored for `stage_files` rows) — not a separate
table — because a stage has at most one rubric, and it is coordinator-set
metadata on the stage itself rather than a general attachment.

## 2. Upload contract: one endpoint, a `file_category` flag

Rather than a new endpoint, the frontend re-uses the existing
`POST /api/projects/upload-file` and adds one form field:

| Field | Existing | New |
|---|---|---|
| `file` | ✅ | ✅ |
| `stage_id` | ✅ | ✅ |
| `uploaded_by` | ✅ | ✅ |
| `file_category` | — | `'marking_criteria'` when uploading the rubric; omitted/`'document'` for ordinary Supporting Documents |

- When `file_category !== 'marking_criteria'`: behave exactly as today — insert a row into `stage_files`.
- When `file_category === 'marking_criteria'`: **do not** insert into `stage_files`. Instead `UPDATE project_stages SET marking_criteria_file = ? WHERE stage_id = ?`, overwriting any previous rubric for that stage (the frontend's Edit-Stage flow re-uses this same call to replace an existing rubric).

Update the multer file filter so both the general-document and rubric
extension sets are accepted (`.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`,
`.pptx`, `.txt` — the frontend re-validates against the narrower set for
Supporting Documents and the wider set, which includes legacy `.xls`, for
Marking Criteria, but the server-side filter should be the union so neither
path is rejected).

```js
// middleware/uploadStageFile.js
const multer = require('multer');
const path = require('path');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/stages'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Unsupported file type: ${ext}`));
  }
  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches the frontend's cap
});
```

```js
// controllers/projectController.js
exports.uploadStageFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file received.' });
    }

    const { stage_id, uploaded_by, file_category } = req.body;
    if (!stage_id) {
      return res.status(400).json({ success: false, error: 'stage_id is required.' });
    }

    const fileUrl = `/uploads/stages/${req.file.filename}`;

    if (file_category === 'marking_criteria') {
      // Staff-only rubric: overwrite the single column on the stage itself.
      // Deliberately NOT inserted into stage_files — that table backs the
      // "Supporting Documents" list the student view also reads from, and
      // a rubric must never end up there.
      await db.query(
        'UPDATE project_stages SET marking_criteria_file = ? WHERE stage_id = ?',
        [fileUrl, stage_id],
      );
      return res.json({ success: true, file_url: fileUrl });
    }

    // Existing behavior for ordinary Supporting Documents.
    await db.query(
      `INSERT INTO stage_files (stage_id, file_name, file_url, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [stage_id, req.file.originalname, fileUrl, uploaded_by || null],
    );

    return res.json({ success: true, file_url: fileUrl });
  } catch (err) {
    console.error('uploadStageFile error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Upload failed.' });
  }
};
```

Stage creation (`POST /api/projects/create`) itself is unchanged — it still
creates the row and returns `{ success, id }` before any files are uploaded;
the frontend uploads Supporting Documents and, separately, the Marking
Criteria file as follow-up calls once it has the real `stage_id`. Stage
editing (`PUT /api/projects/update/:id`) is also unchanged — a replacement
rubric goes through `upload-file` with `file_category=marking_criteria`, not
through the update endpoint.

## 3. Student security: exclude `marking_criteria_file` at the API layer

Frontend defense-in-depth is already in place, but the task requires the
**backend** to be the actual enforcement point — never rely on the frontend
alone to hide it. `GET /api/projects/level/:level` is called by all four
roles (coordinator, supervisor, student, admin) with no distinct
"student" route, so the endpoint must determine the caller's role itself and
fail closed: omit the rubric field unless the caller is verifiably staff.

```js
// middleware/optionalAuth.js
// Does NOT reject unauthenticated requests (this endpoint is public today)
// — it only attaches req.user when a valid token is present, so the
// controller can check role and fail closed (omit the rubric) for anyone
// it can't positively identify as staff.
const jwt = require('jsonwebtoken');

module.exports = function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Invalid/expired token: proceed unauthenticated rather than erroring —
    // this route stays public, it just won't get the rubric field.
  }
  next();
};
```

```js
// routes/projectRoutes.js
const optionalAuth = require('../middleware/optionalAuth');
router.get('/level/:level', optionalAuth, projectController.getStagesByLevel);
```

```js
// controllers/projectController.js
const STAFF_ROLES = new Set(['coordinator', 'supervisor', 'admin']);

exports.getStagesByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    const { academicUnit, coordinatorId } = req.query;

    // ... existing query building for academicUnit / coordinatorId filters ...
    const [stages] = await db.query(
      `SELECT stage_id, stage_name, description, deadline, level,
              resource_link, marking_criteria_file
       FROM project_stages
       WHERE level = ? /* ...existing filters... */`,
      [level],
    );

    const isStaff = STAFF_ROLES.has(String(req.user?.role || '').toLowerCase());

    for (const stage of stages) {
      stage.files = await getFilesForStage(stage.stage_id); // existing helper
      if (!isStaff) {
        // Fail closed: strip the rubric for anyone not positively
        // identified as coordinator/supervisor/admin, rather than only
        // hiding it when the caller is positively identified as a student.
        delete stage.marking_criteria_file;
      }
    }

    return res.json({ success: true, data: stages });
  } catch (err) {
    console.error('getStagesByLevel error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
```

**Important caveat to flag back to the team:** today's `GET
/api/projects/level/:level` calls from the student pages
(`CoordinatorStageUpdates.tsx`, `StudentSubmissions.tsx`) don't send an
`Authorization` header at all. `optionalAuth` above will treat those as
unauthenticated and correctly omit the rubric either way (fail-closed
default), but it means a coordinator/supervisor page that also forgets to
send its token would *also* silently lose the rubric field instead of
erroring — worth confirming those pages do send `Authorization: Bearer
<token>` (`StageManagement.tsx`'s create/list calls currently don't either).
If tightening that isn't in scope right now, this is still strictly safer
than the current omission of any role check at all, since the default is
"hide it" rather than "show it."

## 4. New: delete endpoints for the Edit Stage "Remove" buttons

Until now there was no way to remove a file once uploaded, for either an
ordinary Supporting Document or a Marking Criteria file — the Edit Stage
modal never even listed existing files. Two new endpoints are needed:

```js
// routes/projectRoutes.js
router.delete('/files/:file_id', authRequired, projectController.deleteStageFile);
router.delete('/marking-criteria/:stage_id', authRequired, projectController.deleteMarkingCriteria);
```

```js
// controllers/projectController.js
exports.deleteStageFile = async (req, res) => {
  try {
    const { file_id } = req.params;
    // Look up the row first so the file can also be removed from disk —
    // orphaned files under uploads/stages/ otherwise accumulate forever.
    const [[row]] = await db.query('SELECT file_url FROM stage_files WHERE file_id = ?', [file_id]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    await db.query('DELETE FROM stage_files WHERE file_id = ?', [file_id]);
    // fs.unlink(path.join(__dirname, '..', row.file_url), () => {}); // best-effort disk cleanup

    return res.json({ success: true });
  } catch (err) {
    console.error('deleteStageFile error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMarkingCriteria = async (req, res) => {
  try {
    const { stage_id } = req.params;
    await db.query('UPDATE project_stages SET marking_criteria_file = NULL WHERE stage_id = ?', [stage_id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteMarkingCriteria error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
```

Both are called from the frontend with `Authorization: Bearer <token>` and
expect `{ success: true }` (or `{ success: false, message }` on failure) —
match whatever your existing auth middleware/role-check convention is for
other write endpoints in this controller (e.g. the same check
`PUT /update/:id` already applies) rather than introducing a new pattern
just for these two.

## 5. Response shape reference

`GET /api/projects/level/:level` for a coordinator/supervisor request should
now return, per stage:

```json
{
  "stage_id": "12",
  "stage_name": "Proposal",
  "description": "...",
  "deadline": "2026-10-01",
  "level": "3",
  "resource_link": "https://docs.google.com/...",
  "marking_criteria_file": "/uploads/stages/1734000000000-abc123.pdf",
  "files": [
    { "file_id": 5, "file_name": "guidelines.pdf", "file_url": "/uploads/stages/...", "uploaded_by": 2, "uploaded_at": "..." }
  ]
}
```

For a student request, `marking_criteria_file` must be absent from the
object entirely (not `null` — omitted), so a client that naively spreads the
whole record never picks it back up.

## Acceptance checklist
- [ ] `project_stages.marking_criteria_file` column added (nullable, no default files broken by the migration).
- [ ] `POST /api/projects/upload-file` branches on `file_category`: `marking_criteria` writes to the new column and skips `stage_files`; anything else behaves exactly as before.
- [ ] Re-uploading a Marking Criteria file for a stage overwrites the previous path (old file cleanup on disk is a nice-to-have, not required for this pass).
- [ ] `GET /api/projects/level/:level` includes `marking_criteria_file` for coordinator/supervisor/admin callers and omits it entirely for anyone else, including unauthenticated calls.
- [ ] `DELETE /api/projects/files/:file_id` removes a single `stage_files` row and returns `{ success: true }`.
- [ ] `DELETE /api/projects/marking-criteria/:stage_id` nulls that stage's `marking_criteria_file` and returns `{ success: true }`.
- [ ] No change in behavior for Supporting Documents, resource links, or the existing `stage_files` list.

## Cleanup needed once deployed
Stages that already had a Marking Criteria file attempted through the
not-yet-fixed upload path will have accumulated duplicate `stage_files` rows
(the same rubric file inserted once per save attempt) and an empty/missing
`marking_criteria_file` column. Once §2 and §4 are live, whoever manages the
data should re-open each affected stage in Edit Stage, use the new "✕
Remove" buttons to delete the duplicate document rows, and re-upload the
rubric once through the Marking Criteria field so it lands in the new
column correctly.
