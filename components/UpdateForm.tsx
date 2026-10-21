'use client';

import { useState } from 'react';
import {
  emptyInput,
  inputFromUpdate,
  type ChangelogUpdate,
  type FieldErrors,
  type Product,
  type Result,
  type UpdateInput,
} from '@/lib/changelog';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

export interface TypeOption {
  id: string;
  name: string;
}

interface Props {
  products: Product[];
  types: (string | TypeOption)[];
  onAddType?: (name: string) => Promise<Result<string>> | Result<string>;
  defaultProductId?: string;
  editing: ChangelogUpdate | null;
  onSubmit: (input: UpdateInput) => Promise<FieldErrors | null> | FieldErrors | null;
  onCancel: () => void;
}

function Field({
  label,
  error,
  required,
  children,
  id,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label} {required ? <span className="text-[#f85149]" aria-hidden>*</span> : null}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-[#f85149]">
          {error}
        </p>
      )}
    </div>
  );
}

export function UpdateForm({
  products,
  types,
  onAddType,
  defaultProductId = '',
  editing,
  onSubmit,
  onCancel,
}: Props) {
  const [input, setInput] = useState<UpdateInput>(
    editing ? inputFromUpdate(editing) : emptyInput(defaultProductId)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [newType, setNewType] = useState<string | null>(null);
  const [typeErrors, setTypeErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addingType, setAddingType] = useState(false);

  // Normalize types list to support both string[] and TypeOption[]
  const normalizedTypes: TypeOption[] = types.map((t) =>
    typeof t === 'string' ? { id: t, name: t } : t
  );

  const submitType = async () => {
    if (!onAddType) return;
    setAddingType(true);
    try {
      const r = await onAddType(newType ?? '');
      if (!r.ok || !r.value) return setTypeErrors(r.errors);
      set('type', r.value);
      setErrors((e) => ({ ...e, type: undefined }));
      setNewType(null);
      setTypeErrors([]);
    } finally {
      setAddingType(false);
    }
  };

  const set = <K extends keyof UpdateInput>(k: K, v: UpdateInput[K]) =>
    setInput((s) => ({ ...s, [k]: v }));

  const ad = (k: keyof UpdateInput) => ({
    'aria-invalid': !!errors[k],
    'aria-describedby': errors[k] ? `f-${k}-err` : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const errs = await onSubmit(input);
      if (errs) {
        setErrors(errs);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={editing ? 'Edit update' : 'Add update'} onClose={onCancel} wide>
      <form noValidate className="space-y-3" onSubmit={handleSubmit}>
        <Field id="f-productId" label="Product" required error={errors.productId}>
          <select
            id="f-productId"
            className="field"
            value={input.productId}
            onChange={(e) => set('productId', e.target.value)}
            {...ad('productId')}
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="f-moduleName" label="Module name" required error={errors.moduleName}>
            <input
              id="f-moduleName"
              className="field"
              placeholder="e.g. Authentication, Billing, Dashboard"
              value={input.moduleName}
              onChange={(e) => set('moduleName', e.target.value)}
              {...ad('moduleName')}
            />
          </Field>
          <Field id="f-version" label="Version" error={errors.version}>
            <input
              id="f-version"
              className="field"
              placeholder="e.g. 2.4.0 (optional)"
              value={input.version}
              onChange={(e) => set('version', e.target.value)}
              {...ad('version')}
            />
          </Field>
        </div>

        <Field id="f-title" label="Update title" required error={errors.title}>
          <input
            id="f-title"
            className="field"
            placeholder="e.g. Export audit logs to CSV"
            value={input.title}
            onChange={(e) => set('title', e.target.value)}
            {...ad('title')}
          />
        </Field>

        <Field id="f-description" label="Description" required error={errors.description}>
          <textarea
            id="f-description"
            rows={4}
            className="field"
            placeholder="Provide a detailed explanation of the change..."
            value={input.description}
            onChange={(e) => set('description', e.target.value)}
            {...ad('description')}
          />
        </Field>

        <Field id="f-reviewUrl" label="Review URL (Optional)" error={errors.reviewUrl || errors.proofUrl}>
          <input
            id="f-reviewUrl"
            type="url"
            className="field"
            placeholder="https://github.com/org/repo/pull/123 or https://example.com/docs"
            value={input.reviewUrl || input.proofUrl || ''}
            onChange={(e) => {
              set('reviewUrl', e.target.value);
              set('proofUrl', e.target.value);
            }}
            {...ad('reviewUrl')}
          />
          <p className="mt-1 text-xs text-[#8b949e]">
            Optional link to a pull request, ticket, or documentation (must start with http:// or https://)
          </p>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="f-releaseDate" label="Release date" required error={errors.releaseDate}>
            <input
              id="f-releaseDate"
              type="date"
              className="field"
              value={input.releaseDate}
              onChange={(e) => set('releaseDate', e.target.value)}
              {...ad('releaseDate')}
            />
          </Field>

          <Field id="f-type" label="Update type" required error={errors.type}>
            <div className="flex gap-2">
              <select
                id="f-type"
                className="field"
                value={input.type}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const found = normalizedTypes.find((t) => t.name === selectedName);
                  set('type', selectedName);
                  if (found) set('typeId', found.id);
                }}
                {...ad('type')}
              >
                <option value="">Select a type…</option>
                {normalizedTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              {onAddType && (
                <button
                  type="button"
                  className="btn shrink-0"
                  onClick={() => {
                    setNewType('');
                    setTypeErrors([]);
                  }}
                >
                  + New type
                </button>
              )}
            </div>
          </Field>
        </div>

        <Field id="f-status" label="Status">
          <select
            id="f-status"
            className="field"
            value={input.status || 'DRAFT'}
            onChange={(e) => set('status', e.target.value as 'DRAFT' | 'PUBLISHED')}
          >
            <option value="DRAFT">Draft (visible to employees only)</option>
            <option value="PUBLISHED">Published (visible to clients)</option>
          </select>
        </Field>

        {newType !== null && (
          <div className="card space-y-2 p-3">
            <label htmlFor="f-newtype" className="block text-sm font-medium">
              New type name
            </label>
            <div className="flex gap-2">
              <input
                id="f-newtype"
                autoFocus
                className="field"
                placeholder="e.g. Performance"
                value={newType}
                aria-invalid={typeErrors.length > 0}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    submitType();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary shrink-0"
                onClick={submitType}
                disabled={addingType}
              >
                {addingType ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" />
                    <span>Adding…</span>
                  </>
                ) : (
                  'Add type'
                )}
              </button>
              <button type="button" className="btn shrink-0" onClick={() => setNewType(null)}>
                Cancel
              </button>
            </div>
            {typeErrors.map((err) => (
              <p key={err} role="alert" className="text-xs text-[#f85149]">
                {err}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>{editing ? 'Saving…' : 'Adding…'}</span>
              </>
            ) : editing ? (
              'Save changes'
            ) : (
              'Add update'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
