import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authenticateEmployee } from '@/lib/auth/session';
import { createUpdateTypeSchema, normalizeTypeName } from '@/lib/validation/schemas';

// GET /api/update-types - list default and custom update types
export async function GET() {
  try {
    const types = await prisma.updateType.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { updates: true },
        },
      },
    });

    const formatted = types.map((t) => ({
      id: t.id,
      name: t.name,
      normalizedName: t.normalizedName,
      isDefault: t.isDefault,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      updateCount: t._count.updates,
    }));

    return NextResponse.json({ updateTypes: formatted }, { status: 200 });
  } catch (error) {
    console.error('Error fetching update types:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve update types' },
      { status: 500 }
    );
  }
}

// POST /api/update-types - create a custom update type (employee session required)
export async function POST(req: NextRequest) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = createUpdateTypeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { name } = parsed.data;
    const normalizedName = normalizeTypeName(name);

    // Check duplicate using normalized name
    const existing = await prisma.updateType.findUnique({
      where: { normalizedName },
    });

    if (existing) {
      return NextResponse.json(
        { error: `An update type named "${existing.name}" already exists.` },
        { status: 409 }
      );
    }

    const created = await prisma.updateType.create({
      data: {
        name,
        normalizedName,
        isDefault: false,
      },
    });

    return NextResponse.json(
      {
        updateType: {
          id: created.id,
          name: created.name,
          normalizedName: created.normalizedName,
          isDefault: created.isDefault,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating update type:', error);
    return NextResponse.json(
      { error: 'Failed to create update type' },
      { status: 500 }
    );
  }
}
