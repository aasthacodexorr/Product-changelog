import { isValidDateString, isValidProofUrl } from './schema';
import { allTypes, canonicalType, normalizeTypeName } from './update-types';
import {
  LIMITS,
  type ChangelogUpdate,
  type Dataset,
  type FieldErrors,
  type Product,
  type Result,
  type UpdateInput,
} from './types';

/** Today's date in the user's local time zone as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function newId(prefix: string): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  const rand =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

export function emptyInput(productId = ''): UpdateInput {
  return {
    productId,
    moduleName: '',
    title: '',
    description: '',
    releaseDate: todayLocal(),
    type: '',
    version: '',
    reviewUrl: '',
    proofUrl: '',
  };
}

export function inputFromUpdate(u: ChangelogUpdate): UpdateInput {
  const url = u.reviewUrl || u.proofUrl || '';
  const input: UpdateInput = {
    productId: u.productId,
    moduleName: u.moduleName,
    title: u.title,
    description: u.description,
    releaseDate: u.releaseDate,
    type: u.type,
    version: u.version ?? '',
    reviewUrl: url,
    proofUrl: url,
  };
  if (u.typeId) input.typeId = u.typeId;
  if (u.status) input.status = u.status;
  return input;
}

export function validateUpdateInput(input: UpdateInput, products: Product[], types?: string[]): FieldErrors {
  const e: FieldErrors = {};
  if (!input.productId || !products.some((p) => p.id === input.productId)) e.productId = 'Product is required.';
  const title = input.title ? input.title.trim() : '';
  if (!title) e.title = 'Update title is required.';
  else if (title.length > LIMITS.title) e.title = `Title must be ${LIMITS.title} characters or fewer.`;

  if (!input.releaseDate) e.releaseDate = 'Release date is required.';
  else if (!isValidDateString(input.releaseDate)) e.releaseDate = 'Enter a valid date.';

  if (!input.type || !normalizeTypeName(input.type)) e.type = 'Update type is required.';
  else if (types && !canonicalType(input.type, types)) e.type = 'Unknown update type.';

  // Optional fields
  if (input.moduleName && input.moduleName.trim().length > LIMITS.name) {
    e.moduleName = `Module name must be ${LIMITS.name} characters or fewer.`;
  }
  if (input.description && input.description.trim().length > LIMITS.description) {
    e.description = `Description must be ${LIMITS.description} characters or fewer.`;
  }
  if (input.version && input.version.trim().length > LIMITS.version) {
    e.version = `Version must be ${LIMITS.version} characters or fewer.`;
  }
  const url = (input.reviewUrl || input.proofUrl || '').trim();
  if (url && (url.length > LIMITS.reviewUrl || !isValidProofUrl(url))) {
    e.reviewUrl = `Enter a valid HTTP(S) URL up to ${LIMITS.reviewUrl} characters.`;
    e.proofUrl = e.reviewUrl;
  }
  return e;
}

function toUpdate(id: string, input: UpdateInput, types: string[]): ChangelogUpdate {
  const u: ChangelogUpdate = {
    id,
    productId: input.productId,
    moduleName: input.moduleName.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    releaseDate: input.releaseDate,
    type: types ? (canonicalType(input.type, types) ?? normalizeTypeName(input.type)) : normalizeTypeName(input.type),
  };
  const v = input.version.trim();
  if (v) u.version = v;
  const proofUrl = (input.reviewUrl || input.proofUrl || '').trim();
  if (proofUrl) {
    u.proofUrl = proofUrl;
  }
  if (input.typeId) u.typeId = input.typeId;
  if (input.status) u.status = input.status;
  return u;
}

export type MutationResult = { ok: true; dataset: Dataset; id: string } | { ok: false; errors: FieldErrors };

export function createUpdate(ds: Dataset, input: UpdateInput): MutationResult {
  const types = allTypes(ds);
  const errors = validateUpdateInput(input, ds.products, types);
  if (Object.keys(errors).length) return { ok: false, errors };
  const id = newId('upd');
  return { ok: true, id, dataset: { ...ds, updates: [...ds.updates, toUpdate(id, input, types)] } };
}

export function editUpdate(ds: Dataset, id: string, input: UpdateInput): MutationResult {
  if (!ds.updates.some((u) => u.id === id)) return { ok: false, errors: { title: 'This update no longer exists.' } };
  const types = allTypes(ds);
  const errors = validateUpdateInput(input, ds.products, types);
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    id,
    dataset: { ...ds, updates: ds.updates.map((u) => (u.id === id ? toUpdate(id, input, types) : u)) },
  };
}

export function deleteUpdate(ds: Dataset, id: string): Dataset {
  return { ...ds, updates: ds.updates.filter((u) => u.id !== id) };
}

export function addProduct(ds: Dataset, rawName: string): Result<{ dataset: Dataset; product: Product }> {
  const name = rawName.trim();
  if (!name) return { ok: false, errors: ['Product name is required.'] };
  if (name.length > LIMITS.name) return { ok: false, errors: [`Product name must be ${LIMITS.name} characters or fewer.`] };
  if (ds.products.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, errors: ['A product with this name already exists.'] };
  }
  const product: Product = { id: newId('prod'), name };
  return { ok: true, errors: [], value: { product, dataset: { ...ds, products: [...ds.products, product] } } };
}
