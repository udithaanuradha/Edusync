# EduSync Frontend (React + Vite)

Looking for server APIs and database setup? See the Backend repository: [Edusync-Backend](https://github.com/udithaanuradha/Edusync-Backend)

This repository contains only the EduSync frontend application.

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- CSS (component-level styles)

## Getting Started

### 1. Prerequisites

- Node.js 18+ recommended
- npm

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the frontend root.

Example:

```env
VITE_API_URL=http://localhost:5000
VITE_SUPERVISOR_SEARCH_ENDPOINT=http://localhost:5000/api/users/supervisors?search={query}
```

Notes:

- `VITE_API_URL` is the backend base URL.
- `VITE_SUPERVISOR_SEARCH_ENDPOINT` is used by the coordinator group modal supervisor search.
- If backend runs on a different host/port, update these values accordingly.

### 4. Run in development

```bash
npm run dev
```

Open the app at:

`http://localhost:5173`

### 5. Production build

```bash
npm run build
```

### 6. Preview production build

```bash
npm run preview
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - create production build
- `npm run preview` - preview production build
- `npm run lint` - run linting

## Project Structure

```text
src/
	assets/                 Static assets
	component/              Legacy/shared UI parts
	components/             Feature components by role
		admin/
		coordinator/
		mentor/
		shared/
		student/
		supervisor/
	context/                React context providers (Auth, etc.)
	pages/                  Page-level route views
		AdminPages/
		CoordinatorPages/
		MentorPages/
		StudentPages/
		SupervisorPages/
		auth/
	App.tsx                 Route mapping and app shell
	main.tsx                React entry point
```

## Frontend-Backend Integration

The frontend communicates with backend APIs for:

- Authentication (`/api/login`, `/api/signup`)
- Stage management (`/api/projects/...`)
- Group management (`/api/groups/...`)
- User lookups (`/api/users/...`)
- Admin stats (`/api/admin/stats`)

Important:

- Backend must be running before using data-driven pages.
- CORS must allow frontend origin (`http://localhost:5173`).

## Role-Based Areas

The UI includes role-specific dashboards and level pages for:

- Admin
- Coordinator
- Student
- Supervisor
- Mentor

Access is controlled in frontend route logic using authenticated user role.

## Troubleshooting

### API errors or blank data

- Confirm backend is running on the URL configured in `.env`.
- Check browser Network tab for failing API route and status code.

### `Unexpected token '<' ... is not valid JSON`

- This usually means the frontend expected JSON but received an HTML error page (often 404).
- Verify that backend route exists and URL is correct.

### Supervisor search not loading

- Confirm backend route exists: `GET /api/users/supervisors?search=...`
- Confirm `VITE_SUPERVISOR_SEARCH_ENDPOINT` value in `.env`.

## Team Workflow Note

This repo is frontend-only by design. Keep server logic, database schema, and API implementation in the backend repository.
