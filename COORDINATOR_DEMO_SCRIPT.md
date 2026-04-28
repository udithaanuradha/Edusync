# Coordinator Demo Script (8-10 Minutes)

Use this as your speaking script during the live demonstration.

## 1) Opening (45-60 seconds)

"Hi everyone, my name is [Your Name], and I am responsible for the Coordinator module in EduSync.
My part handles planning and control operations across levels: project stages, group management, approved requests, and evaluation scheduling.
In this demo I will show the full coordinator workflow from setup to student-visible outcomes."

"The main value of this module is that coordinators can organize the entire academic project lifecycle in one place, with role-based access and backend persistence."

## 2) Quick Architecture Summary (45 seconds)

"This frontend is built with React and TypeScript, and the backend is Node.js with Express.
Data is stored in MySQL/TiDB.
For communication features we also use Socket.IO.
For my coordinator part, the core paths are:
- Level pages for stage/group control
- Calendar for evaluation planning
- Announcements and communication access
All actions call backend APIs and update the UI from real database state."

## 3) Login + Role Gating (1 minute)

Action:
1. Open app login page.
2. Log in as coordinator account.
3. Open a coordinator-only page.

Say:
"First, I will show role-based protection.
When I log in as coordinator, I can access coordinator routes and management controls.
The app checks user role before rendering coordinator pages.
If a non-coordinator tries to access this route, the app redirects to login or a permitted view."

Optional proof:
- Quickly switch to student session (or describe) and mention management buttons are hidden.

## 4) Level Management Tabs (1 minute)

Action:
1. Go to Level 1 (or any level you prepared).
2. Show tabs: Project Stages, Project Groups, Student Submissions.

Say:
"Each level page separates concerns into three operational tabs.
- Project Stages: define milestones and deadlines
- Project Groups: create and manage groups
- Student Submissions: convert approved requests into official groups
This structure keeps coordinator workflow clean and predictable."

## 5) Stage Management Demo (2 minutes)

Action:
1. Open Project Stages tab.
2. Click add/create stage.
3. Enter stage name, description, deadline.
4. (Optional) upload a small file.
5. Save stage.
6. Show stage appears in list.

Say:
"Now I am creating a new stage.
This sends a POST request to create the stage in the database.
If files are attached, they are uploaded and linked to that stage.
After success, the UI state updates immediately and this stage becomes visible to students and supervisors in their instruction views."

Mention logic:
"Validation ensures required fields are present before submission.
Error handling catches API failures and keeps the UI stable."

## 6) Group Management Demo (2 minutes)

Action:
1. Open Project Groups tab.
2. Start creating a group.
3. Add supervisor.
4. Add members (use prepared IDs/names).
5. Set a leader from members.
6. Save group.

Say:
"Here I create a project group for this level.
Key business rules are enforced:
- Group needs valid data
- Leader must be one of the members
- Duplicate/invalid member scenarios are handled
Once submitted, the group is persisted in backend and shown in this table."

If asked deeper:
"Group data is normalized from API responses, so UI remains robust even if payload wrappers differ."

## 7) Approved Requests -> Create Group Flow (1 minute)

Action:
1. Open Student Submissions tab.
2. Pick one approved request.
3. Click Create Group.
4. Show prefilled group creation flow.

Say:
"This tab shows supervisor-approved student requests.
When I click Create Group, request data is prefilled into group management so coordinator can finalize quickly.
This reduces manual re-entry and improves consistency."

## 8) Calendar Panel Scheduling (1.5 minutes)

Action:
1. Open Calendar page.
2. Create a panel: type, level, date, time, duration, location, evaluators.
3. Save and show event.

Say:
"Now I schedule an evaluation panel.
This writes structured panel data to backend.
The calendar displays upcoming panels from database records.
Coordinator-only controls are protected, while students get a read-only panel view."

Optional:
"Freeze-date logic can be used to lock specific deadlines and enforce governance."

## 9) Closing (30-45 seconds)

"To summarize, my coordinator module provides:
- controlled stage planning
- reliable group management
- approval-to-group conversion workflow
- evaluation scheduling with role-based visibility
All critical actions are connected to backend APIs and persisted in database."

"Next improvements I can add are:
- stronger audit logs,
- richer validation messages,
- and expanded coordinator analytics."

---

# Live Demo Runbook (What To Do Before Presentation)

## A) Pre-demo checklist (10-15 minutes before)

1. Start backend server.
2. Start frontend server.
3. Confirm database is reachable.
4. Keep one coordinator user ready.
5. Prepare at least:
   - 1 level with sample students
   - 1 supervisor account
   - 1 approved request record
6. Keep one fallback screenshot/video for each major step.

## B) Recommended browser tab order

1. Login page
2. Coordinator dashboard
3. Level page (Stages/Groups/Submissions)
4. Calendar page
5. Optional student view tab (to show read-only behavior)

## C) Time plan

- Opening: 1 min
- Role gating + level tabs: 2 min
- Stage + group demo: 4 min
- Approved request + calendar: 2 min
- Closing + Q&A: 1 min

Total: 10 minutes

---

# Common Questions and Fast Answers

## Q1: "How do you enforce coordinator-only actions?"
"Route-level role checks and conditional rendering in UI prevent unauthorized controls, and backend endpoints also validate permissions."

## Q2: "What happens if API fails while creating stage/group?"
"The component catches errors, shows feedback, and avoids inconsistent state updates."

## Q3: "How do approved requests connect to group creation?"
"Approved submissions are listed and passed into a prefill flow that opens group management with request data."

## Q4: "Why split into tabs?"
"It maps directly to coordinator operations and reduces complexity per screen."

## Q5: "Is data persistent?"
"Yes, all create/update actions call backend endpoints and store records in MySQL/TiDB."

---

# Presentation Tips (High Impact)

1. Narrate intent before each click: "Now I am creating stage data that students will consume."
2. Keep one prepared dataset to avoid typing delays.
3. If a bug appears, explain expected flow and show fallback screenshot.
4. End with architecture + business value, not just UI.
5. Keep answers short and technical when questioned.
