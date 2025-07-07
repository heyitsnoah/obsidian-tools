# replace-me-app-name

## Prerequisites

- [Node.js](https://nodejs.org/)
- [PNPM](https://pnpm.io/)
- [Colima](https://github.com/abiosoft/colima) (for docker)

> **Note:** For detailed setup instructions, see the
> [Development Guide](https://github.com/Alephic-AI/tools/blob/main/README.md).

## Getting Started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

1. **Start the development server**

   ```bash
   pnpm dev
   ```

   The application will be available at
   [http://localhost:3000](http://localhost:3000).

### Database Setup

This template uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL. For
production deployments, we recommend using [Neon](https://neon.tech) as
described in the
[Development Guide](https://github.com/Alephic-AI/tools/blob/main/README.md).

#### Local Development

1. **Set up environment variables:** Create or update `dotenv/.env.local` with:

   ```env
   DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/obsidian-tools"
   DATABASE_URL="postgresql://postgres:password@localhost:5432/obsidian-tools"
   ```

1. **Start PostgreSQL server**

   ```bash
   pnpm db-server init
   ```

   This starts a PostgreSQL container using Docker.

1. **Database schema** is defined in `src/lib/db/schema.ts`

1. **Database schema migrations**

   ```bash
   # Push schema changes to database
   pnpm db push

   # Generate a new migration
   pnpm db generate
   ```

1. **Continuous deployment:** Update `vercel.json` to include database
   migrations

   ```diff
   {
   "$schema": "https://openapi.vercel.sh/vercel.json",
   - "buildCommand": "pnpm build:vercel",
   + "buildCommand": "build:vercel-with-db",
   "framework": "nextjs"
   }
   ```

## Useful Commands

- `pnpm build` - Build for production
- `pnpm dev` - Start development server
- `pnpm lint` - Run linting, type checking, and formatting
- `pnpm shadcn -h` - Shadcn/ui components CLI
- `pnpm db -h` - Drizzle kit CLI
- `pnpm db-server -h` - Database server CLI
- `pnpm cli -h` - Custom CLI

## Project Structure

- `/src/app` - Next.js App Router pages and layouts
- `/src/lib` - Utility functions and shared code
- `/src/env.ts` - Environment variable schema
- `/scripts` - CLI scripts
