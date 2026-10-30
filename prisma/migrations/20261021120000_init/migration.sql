-- CreateTable products
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable update_types
CREATE TABLE "update_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL UNIQUE,
    "isDefault" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable updates
CREATE TABLE "updates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "release_date" DATE NOT NULL,
    "type_id" TEXT NOT NULL,
    "version" TEXT,
    "review_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "updates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "updates_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "update_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token_hash" TEXT NOT NULL UNIQUE,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable login_attempts
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip_key" TEXT NOT NULL UNIQUE,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" DATETIME,
    "last_attempt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "updates_release_date_idx" ON "updates"("release_date");

-- CreateIndex
CREATE INDEX "updates_product_id_idx" ON "updates"("product_id");

-- CreateIndex
CREATE INDEX "updates_type_id_idx" ON "updates"("type_id");

-- CreateIndex
CREATE INDEX "updates_status_idx" ON "updates"("status");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_key_idx" ON "login_attempts"("ip_key");
