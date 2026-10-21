import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authenticateEmployee } from '@/lib/auth/session';
import { updateProductSchema } from '@/lib/validation/schemas';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/products/[id] - update product name (employee session required)
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = updateProductSchema.safeParse(body);

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

    // Check if name is taken by another product
    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: id },
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Another product already has the name "${duplicate.name}".` },
        { status: 409 }
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json({
      product: {
        id: updated.id,
        name: updated.name,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - delete a product if safe (employee session required)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { updates: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Reject deletion if referenced by updates
    if (existing._count.updates > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete product "${existing.name}" because it has ${existing._count.updates} associated update(s). Delete or reassign the updates first.`,
        },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: `Product "${existing.name}" was successfully deleted.`,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
