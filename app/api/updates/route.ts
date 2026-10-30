import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { verifySessionToken, SESSION_COOKIE_NAME, authenticateEmployee } from '@/lib/auth/session';
import { createUpdateSchema, processReviewUrl } from '@/lib/validation/schemas';

export function formatUpdateResponse(u: {
  id: string;
  productId: string;
  moduleName: string;
  title: string;
  description: string;
  releaseDate: Date;
  typeId: string;
  version: string | null;
  reviewUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
  updatedAt: Date;
  product?: { id: string; name: string };
  updateType?: { id: string; name: string; normalizedName: string; isDefault: boolean };
}) {
  const releaseDateStr = u.releaseDate.toISOString().slice(0, 10);
  return {
    id: u.id,
    productId: u.productId,
    productName: u.product?.name ?? '',
    moduleName: u.moduleName,
    title: u.title,
    description: u.description,
    releaseDate: releaseDateStr,
    typeId: u.typeId,
    type: u.updateType?.name ?? '',
    version: u.version ?? undefined,
    reviewUrl: u.reviewUrl ?? null,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    product: u.product,
    updateType: u.updateType,
  };
}

// GET /api/updates - retrieve updates with filtering, search, sorting and pagination
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Check authorization: public visitors can ONLY see PUBLISHED updates
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const isEmployee = await verifySessionToken(token);

    const where: any = {};

    if (!isEmployee) {
      // Force PUBLISHED status for public requests regardless of query params
      where.status = 'PUBLISHED';
    } else {
      const statusParam = searchParams.get('status')?.toUpperCase();
      if (statusParam === 'DRAFT' || statusParam === 'PUBLISHED') {
        where.status = statusParam;
      }
      // If 'ALL' or empty, employee sees all updates
    }

    // Filter by productId
    const productId = searchParams.get('productId');
    if (productId) {
      where.productId = productId;
    }

    // Filter by typeId
    const typeId = searchParams.get('typeId');
    if (typeId) {
      where.typeId = typeId;
    }

    // Filter by moduleName
    const moduleName = searchParams.get('moduleName');
    if (moduleName) {
      where.moduleName = { contains: moduleName };
    }

    // Filter by search query (across product name, module, title, description)
    const search = searchParams.get('search')?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { moduleName: { contains: search } },
        { product: { name: { contains: search } } },
      ];
    }

    // Filter by year & month
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');
    if (yearStr) {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) {
        if (monthStr) {
          const month = parseInt(monthStr, 10);
          if (!isNaN(month) && month >= 1 && month <= 12) {
            const startDate = new Date(Date.UTC(year, month - 1, 1));
            const endDate = new Date(Date.UTC(year, month, 1));
            where.releaseDate = { gte: startDate, lt: endDate };
          }
        } else {
          const startDate = new Date(Date.UTC(year, 0, 1));
          const endDate = new Date(Date.UTC(year + 1, 0, 1));
          where.releaseDate = { gte: startDate, lt: endDate };
        }
      }
    }

    // Sorting: default newest release dates first, with latest created on top
    const sort = searchParams.get('sort')?.toLowerCase();
    const orderBy: any =
      sort === 'oldest'
        ? [{ releaseDate: 'asc' }, { createdAt: 'asc' }]
        : [{ releaseDate: 'desc' }, { createdAt: 'desc' }];

    // Pagination
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
    const limitParam = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Math.min(200, Math.max(1, isNaN(limitParam) ? 100 : limitParam));
    const skip = (page - 1) * limit;

    const [total, updates] = await Promise.all([
      prisma.update.count({ where }),
      prisma.update.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true } },
          updateType: { select: { id: true, name: true, normalizedName: true, isDefault: true } },
        },
      }),
    ]);

    return NextResponse.json({
      updates: updates.map(formatUpdateResponse),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching updates:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve updates' },
      { status: 500 }
    );
  }
}

// POST /api/updates - create an update (employee session required)
export async function POST(req: NextRequest) {
  const auth = await authenticateEmployee(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = createUpdateSchema.safeParse(body);

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

    // Validate review URL
    const processedUrl = processReviewUrl(rawReviewUrl);
    if (!processedUrl.valid) {
      return NextResponse.json(
        { error: processedUrl.error || 'Invalid review URL' },
        { status: 400 }
      );
    }

    // Verify product exists
    const productExists = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!productExists) {
      return NextResponse.json(
        { error: 'Specified product does not exist.' },
        { status: 400 }
      );
    }

    // Verify update type exists
    const typeExists = await prisma.updateType.findUnique({
      where: { id: typeId },
    });
    if (!typeExists) {
      return NextResponse.json(
        { error: 'Specified update type does not exist.' },
        { status: 400 }
      );
    }

    const [y, m, d] = releaseDate.split('-').map(Number);
    const releaseDateTime = new Date(Date.UTC(y, m - 1, d));

    const created = await prisma.update.create({
      data: {
        productId,
        moduleName,
        title,
        description,
        releaseDate: releaseDateTime,
        typeId,
        version: version || null,
        reviewUrl: processedUrl.normalizedUrl,
        status: status || 'DRAFT',
      },
      include: {
        product: { select: { id: true, name: true } },
        updateType: { select: { id: true, name: true, normalizedName: true, isDefault: true } },
      },
    });

    return NextResponse.json(
      { update: formatUpdateResponse(created) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating update:', error);
    return NextResponse.json(
      { error: 'Failed to create update' },
      { status: 500 }
    );
  }
}
