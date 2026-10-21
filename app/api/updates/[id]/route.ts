import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { verifySessionToken, SESSION_COOKIE_NAME, authenticateEmployee } from '@/lib/auth/session';
import { editUpdateSchema, processReviewUrl } from '@/lib/validation/schemas';
import { formatUpdateResponse } from '../route';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/updates/[id] - retrieve an individual update
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const update = await prisma.update.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true } },
        updateType: { select: { id: true, name: true, normalizedName: true, isDefault: true } },
      },
    });

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    // Public visitors must never see drafts
    if (update.status === 'DRAFT') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const isEmployee = await verifySessionToken(token);
      if (!isEmployee) {
        return NextResponse.json({ error: 'Update not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ update: formatUpdateResponse(update) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching update:', error);
    return NextResponse.json({ error: 'Failed to retrieve update' }, { status: 500 });
  }
}

// PUT /api/updates/[id] - edit an update (employee session required)
export async function PUT(req: NextRequest, context: RouteContext) {
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

    const body = await req.json().catch(() => null);
    const parsed = editUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0];
        if (fieldName && typeof fieldName === 'string') {
          fieldErrors[fieldName] = issue.message;
        }
      }
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parsed.error.issues.map((i) => i.message),
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      productId,
      moduleName,
      title,
      description,
      releaseDate,
      typeId,
      version,
      reviewUrl: rawReviewUrl,
      status,
    } = parsed.data;

    // Review URL handling:
    // distinguish between omitted (leave unchanged) and explicit null/empty string (clear URL)
    let reviewUrlUpdate: string | null | undefined = undefined;
    if ('reviewUrl' in (body || {})) {
      const processed = processReviewUrl(rawReviewUrl);
      if (!processed.valid) {
        return NextResponse.json(
          { error: processed.error || 'Invalid review URL' },
          { status: 400 }
        );
      }
      reviewUrlUpdate = processed.normalizedUrl;
    }

    // Verify productId if changed
    if (productId && productId !== existing.productId) {
      const productExists = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!productExists) {
        return NextResponse.json({ error: 'Specified product does not exist.' }, { status: 400 });
      }
    }

    // Verify typeId if changed
    if (typeId && typeId !== existing.typeId) {
      const typeExists = await prisma.updateType.findUnique({
        where: { id: typeId },
      });
      if (!typeExists) {
        return NextResponse.json({ error: 'Specified update type does not exist.' }, { status: 400 });
      }
    }

    let releaseDateTime: Date | undefined = undefined;
    if (releaseDate) {
      const [y, m, d] = releaseDate.split('-').map(Number);
      releaseDateTime = new Date(Date.UTC(y, m - 1, d));
    }

    const updated = await prisma.update.update({
      where: { id },
      data: {
        ...(productId && { productId }),
        ...(moduleName && { moduleName }),
        ...(title && { title }),
        ...(description && { description }),
        ...(releaseDateTime && { releaseDate: releaseDateTime }),
        ...(typeId && { typeId }),
        ...('version' in (body || {}) && { version: version ?? null }),
        ...(reviewUrlUpdate !== undefined && { reviewUrl: reviewUrlUpdate }),
        ...(status && { status }),
      },
      include: {
        product: { select: { id: true, name: true } },
        updateType: { select: { id: true, name: true, normalizedName: true, isDefault: true } },
      },
    });

    return NextResponse.json({ update: formatUpdateResponse(updated) });
  } catch (error) {
    console.error('Error updating update:', error);
    return NextResponse.json({ error: 'Failed to update update' }, { status: 500 });
  }
}

// DELETE /api/updates/[id] - delete an update (employee session required)
export async function DELETE(req: NextRequest, context: RouteContext) {
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

    await prisma.update.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: 'Update deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting update:', error);
    return NextResponse.json({ error: 'Failed to delete update' }, { status: 500 });
  }
}
