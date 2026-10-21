# Product Changelog Manager

Full-stack Next.js application for product changelog management with a public client changelog and an employee management panel backed by PostgreSQL and Prisma ORM.

## Architecture

- **Framework**: Next.js App Router (React 19, TypeScript, Tailwind CSS)
- **Database**: PostgreSQL (Single source of truth)
- **ORM**: Prisma ORM with version-controlled migrations
- **Validation**: Zod schema validation on all inputs
- **Authentication**: Shared employee password (`EMPLOYEE_PANEL_PASSWORD`), cryptographically secure session tokens, SHA-256 token hashing in PostgreSQL, `HttpOnly`/`Secure` cookies, and database-backed rate limiting.

---

## Routes & Access Control

| Route | Access | Description |
|---|---|---|
| `/changelog` | Public (Read-only) | Client-facing changelog, grouped by month/year, product search, review links. Only displays `PUBLISHED` updates. |
| `/panel` | Employee (Protected) | Management panel for creating, editing, publishing, and deleting updates and products. Server-side redirect to `/panel/login` if unauthenticated. |
| `/panel/login` | Public | Shared employee password login screen with database-backed rate limiting. |
| `/` | Public | Automatically redirects to `/changelog`. |

---

## Requirements

- **Node.js**: `v20.x` or higher (verified on Node `v20.20.2`)
- **PostgreSQL**: PostgreSQL 14+ (Local instance, Docker, Amazon RDS, Supabase, Neon, etc.)

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/product_changelog?schema=public"

# Shared password for employee panel access (/panel)
EMPLOYEE_PANEL_PASSWORD="change_this_to_a_secure_shared_password"

