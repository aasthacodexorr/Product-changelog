import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authenticateEmployee } from '@/lib/auth/session';
import { createProductSchema } from '@/lib/validation/schemas';

// GET /api/products - list all products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { updates: true },
        },
      },
    });

    const formatted = products.map((p: typeof products[number]) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      updateCount: p._count.updates,
    }));

    return NextResponse.json({ products: formatted }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve products' },
      { status: 500 }
    );
  }
}

// POST /api/products - create a product (employee session required)
export async function POST(req: NextRequest) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = createProductSchema.safeParse(body);

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

    // Check for duplicate name
    const existing = await prisma.product.findFirst({
      where: {
        name: name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A product with the name "${existing.name}" already exists.` },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: { name },
    });

    return NextResponse.json(
      {
        product: {
          id: product.id,
          name: product.name,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
