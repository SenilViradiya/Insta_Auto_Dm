# Instagram DM Automation Platform (V1)

V1 of an Instagram DM Automation platform designed for agencies to manage connected business accounts, set up simple keyword triggers, and send/receive automated direct messages.

## 🚀 Technical Stack

- **Monorepo Management:** Turborepo & `pnpm` workspaces
- **Frontend App (`apps/web`):** Next.js 15 (App Router), TypeScript, Tailwind CSS, Ant Design (AntD), React Query, React Hook Form, Zod
- **Backend App (`apps/api`):** NestJS, Prisma, PostgreSQL, Redis, BullMQ, Pino Logger, Zod validation
- **DevOps & Infrastructure:** Docker Compose (PostgreSQL, Redis), GitHub Actions CI

---

## 📁 Repository Structure

```text
instagram-automation/
├── apps/
│   ├── web/                     # Next.js 15 Frontend
│   └── api/                     # NestJS Business Logic & API
├── packages/
│   ├── types/                   # Shared TypeScript models and interfaces
│   ├── eslint-config/           # Custom reusable ESLint configurations
│   └── tsconfig/                # Extended TypeScript compilation rules
├── docker/                      # Containerized configurations
│   ├── postgres/
│   └── redis/
├── docker-compose.yml           # Database & queue orchestration services
├── turbo.json                   # Turborepo task pipeline config
├── pnpm-workspace.yaml          # Monorepo packages config
└── package.json                 # Project dependencies & global orchestration scripts
```

---

## 🛠️ Getting Started Locally

Follow these quick commands to spin up the local development environment.

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **pnpm**: v11+
- **Docker & Docker Compose**: installed and running

### 2. Configure Environments

Copy the root `.env.example` file to the NestJS application `.env` file:

```bash
# In project root
cp .env.example apps/api/.env
```

Ensure you inspect `apps/api/.env` and update credentials for PostgreSQL, Redis, and Meta OAuth credentials if testing integrations later.

### 3. Spin Up Docker Services

Launch PostgreSQL and Redis containers:

```bash
docker compose up -d
```

### 4. Install Dependencies

Run the package installation at the workspace root:

```bash
pnpm install
```

### 5. Generate Prisma Client

Verify type-safety mappings are configured:

```bash
pnpm --filter api exec prisma generate
```

### 6. Run Dev Servers Concurrently

Start Next.js (port `3000`) and NestJS (port `3001` with watch mode) under a single command:

```bash
pnpm dev
```

---

## 🧪 Shared Development Scripts

| Action            | Run command      | Description                                                            |
| ----------------- | ---------------- | ---------------------------------------------------------------------- |
| **Build Project** | `pnpm build`     | Compiles frontend next.js build and backend NestJS distribution assets |
| **Lint Check**    | `pnpm lint`      | Validates file standards across workspace using custom ESLint rules    |
| **Type Check**    | `pnpm typecheck` | Evaluates TypeScript configurations in root and packages with `tsc`    |
| **Run Tests**     | `pnpm test`      | Invokes Jest for NestJS unit and E2E suites                            |
| **Format Files**  | `pnpm format`    | Runs Prettier configurations across markdown, json, and codebase       |
