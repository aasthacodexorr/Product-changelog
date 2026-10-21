import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authenticateEmployee } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
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
