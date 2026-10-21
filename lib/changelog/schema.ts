import {
  EXPORT_FORMAT,
  LIMITS,
  SCHEMA_VERSION,
  type ChangelogExport,
  type ChangelogUpdate,
  type Dataset,
  type Product,
  type Result,
} from './types';
import { customTypesFrom, normalizeTypeName } from './update-types';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function isValidDateString(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidProofUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
  } catch {
    return false;
  }
}

const PRODUCT_KEYS = ['id', 'name', 'createdAt', 'updatedAt', 'updateCount'];
const UPDATE_KEYS = [
  'id', 'productId', 'productName', 'moduleName', 'title', 'description', 'releaseDate', 'type', 'typeId', 'version', 'proofUrl', 'reviewUrl', 'status', 'createdAt', 'updatedAt',
];

function reqString(
  obj: Record<string, unknown>,
  key: string,
  max: number,
  where: string,
  errors: string[],
): string | undefined {
  const v = obj[key];
  if (typeof v !== 'string' || v.trim() === '') {
    errors.push(`${where}: "${key}" is required and must be a non-empty string.`);
    return undefined;
  }
  if (v.length > max) {
    errors.push(`${where}: "${key}" is longer than ${max} characters.`);
    return undefined;
  }
  return v;
}

function checkUnknownKeys(obj: Record<string, unknown>, allowed: string[], where: string, errors: string[]) {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) errors.push(`${where}: unsupported field "${k}".`);
  }
}

/**
 * Strictly validates a dataset ({products, updates}). Nothing is dropped silently:
 * every problem is reported and the dataset is rejected as a whole.
 */
export function validateDataset(raw: unknown): Result<Dataset> {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['Dataset must be a JSON object.'] };
  if (!Array.isArray(raw.products)) errors.push('"products" must be an array.');
  if (!Array.isArray(raw.updates)) errors.push('"updates" must be an array.');
  if (errors.length) return { ok: false, errors };

  const products: Product[] = [];
  const updates: ChangelogUpdate[] = [];
  const productIds = new Set<string>();
  const updateIds = new Set<string>();

  (raw.products as unknown[]).forEach((p, i) => {
    const where = `products[${i}]`;
    if (!isRecord(p)) return void errors.push(`${where}: must be an object.`);
    checkUnknownKeys(p, PRODUCT_KEYS, where, errors);
    const id = reqString(p, 'id', LIMITS.name, where, errors);
    const name = reqString(p, 'name', LIMITS.name, where, errors);
    if (id === undefined || name === undefined) return;
    if (productIds.has(id)) return void errors.push(`${where}: duplicate product id "${id}".`);
    productIds.add(id);
    products.push({ id, name });
  });

  (raw.updates as unknown[]).forEach((u, i) => {
    const where = `updates[${i}]`;
    if (!isRecord(u)) return void errors.push(`${where}: must be an object.`);
    checkUnknownKeys(u, UPDATE_KEYS, where, errors);
    const id = reqString(u, 'id', LIMITS.name, where, errors);
    const productId = reqString(u, 'productId', LIMITS.name, where, errors);
    const moduleName = reqString(u, 'moduleName', LIMITS.name, where, errors);
    const title = reqString(u, 'title', LIMITS.title, where, errors);
    const description = reqString(u, 'description', LIMITS.description, where, errors);
    const releaseDate = u.releaseDate;
    if (!isValidDateString(releaseDate)) errors.push(`${where}: "releaseDate" must be a valid YYYY-MM-DD date.`);
    const type = reqString(u, 'type', LIMITS.typeName, where, errors);
    let version: string | undefined;
    if (u.version !== undefined && u.version !== null && u.version !== '') {
      if (typeof u.version !== 'string' || u.version.length > LIMITS.version) {
        errors.push(`${where}: "version" must be a string up to ${LIMITS.version} characters.`);
      } else version = u.version;
    }
    let proofUrl: string | undefined;
    const urlCandidate = u.proofUrl ?? u.reviewUrl;
    if (urlCandidate !== undefined && urlCandidate !== null && urlCandidate !== '') {
      if (typeof urlCandidate !== 'string' || urlCandidate.length > LIMITS.proofUrl || !isValidProofUrl(urlCandidate.trim())) {
        errors.push(`${where}: "proofUrl" must be an HTTP(S) URL up to ${LIMITS.proofUrl} characters.`);
      } else proofUrl = urlCandidate.trim();
    }
    if (
      id === undefined || productId === undefined || moduleName === undefined ||
      title === undefined || description === undefined ||
      !isValidDateString(releaseDate) || type === undefined
    ) return;
    if (updateIds.has(id)) return void errors.push(`${where}: duplicate update id "${id}".`);
    updateIds.add(id);
    if (!productIds.has(productId)) {
      return void errors.push(`${where}: productId "${productId}" does not match any product.`);
    }
    const rec: ChangelogUpdate = {
      id, productId, moduleName, title, description, releaseDate, type: normalizeTypeName(type),
    };
    if (version) rec.version = version;
    if (proofUrl) rec.proofUrl = proofUrl;
    if (typeof u.status === 'string' && (u.status === 'DRAFT' || u.status === 'PUBLISHED')) {
      rec.status = u.status;
    }
    updates.push(rec);
  });

  // customTypes is optional (older drafts/exports lack it).
  let customTypes: string[] = [];
  if (raw.customTypes !== undefined) {
    if (!Array.isArray(raw.customTypes) || raw.customTypes.length > LIMITS.customTypes) {
      errors.push(`"customTypes" must be an array of at most ${LIMITS.customTypes} strings.`);
    } else {
      const names: string[] = [];
      raw.customTypes.forEach((t, i) => {
        if (typeof t !== 'string' || !normalizeTypeName(t) || normalizeTypeName(t).length > LIMITS.typeName) {
          errors.push(`customTypes[${i}]: must be a non-empty string up to ${LIMITS.typeName} characters.`);
        } else names.push(t);
      });
      customTypes = names;
    }
  }

  if (errors.length) return { ok: false, errors };
  // Union with types used by updates so no type is ever lost.
  customTypes = customTypesFrom([...customTypes, ...updates.map((u) => u.type)]);
  return { ok: true, value: { products, updates, customTypes }, errors: [] };
}

/** Validates the versioned export envelope plus its dataset. */
export function validateExport(raw: unknown): Result<ChangelogExport> {
  if (!isRecord(raw)) return { ok: false, errors: ['The file must contain a JSON object.'] };
  if (raw.format !== EXPORT_FORMAT) {
    return { ok: false, errors: [`Not a changelog export: "format" must be "${EXPORT_FORMAT}".`] };
  }
  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion)) {
    return { ok: false, errors: ['"schemaVersion" must be an integer.'] };
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [`Unsupported schemaVersion ${raw.schemaVersion}. This application supports version ${SCHEMA_VERSION}.`],
    };
  }
  const ds = validateDataset({ products: raw.products, updates: raw.updates, customTypes: raw.customTypes });
  if (!ds.ok || !ds.value) return { ok: false, errors: ds.errors };
  return {
    ok: true,
    value: {
      format: EXPORT_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      ...ds.value,
    },
    errors: [],
  };
}
