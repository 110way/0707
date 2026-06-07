# Employee Wellbeing Platform

The **Employee Wellbeing Platform** is a web application designed to foster a healthy corporate workspace. It allows employees to complete wellbeing check-ins, discuss feedback on an open forum, report concerns anonymously, praise peers, and redeem reward points for professional development opportunities.

---

## Getting Started

### 1. Quick Start (With Docker)
To build and run the entire application using Docker:

```bash
# Clone the repository and navigate to the directory
cd employee-wellbeing

# Copy the example environment file
cp .env.example .env.local

# Run container in background (compiles Next.js & seeds SQLite)
docker-compose up --build
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

### 2. Manual Start (Without Docker)
Ensure you have Node.js 20 LTS installed.

```bash
# Install dependencies
pnpm install

# Copy example environment variables
cp .env.example .env.local

# Synchronize SQLite schema using Drizzle ORM
pnpm db:push

# Seed the database with mock accounts, surveys, posts, etc.
pnpm db:seed

# Run local development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Default Credentials

The seed script registers these default accounts with password: `Password123!`

| Email | Password | Role | Department |
|---|---|---|---|
| `rahul@company.com` | `Password123!` | Employee | Engineering |
| `hr@company.com` | `Password123!` | HR Representative | People & Culture |
| `admin@company.com` | `Password123!` | Administrator | Operations |

---

## Environment Variables

Defined in `.env.local` or `.env.example`:

- `JWT_SECRET`: Signature key for encoding self-hosted user session JWT tokens (minimum 32 chars).
- `DATABASE_PATH`: Path pointing to the local SQLite database file (e.g. `./data/app.db`).
- `UPLOAD_DIR`: Local filesystem directory for saving attachments and uploads (e.g. `./public/uploads`).
- `NODE_ENV`: Runtime environment setting (`development` or `production`).
- `NEXT_PUBLIC_APP_NAME`: Title of the application displayed across user views.

---

## Project Structure

```
wellbeing-app/
├── app/
│   ├── (auth)/             # Login route
│   ├── (app)/              # Layout structure and feature pages
│   └── api/                # Backend endpoint handlers
├── components/
│   ├── ui/                 # Reusable layout UI tokens
│   ├── layout/             # Navbar, Sidebar, Footer components
│   └── [features]/         # Module-specific frontend components
├── hooks/                  # Client-side state hooks (useAuth, usePoints)
├── lib/                    # Database, points rules, and JWT auth utilities
├── types/                  # Shareable TypeScript definitions
├── public/                 # Assets and file upload storage directory
├── drizzle/                # Auto-generated database schema migrations
├── Dockerfile              # Docker container setup file
└── docker-compose.yml      # Multi-container service orchestrator
```

---

## Phase Status

- [x] **Phase 1 — UI Development**: Core client-side modules, animations (Framer Motion), themes (next-themes), and responsive grids.
- [x] **Phase 2 — Backend Implementation**: Drizzle schemas, JWT sessions, path protectors, LibSQL driver, points aggregates, and CRUD routes.
- [x] **Phase 3 — Containerization**: Multi-stage docker builds, volumes mount configuration, and README guides.