# Node environment
NODE_ENV="development"
PORT="3000"
```

> **Security Note**: Never commit `.env` or secrets into version control. Real `.env` files are ignored via `.gitignore`.

---

## Setup & Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

3. **Apply Database Migrations**:
   ```bash
   npx prisma migrate deploy
   # Or for local development with auto-sync:
   npm run prisma:migrate
   ```

4. **Seed Default Update Types**:
   Seeds *New Feature*, *Improvement*, *Bug Fix*, and *Security Update* idempotently:
   ```bash
   npm run prisma:seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000/changelog](http://localhost:3000/changelog) for the public changelog and [http://localhost:3000/panel](http://localhost:3000/panel) for the employee panel.

---

## Database Schema & Migrations

The database models are defined in `prisma/schema.prisma` with versioned SQL migrations located in `prisma/migrations/`:

- **`products`**: Stable UUID `id`, unique `name`, `createdAt`, `updatedAt`. Rejects deletion if referenced by updates (`onDelete: Restrict`).
- **`update_types`**: Stable UUID `id`, display `name`, unique `normalizedName`, `isDefault` flag. Default types cannot be deleted. Custom types can only be deleted when unreferenced.
- **`updates`**: Stable UUID `id`, foreign keys to `product` and `updateType`, `moduleName`, `title`, `description` (TEXT), `releaseDate` (DATE), `version` (optional), `reviewUrl` (optional URL), `status` (`DRAFT` or `PUBLISHED`, default `DRAFT`). Indexed by release date, product, update type, and status.
- **`sessions`**: Stable UUID `id`, unique `tokenHash` (SHA-256), `expiresAt`, `createdAt`.
- **`login_attempts`**: Shared database-backed rate limiting keyed by hashed client IP, tracking attempts, lockout timestamps, and last attempts.

---

## REST API Reference

### 1. Authentication

#### `POST /api/auth/login`
Validate the shared password and initiate a secure session.
- **Rate limiting**: Max 5 failed attempts per 15-minute window per IP.
- **Request Body**:
  ```json
  {
    "password": "shared_employee_password"
  }
  ```
- **Success Response (200 OK)**:
  Sets `changelog_session` HttpOnly cookie.
  ```json
  { "ok": true, "message": "Authenticated successfully" }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "error": "Invalid credentials" }`
  - `429 Too Many Requests`: `{ "error": "Too many login attempts. Please try again later." }`

#### `POST /api/auth/logout`
Invalidate the session in the database and delete the session cookie.
- **Success Response (200 OK)**:
  ```json
  { "ok": true, "message": "Logged out successfully" }
  ```

#### `GET /api/auth/session`
Check current session validity. Never returns passwords or tokens.
- **Response (200 OK)**:
  ```json
  { "authenticated": true }
  ```

---

### 2. Updates

#### `GET /api/updates`
Retrieve updates with filtering, search, sorting and pagination.
- **Public Requests**: Always restricted to `PUBLISHED` updates on the server.
- **Employee Requests**: Can filter by `status=DRAFT`, `status=PUBLISHED`, or retrieve all.
- **Query Parameters**:
  - `productId`: filter by product UUID
  - `typeId`: filter by update type UUID
  - `moduleName`: filter by module name (case-insensitive partial)
  - `search`: search across title, description, module name, and product name
  - `year`: filter by release year (e.g., `2026`)
  - `month`: filter by release month (e.g., `1` to `12`)
  - `sort`: `newest` (default) or `oldest`
  - `page`: pagination page (default: `1`)
  - `limit`: items per page (default: `100`, max: `200`)
- **Response (200 OK)**:
  ```json
  {
    "updates": [
      {
        "id": "e30129a2-...",
        "productId": "8f14b62d-...",
        "productName": "Mobile App",
        "moduleName": "Authentication",
        "title": "Biometric face unlock",
        "description": "Added Face ID support for instant authentication.",
        "releaseDate": "2026-10-21",
        "typeId": "1b0928ad-...",
        "type": "New Feature",
        "version": "2.4.0",
        "reviewUrl": "https://github.com/org/repo/pull/123",
        "status": "PUBLISHED",
        "createdAt": "2026-10-21T06:00:00.000Z",
        "updatedAt": "2026-10-21T06:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 100,
      "totalPages": 1
    }
  }
  ```

#### `GET /api/updates/[id]`
Retrieve an individual update. If the update is a `DRAFT` and the caller is not authenticated, returns `404 Not Found`.

#### `POST /api/updates` *(Employee session required)*
Create an update.
- **Request Body**:
  ```json
  {
    "productId": "8f14b62d-...",
    "moduleName": "Dashboard",
    "title": "CSV Report Export",
    "description": "Export monthly analytics reports to CSV.",
    "releaseDate": "2026-10-21",
    "typeId": "1b0928ad-...",
    "version": "1.3.0",
    "reviewUrl": "https://github.com/org/repo/pull/456",
    "status": "DRAFT"
  }
  ```
- **Response (201 Created)**: Returns `{ "update": { ... } }`.

#### `PUT /api/updates/[id]` *(Employee session required)*
Edit an update.
- **Review URL Behavior**:
  - Omitted: leaves existing URL unchanged.
  - `null` or `""`: explicitly clears the URL.
  - Valid `http:`/`https:` URL: updates to normalized URL.
- **Response (200 OK)**: Returns `{ "update": { ... } }`.

#### `DELETE /api/updates/[id]` *(Employee session required)*
Delete an update.
- **Response (200 OK)**: `{ "ok": true, "message": "Update deleted successfully" }`.

#### `POST /api/updates/[id]/publish` *(Employee session required)*
Publish an update (transitions status from `DRAFT` to `PUBLISHED`).
- **Response (200 OK)**: Returns updated update object.

#### `POST /api/updates/[id]/unpublish` *(Employee session required)*
Return an update to draft status (`status: "DRAFT"`).
- **Response (200 OK)**: Returns updated update object.

---

### 3. Products

#### `GET /api/products`
List all products sorted by name ascending.

#### `POST /api/products` *(Employee session required)*
Create a new product.
- **Request Body**: `{ "name": "Payment Gateway" }`
- **Validation**: Rejects duplicates (case-insensitive) with `409 Conflict`.

#### `PUT /api/products/[id]` *(Employee session required)*
Update a product name. Rejects duplicates with `409 Conflict`.

#### `DELETE /api/products/[id]` *(Employee session required)*
Safely deletes a product.
- **Safety Rule**: Rejects deletion with `400 Bad Request` if referenced by any updates.

---

### 4. Update Types

#### `GET /api/update-types`
List all default and custom update types.

#### `POST /api/update-types` *(Employee session required)*
Create a custom update type.
- **Request Body**: `{ "name": "Deprecation Notice" }`
- **Validation**: Enforces unique normalized name (`409 Conflict` on duplicate).

#### `DELETE /api/update-types/[id]` *(Employee session required)*
Delete an unused custom update type.
- **Safety Rule**: Rejects deletion of built-in default types (`isDefault: true`) and any type referenced by existing updates.

---

## Security Specifications

1. **Shared Employee Password**:
   - Configured only via `EMPLOYEE_PANEL_PASSWORD`.
   - Never bundled in client JavaScript, logs, or API payloads.
   - Verified via constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
2. **Session Storage**:
   - 32-byte cryptographically random token (`crypto.randomBytes(32)`).
   - Only the SHA-256 hash is persisted in PostgreSQL.
   - Session cookie set with `HttpOnly`, `Secure` in production, `SameSite=Lax`, and `Path=/`.
3. **Session Revocation**:
   - Calling `POST /api/auth/logout` deletes the hashed token from PostgreSQL and clears the cookie.
   - Changing `EMPLOYEE_PANEL_PASSWORD` or truncating the `sessions` table immediately revokes all active sessions.
4. **CSRF & Origin Verification**:
   - Protected write APIs (`POST`, `PUT`, `DELETE`) validate the `Origin` and `Host` headers to prevent cross-site request forgery.
5. **Rate Limiting**:
   - Implemented in PostgreSQL (`login_attempts` table).
   - Enforces a 5-attempt limit per 15-minute window per IP.
   - Returns generic error messages without revealing partial credential matches.
6. **Review URL Sanitization**:
   - Strict protocol validation allows only `http:` and `https:`.
   - Rejects `javascript:`, `data:`, `vbscript:`, and malformed URLs.
   - Links rendered on public changelog use safe attributes: `target="_blank" rel="noopener noreferrer"`.

---

## Production Deployment & Operations

### Build & Run
```bash
npm run build
npm start
```

### Production Migration Steps
Run migrations before deploying the application build:
```bash
npx prisma migrate deploy
```

### Changing the Shared Password
1. Update `EMPLOYEE_PANEL_PASSWORD` in your production environment variables (e.g. AWS SSM, Vercel, Railway, Kubernetes Secret).
2. Redeploy or restart the application server.
3. To immediately revoke all active sessions, run the SQL command:
   ```sql
   TRUNCATE TABLE sessions;
   ```

### Backup and Restore Recommendations
- **PostgreSQL Backups**: Take automated snapshots or run `pg_dump`:
  ```bash
  pg_dump -Fc "$DATABASE_URL" > changelog_backup_$(date +%Y%m%d).dump
  ```
- **Restore**:
  ```bash
  pg_restore -d "$DATABASE_URL" --clean changelog_backup.dump
  ```

---

## Testing & Verification

Run the entire test suite:
```bash
npm test
```

Run TypeScript compilation check:
```bash
npm run typecheck
```

Build production bundle:
```bash
npm run build
```
