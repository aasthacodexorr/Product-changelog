import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authenticateEmployee } from '@/lib/auth/session';
import { formatUpdateResponse } from '../../route';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.update.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    const updated = await prisma.update.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        product: { select: { id: true, name: true } },
        updateType: { select: { id: true, name: true, normalizedName: true, isDefault: true } },
      },
    });

    return NextResponse.json({ update: formatUpdateResponse(updated) });
  } catch (error) {
    console.error('Error publishing update:', error);
    return NextResponse.json({ error: 'Failed to publish update' }, { status: 500 });
  }
}
