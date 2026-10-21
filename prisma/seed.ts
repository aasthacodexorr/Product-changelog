import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TYPES = [
  'New Feature',
  'Improvement',
  'Bug Fix',
  'Security Update',
];

export function normalizeTypeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

export async function seed(client: PrismaClient = prisma) {
  console.log('Seeding default update types...');
  for (const name of DEFAULT_TYPES) {
    const normalizedName = normalizeTypeName(name);
    await client.updateType.upsert({
      where: { normalizedName },
      update: {
        name,
        isDefault: true,
      },
      create: {
        name,
        normalizedName,
        isDefault: true,
      },
    });
  }
  console.log('Default update types seeded successfully.');
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  seed()
    .catch((e) => {
      console.error('Error during seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
