'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

export function AddProductDialog({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string) => Promise<string[] | null> | string[] | null;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title="Add product" onClose={onCancel}>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const errs = await onAdd(name);
            if (errs) setErrors(errs);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label htmlFor="product-name" className="mb-1 block text-sm font-medium">
          Product name
        </label>
        <input
          id="product-name"
          autoFocus
          disabled={submitting}
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.length > 0}
        />
        {errors.map((e) => (
          <p key={e} role="alert" className="mt-1 text-xs text-[#f85149]">
            {e}
          </p>
        ))}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>Adding…</span>
              </>
            ) : (
              'Add product'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
