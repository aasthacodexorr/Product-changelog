import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authenticateEmployee } from '@/lib/auth/session';
import { createUpdateTypeSchema, normalizeTypeName } from '@/lib/validation/schemas';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/update-types/[id] - update an update type name (employee session required)
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.updateType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Update type not found' },
        { status: 404 }
      );
    }

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

    // Check if name is taken by another update type
    const duplicate = await prisma.updateType.findFirst({
      where: {
        id: { not: id },
        normalizedName,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Another update type named "${duplicate.name}" already exists.` },
        { status: 409 }
      );
    }

    const updated = await prisma.updateType.update({
      where: { id },
      data: {
        name,
        normalizedName,
      },
    });

    return NextResponse.json({
      updateType: {
        id: updated.id,
        name: updated.name,
        normalizedName: updated.normalizedName,
        isDefault: updated.isDefault,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating update type:', error);
    return NextResponse.json(
      { error: 'Failed to update update type' },
      { status: 500 }
    );
  }
}

// DELETE /api/update-types/[id] - delete an unused custom type (employee session required)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.updateType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { updates: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Update type not found' },
        { status: 404 }
      );
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Default update types cannot be deleted.' },
        { status: 400 }
      );
    }

    if (existing._count.updates > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete update type "${existing.name}" because it is referenced by ${existing._count.updates} update(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.updateType.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: `Update type "${existing.name}" was successfully deleted.`,
    });
  } catch (error) {
    console.error('Error deleting update type:', error);
    return NextResponse.json(
      { error: 'Failed to delete update type' },
      { status: 500 }
    );
  }
}
