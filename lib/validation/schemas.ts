import { z } from 'zod';

export const LIMITS = {
  name: 120,
  title: 200,
  description: 5000,
  version: 40,
  reviewUrl: 2048,
  typeName: 40,
} as const;

export function normalizeTypeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Validates and normalizes reviewUrl.
 * Returns:
 * - isProvided: boolean (whether the field was present in the payload)
 * - valid: boolean
 * - normalizedUrl: string | null
 * - error?: string
 */
export function processReviewUrl(raw: unknown): {
  isProvided: boolean;
  valid: boolean;
  normalizedUrl: string | null;
  error?: string;
} {
  if (raw === undefined) {
    return { isProvided: false, valid: true, normalizedUrl: null };
  }

  if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return { isProvided: true, valid: true, normalizedUrl: null };
  }

  if (typeof raw !== 'string') {
    return { isProvided: true, valid: false, normalizedUrl: null, error: 'Review URL must be a string.' };
  }

  const trimmed = raw.trim();
  if (trimmed.length > LIMITS.reviewUrl) {
    return { isProvided: true, valid: false, normalizedUrl: null, error: `Review URL must be ${LIMITS.reviewUrl} characters or fewer.` };
  }

  // Reject unsafe schemes explicitly before URL parsing
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return { isProvided: true, valid: false, normalizedUrl: null, error: 'Review URL must use http: or https: scheme.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isProvided: true, valid: false, normalizedUrl: null, error: 'Review URL must use http: or https: scheme.' };
    }
    if (!parsed.hostname) {
      return { isProvided: true, valid: false, normalizedUrl: null, error: 'Review URL must contain a valid hostname.' };
    }
    return { isProvided: true, valid: true, normalizedUrl: parsed.href };
  } catch {
    return { isProvided: true, valid: false, normalizedUrl: null, error: 'Invalid URL format.' };
  }
}

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required.')
    .max(LIMITS.name, `Product name must be ${LIMITS.name} characters or fewer.`),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required.')
    .max(LIMITS.name, `Product name must be ${LIMITS.name} characters or fewer.`),
});

export const createUpdateTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Type name is required.')
    .max(LIMITS.typeName, `Type name must be ${LIMITS.typeName} characters or fewer.`),
});

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createUpdateSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required.'),
  moduleName: z
    .string()
    .trim()
    .min(1, 'Module name is required.')
    .max(LIMITS.name, `Module name must be ${LIMITS.name} characters or fewer.`),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(LIMITS.title, `Title must be ${LIMITS.title} characters or fewer.`),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(LIMITS.description, `Description must be ${LIMITS.description} characters or fewer.`),
  releaseDate: z
    .string()
    .regex(dateRegex, 'Release date must be a valid YYYY-MM-DD date.')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    }, 'Enter a valid calendar date.'),
  typeId: z.string().trim().min(1, 'Update type is required.'),
  version: z
    .string()
    .trim()
    .max(LIMITS.version, `Version must be ${LIMITS.version} characters or fewer.`)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  reviewUrl: z.unknown().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
});

export const editUpdateSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required.').optional(),
  moduleName: z
    .string()
    .trim()
    .min(1, 'Module name is required.')
    .max(LIMITS.name, `Module name must be ${LIMITS.name} characters or fewer.`)
    .optional(),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(LIMITS.title, `Title must be ${LIMITS.title} characters or fewer.`)
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(LIMITS.description, `Description must be ${LIMITS.description} characters or fewer.`)
    .optional(),
  releaseDate: z
    .string()
    .regex(dateRegex, 'Release date must be a valid YYYY-MM-DD date.')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    }, 'Enter a valid calendar date.')
    .optional(),
  typeId: z.string().trim().min(1, 'Update type is required.').optional(),
  version: z
    .string()
    .trim()
    .max(LIMITS.version, `Version must be ${LIMITS.version} characters or fewer.`)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  reviewUrl: z.unknown().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});
