'use client';

import { useState, useEffect } from 'react';
import { type Product, type ApiUpdateType } from '@/lib/changelog';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

interface Props {
  products: Product[];
  types: ApiUpdateType[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

type Tab = 'products' | 'types';

export function ManageDialog({ products, types, onClose, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('products');

  // Maintain local state to allow instantaneous, flicker-free optimistic updates
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localTypes, setLocalTypes] = useState<ApiUpdateType[]>(types);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  useEffect(() => {
    setLocalTypes(types);
  }, [types]);

  // Product tab states
  const [newProductName, setNewProductName] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Type tab states
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);

  // --- Product Handlers ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProductName.trim();
    if (!name) {
      setProductError('Product name is required.');
      return;
    }

    setAddingProduct(true);
    setProductError(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProductError(data.error || 'Failed to add product');
        return;
      }
      setNewProductName('');
      if (data.product) {
        setLocalProducts((prev) => [...prev, data.product]);
      }
      await onRefresh();
    } catch {
      setProductError('Network error while adding product.');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleSaveProduct = async (id: string) => {
    const name = editingProductName.trim();
    if (!name) {
      setProductError('Product name is required.');
      return;
    }

    // Immediately trigger shimmer card skeleton for this row
    setSavingProductId(id);
    setProductError(null);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProductError(data.error || 'Failed to update product name');
        setSavingProductId(null);
        return;
      }

      // Immediately update local state with the confirmed updated product from server
      if (data.product) {
        setLocalProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...data.product } : p))
        );
      }
      // Exit edit mode immediately so when shimmer resolves, the new value shows with zero flicker
      setEditingProductId(null);
      setSavingProductId(null);

      // Refresh parent dataset in background
      await onRefresh();
    } catch {
      setProductError('Network error while updating product.');
      setSavingProductId(null);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Are you sure you want to delete product "${p.name}"?`)) {
      return;
    }

    setDeletingProductId(p.id);
    setProductError(null);
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProductError(data.error || 'Failed to delete product');
        setDeletingProductId(null);
        return;
      }
      setLocalProducts((prev) => prev.filter((item) => item.id !== p.id));
      setDeletingProductId(null);
      await onRefresh();
    } catch {
      setProductError('Network error while deleting product.');
      setDeletingProductId(null);
    }
  };

  // --- Update Type Handlers ---
  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTypeName.trim();
    if (!name) {
      setTypeError('Type name is required.');
      return;
    }

    setAddingType(true);
    setTypeError(null);
    try {
      const res = await fetch('/api/update-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTypeError(data.error || 'Failed to add update type');
        return;
      }
      setNewTypeName('');
      if (data.updateType) {
        setLocalTypes((prev) => [...prev, data.updateType]);
      }
      await onRefresh();
    } catch {
      setTypeError('Network error while adding update type.');
    } finally {
      setAddingType(false);
    }
  };

  const handleSaveType = async (id: string) => {
    const name = editingTypeName.trim();
    if (!name) {
      setTypeError('Type name is required.');
      return;
    }

    // Immediately trigger shimmer card skeleton for this row
    setSavingTypeId(id);
    setTypeError(null);
    try {
      const res = await fetch(`/api/update-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTypeError(data.error || 'Failed to update type');
        setSavingTypeId(null);
        return;
      }

      // Immediately update local state with the confirmed updated type from server
      if (data.updateType) {
        setLocalTypes((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...data.updateType } : t))
        );
      }
      // Exit edit mode immediately so when shimmer resolves, the new value shows with zero flicker
      setEditingTypeId(null);
      setSavingTypeId(null);

      // Refresh parent dataset in background
      await onRefresh();
    } catch {
      setTypeError('Network error while updating type.');
      setSavingTypeId(null);
    }
  };

  const handleDeleteType = async (t: ApiUpdateType) => {
    if (!confirm(`Are you sure you want to delete update type "${t.name}"?`)) {
      return;
    }

    setDeletingTypeId(t.id);
    setTypeError(null);
    try {
      const res = await fetch(`/api/update-types/${t.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTypeError(data.error || 'Failed to delete update type');
        setDeletingTypeId(null);
        return;
      }
      setLocalTypes((prev) => prev.filter((item) => item.id !== t.id));
      setDeletingTypeId(null);
      await onRefresh();
    } catch {
      setTypeError('Network error while deleting update type.');
      setDeletingTypeId(null);
    }
  };

  return (
    <Modal title="Manage Products & Update Types" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-md border border-[#2e8cff] p-0.5" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'products'}
            onClick={() => {
              setActiveTab('products');
              setProductError(null);
            }}
            className={`flex-1 cursor-pointer rounded py-1.5 text-center text-sm font-medium transition-colors ${
              activeTab === 'products'
                ? 'bg-[#2e8cff] text-white'
                : 'text-[#2e8cff] hover:bg-[#2e8cff]/10'
            }`}
          >
            Products ({localProducts.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'types'}
            onClick={() => {
              setActiveTab('types');
              setTypeError(null);
            }}
            className={`flex-1 cursor-pointer rounded py-1.5 text-center text-sm font-medium transition-colors ${
              activeTab === 'types'
                ? 'bg-[#2e8cff] text-white'
                : 'text-[#2e8cff] hover:bg-[#2e8cff]/10'
            }`}
          >
            Update Types ({localTypes.length})
          </button>
        </div>

        {/* --- Tab 1: Products --- */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {productError && (
              <div
                role="alert"
                className="rounded-md border border-[#dc2626] bg-[#dc2626]/10 p-2.5 text-xs text-[#dc2626]"
              >
                {productError}
              </div>
            )}

            {/* Quick Add Product */}
            <form onSubmit={handleAddProduct} className="flex gap-2">
              <input
                className="field flex-1"
                placeholder="New product name (e.g. Analytics Dashboard)"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                disabled={addingProduct}
              />
              <button
                type="submit"
                className="btn btn-primary shrink-0"
                disabled={addingProduct || !newProductName.trim()}
              >
                {addingProduct ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" />
                    <span>Adding…</span>
                  </>
                ) : (
                  '+ Add product'
                )}
              </button>
            </form>

            {/* Products List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {/* Show shimmer card while adding a new product */}
              {addingProduct && (
                <div className="card flex items-center justify-between gap-3 p-3 border border-[#f5f5f5] bg-[#fafafa] animate-pulse">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-4.5 w-44 rounded bg-[#f5f5f5]" />
                    <div className="h-4 w-16 rounded-full bg-[#f5f5f5]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-11 rounded bg-[#f5f5f5]" />
                    <div className="h-6 w-12 rounded bg-[#f5f5f5]" />
                  </div>
                </div>
              )}

              {localProducts.length === 0 && !addingProduct ? (
                <p className="py-6 text-center text-sm text-[#666]">No products added yet.</p>
              ) : (
                localProducts.map((p) => {
                  const isEditing = editingProductId === p.id;
                  const isSaving = savingProductId === p.id;
                  const isDeleting = deletingProductId === p.id;

                  // Render shimmer skeleton while the product is being saved or deleted
                  if (isSaving || isDeleting) {
                    return (
                      <div
                        key={p.id}
                        className="card flex items-center justify-between gap-3 p-3 border border-[#f5f5f5] bg-[#fafafa] animate-pulse"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="h-4.5 w-40 rounded bg-[#f5f5f5]" />
                          <div className="h-4 w-16 rounded-full bg-[#f5f5f5]" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-11 rounded bg-[#f5f5f5]" />
                          <div className="h-6 w-12 rounded bg-[#f5f5f5]" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={p.id}
                      className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                    >
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            autoFocus
                            className="field flex-1 text-sm py-1"
                            value={editingProductName}
                            onChange={(e) => setEditingProductName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveProduct(p.id);
                              if (e.key === 'Escape') setEditingProductId(null);
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary shrink-0 text-xs py-1"
                            onClick={() => handleSaveProduct(p.id)}
                            disabled={isSaving}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn shrink-0 text-xs py-1"
                            onClick={() => setEditingProductId(null)}
                            disabled={isSaving}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#2e8cff]">{p.name}</span>
                            {typeof p.updateCount === 'number' && (
                              <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#666]">
                                {p.updateCount} update{p.updateCount === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="btn text-xs py-1 px-2.5"
                              onClick={() => {
                                setEditingProductId(p.id);
                                setEditingProductName(p.name);
                                setProductError(null);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger text-xs py-1 px-2.5"
                              onClick={() => handleDeleteProduct(p)}
                              disabled={isDeleting}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- Tab 2: Update Types --- */}
        {activeTab === 'types' && (
          <div className="space-y-4">
            {typeError && (
              <div
                role="alert"
                className="rounded-md border border-[#dc2626] bg-[#dc2626]/10 p-2.5 text-xs text-[#dc2626]"
              >
                {typeError}
              </div>
            )}

            {/* Quick Add Custom Type */}
            <form onSubmit={handleAddType} className="flex gap-2">
              <input
                className="field flex-1"
                placeholder="New custom type (e.g. Performance Improvement)"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                disabled={addingType}
              />
              <button
                type="submit"
                className="btn btn-primary shrink-0"
                disabled={addingType || !newTypeName.trim()}
              >
                {addingType ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" />
                    <span>Adding…</span>
                  </>
                ) : (
                  '+ Add type'
                )}
              </button>
            </form>

            {/* Types List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {/* Show shimmer card while adding a new custom type */}
              {addingType && (
                <div className="card flex items-center justify-between gap-3 p-3 border border-[#f5f5f5] bg-[#fafafa] animate-pulse">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-4.5 w-40 rounded bg-[#f5f5f5]" />
                    <div className="h-4 w-16 rounded-full bg-[#f5f5f5]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-11 rounded bg-[#f5f5f5]" />
                    <div className="h-6 w-12 rounded bg-[#f5f5f5]" />
                  </div>
                </div>
              )}

              {localTypes.length === 0 && !addingType ? (
                <p className="py-6 text-center text-sm text-[#666]">No update types found.</p>
              ) : (
                localTypes.map((t) => {
                  const isEditing = editingTypeId === t.id;
                  const isSaving = savingTypeId === t.id;
                  const isDeleting = deletingTypeId === t.id;

                  // Render shimmer skeleton while the update type is being saved or deleted
                  if (isSaving || isDeleting) {
                    return (
                      <div
                        key={t.id}
                        className="card flex items-center justify-between gap-3 p-3 border border-[#f5f5f5] bg-[#fafafa] animate-pulse"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="h-4.5 w-36 rounded bg-[#f5f5f5]" />
                          <div className="h-4 w-16 rounded-full bg-[#f5f5f5]" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-11 rounded bg-[#f5f5f5]" />
                          <div className="h-6 w-12 rounded bg-[#f5f5f5]" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={t.id}
                      className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                    >
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            autoFocus
                            className="field flex-1 text-sm py-1"
                            value={editingTypeName}
                            onChange={(e) => setEditingTypeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveType(t.id);
                              if (e.key === 'Escape') setEditingTypeId(null);
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary shrink-0 text-xs py-1"
                            onClick={() => handleSaveType(t.id)}
                            disabled={isSaving}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn shrink-0 text-xs py-1"
                            onClick={() => setEditingTypeId(null)}
                            disabled={isSaving}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#2e8cff]">{t.name}</span>
                            {t.isDefault ? (
                              <span className="rounded-full bg-[#2e8cff]/15 border border-[#2e8cff]/40 px-2 py-0.5 text-xs text-[#2e8cff]">
                                Default
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#10b981]/15 border border-[#10b981]/40 px-2 py-0.5 text-xs text-[#10b981]">
                                Custom
                              </span>
                            )}
                            {typeof t.updateCount === 'number' && (
                              <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#666]">
                                {t.updateCount} update{t.updateCount === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="btn text-xs py-1 px-2.5"
                              onClick={() => {
                                setEditingTypeId(t.id);
                                setEditingTypeName(t.name);
                                setTypeError(null);
                              }}
                            >
                              Edit
                            </button>
                            {t.isDefault ? (
                              <span
                                className="text-xs text-[#666] italic px-2"
                                title="Default types cannot be deleted"
                              >
                                Protected
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-danger text-xs py-1 px-2.5"
                                onClick={() => handleDeleteType(t)}
                                disabled={isDeleting}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[#2e8cff]">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
