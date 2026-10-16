'use client';

import { useState } from 'react';
import { Modal } from './Modal';

export function AddProductDialog({ onAdd, onCancel }: { onAdd: (name: string) => string[] | null; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <Modal title="Add product" onClose={onCancel}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const errs = onAdd(name);
          if (errs) setErrors(errs);
        }}
      >
        <label htmlFor="product-name" className="mb-1 block text-sm font-medium">Product name</label>
        <input id="product-name" autoFocus className="field" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={errors.length > 0} />
        {errors.map((e) => <p key={e} role="alert" className="mt-1 text-xs text-[#f85149]">{e}</p>)}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary">Add product</button>
        </div>
      </form>
    </Modal>
  );
}
