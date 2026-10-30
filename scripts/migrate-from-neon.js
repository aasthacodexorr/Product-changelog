/**
 * Migration script to import data from Neon into SQLite
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🚀 Starting migration from Neon to SQLite...\n');

    // Read the backup file
    const backupPath = path.join(process.cwd(), 'neon-backup.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    const { products = [], update_types = [], updates = [], sessions = [], login_attempts = [] } = backupData;

    // Migrate Products
    if (products.length > 0) {
      console.log(`📦 Migrating ${products.length} product(s)...`);
      for (const product of products) {
        await prisma.product.upsert({
          where: { id: product.id },
          update: { name: product.name },
          create: {
            id: product.id,
            name: product.name,
            createdAt: new Date(product.createdAt),
            updatedAt: new Date(product.updatedAt),
          },
        });
      }
      console.log('✅ Products migrated\n');
    }

    // Migrate UpdateTypes
    if (update_types.length > 0) {
      console.log(`🏷️  Migrating ${update_types.length} update type(s)...`);
      for (const updateType of update_types) {
        await prisma.updateType.upsert({
          where: { id: updateType.id },
          update: { 
            name: updateType.name,
            normalizedName: updateType.normalizedName,
            isDefault: updateType.isDefault,
          },
          create: {
            id: updateType.id,
            name: updateType.name,
            normalizedName: updateType.normalizedName,
            isDefault: updateType.isDefault,
            createdAt: new Date(updateType.createdAt),
            updatedAt: new Date(updateType.updatedAt),
          },
        });
      }
      console.log('✅ Update types migrated\n');
    }

    // Migrate Updates
    if (updates.length > 0) {
      console.log(`📝 Migrating ${updates.length} update(s)...`);
      for (const update of updates) {
        await prisma.update.upsert({
          where: { id: update.id },
          update: {
            title: update.title,
            description: update.description,
            releaseDate: new Date(update.release_date),
            version: update.version,
            reviewUrl: update.review_url,
            status: update.status,
          },
          create: {
            id: update.id,
            productId: update.product_id,
            moduleName: update.module_name,
            title: update.title,
            description: update.description,
            releaseDate: new Date(update.release_date),
            typeId: update.type_id,
            version: update.version,
            reviewUrl: update.review_url,
            status: update.status,
            createdAt: new Date(update.created_at),
            updatedAt: new Date(update.updated_at),
          },
        });
      }
      console.log('✅ Updates migrated\n');
    }

    // Migrate Sessions
    if (sessions && sessions.length > 0) {
      console.log(`🔐 Migrating ${sessions.length} session(s)...`);
      for (const session of sessions) {
        await prisma.session.upsert({
          where: { id: session.id },
          update: {
            tokenHash: session.token_hash,
            expiresAt: new Date(session.expires_at),
          },
          create: {
            id: session.id,
            tokenHash: session.token_hash,
            expiresAt: new Date(session.expires_at),
            createdAt: new Date(session.created_at),
          },
        });
      }
      console.log('✅ Sessions migrated\n');
    }

    // Migrate Login Attempts
    if (login_attempts && login_attempts.length > 0) {
      console.log(`🔑 Migrating ${login_attempts.length} login attempt(s)...`);
      for (const attempt of login_attempts) {
        await prisma.loginAttempt.upsert({
          where: { id: attempt.id },
          update: {
            attempts: attempt.attempts,
            lockedUntil: attempt.locked_until ? new Date(attempt.locked_until) : null,
            lastAttempt: new Date(attempt.last_attempt),
          },
          create: {
            id: attempt.id,
            ipKey: attempt.ip_key,
            attempts: attempt.attempts,
            lockedUntil: attempt.locked_until ? new Date(attempt.locked_until) : null,
            lastAttempt: new Date(attempt.last_attempt),
            createdAt: new Date(attempt.created_at),
            updatedAt: new Date(attempt.updated_at),
          },
        });
      }
      console.log('✅ Login attempts migrated\n');
    }

    console.log('✨ Migration complete!');
    console.log(`
📊 Summary:
  - ${products.length} product(s)
  - ${update_types.length} update type(s)
  - ${updates.length} update(s)
  - ${sessions?.length || 0} session(s)
  - ${login_attempts?.length || 0} login attempt(s)

Your data is now safely stored in SQLite at prisma/dev.db
    `);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
