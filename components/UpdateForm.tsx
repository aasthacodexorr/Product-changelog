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

interface Props {
  products: Product[];
  types: string[];
  onAddType: (name: string) => Result<string>;
  defaultProductId: string;
  editing: ChangelogUpdate | null;
  onSubmit: (input: UpdateInput) => FieldErrors | null;
  onCancel: () => void;
}

function Field({ label, error, required, children, id }: { label: string; error?: string; required?: boolean; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label} {required ? <span className="text-[#f85149]" aria-hidden>*</span> : <span className="text-xs text-[#8b949e]">(optional)</span>}
      </label>
      {children}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-[#f85149]">{error}</p>}
    </div>
  );
}

export function UpdateForm({ products, types, onAddType, defaultProductId, editing, onSubmit, onCancel }: Props) {
  const [input, setInput] = useState<UpdateInput>(editing ? inputFromUpdate(editing) : emptyInput(defaultProductId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [newType, setNewType] = useState<string | null>(null);
  const [typeErrors, setTypeErrors] = useState<string[]>([]);

  const submitType = () => {
    const r = onAddType(newType ?? '');
    if (!r.ok || !r.value) return setTypeErrors(r.errors);
    set('type', r.value as UpdateInput['type']);
    setErrors((e) => ({ ...e, type: undefined }));
    setNewType(null);
    setTypeErrors([]);
  };
  const set = <K extends keyof UpdateInput>(k: K, v: UpdateInput[K]) => setInput((s) => ({ ...s, [k]: v }));
  const ad = (k: keyof UpdateInput) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `f-${k}-err` : undefined });

  return (
    <Modal title={editing ? 'Edit update' : 'Add update'} onClose={onCancel} wide>
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const errs = onSubmit(input);
          if (errs) setErrors(errs);
        }}
      >
        <Field id="f-productId" label="Product" required error={errors.productId}>
          <select id="f-productId" className="field" value={input.productId} onChange={(e) => set('productId', e.target.value)} {...ad('productId')}>
            <option value="">Select a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="f-moduleName" label="Module name" required error={errors.moduleName}>
            <input id="f-moduleName" className="field" value={input.moduleName} onChange={(e) => set('moduleName', e.target.value)} {...ad('moduleName')} />
          </Field>
          <Field id="f-version" label="Version" error={errors.version}>
            <input id="f-version" className="field" placeholder="e.g. 2.4.0" value={input.version} onChange={(e) => set('version', e.target.value)} {...ad('version')} />
          </Field>
        </div>
        <Field id="f-title" label="Update title" required error={errors.title}>
          <input id="f-title" className="field" value={input.title} onChange={(e) => set('title', e.target.value)} {...ad('title')} />
        </Field>
        <Field id="f-description" label="Description" required error={errors.description}>
          <textarea id="f-description" rows={4} className="field" value={input.description} onChange={(e) => set('description', e.target.value)} {...ad('description')} />
        </Field>
        <Field id="f-proofUrl" label="Proof URL" error={errors.proofUrl}>
          <input id="f-proofUrl" type="url" className="field" placeholder="https://example.com/inventory" value={input.proofUrl} onChange={(e) => set('proofUrl', e.target.value)} {...ad('proofUrl')} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="f-releaseDate" label="Release date" required error={errors.releaseDate}>
            <input id="f-releaseDate" type="date" className="field" value={input.releaseDate} onChange={(e) => set('releaseDate', e.target.value)} {...ad('releaseDate')} />
          </Field>
          <Field id="f-type" label="Update type" required error={errors.type}>
            <div className="flex gap-2">
              <select id="f-type" className="field" value={input.type} onChange={(e) => set('type', e.target.value as UpdateInput['type'])} {...ad('type')}>
                <option value="">Select a type…</option>
                {types.map((t) => <option key={t}>{t}</option>)}
              </select>
              <button type="button" className="btn shrink-0" onClick={() => { setNewType(''); setTypeErrors([]); }}>+ New type</button>
            </div>
          </Field>
        </div>
        {newType !== null && (
          <div className="card space-y-2 p-3">
            <label htmlFor="f-newtype" className="block text-sm font-medium">New type name</label>
            <div className="flex gap-2">
              <input id="f-newtype" autoFocus className="field" value={newType} aria-invalid={typeErrors.length > 0}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitType(); } }} />
              <button type="button" className="btn btn-primary shrink-0" onClick={submitType}>Add type</button>
              <button type="button" className="btn shrink-0" onClick={() => setNewType(null)}>Cancel</button>
            </div>
            {typeErrors.map((e) => <p key={e} role="alert" className="text-xs text-[#f85149]">{e}</p>)}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Add update'}</button>
        </div>
      </form>
    </Modal>
  );
}
