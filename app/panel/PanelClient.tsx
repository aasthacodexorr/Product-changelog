'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  filterUpdatesByProduct,
  type ChangelogUpdate,
  type Product,
  type ApiUpdateType,
  type UpdateInput,
  type FieldErrors,
} from '@/lib/changelog';
import { MonthlyChangelog } from '@/components/MonthlyChangelog';
import { ProductSearch } from '@/components/ProductSearch';
import { UpdateForm } from '@/components/UpdateForm';
import { AddProductDialog } from '@/components/AddProductDialog';
import { ConfirmDialog } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { ChangelogSkeleton } from '@/components/ChangelogSkeleton';

type FilterTab = 'all' | 'published' | 'draft';

export function PanelClient() {
  const router = useRouter();
  const [updates, setUpdates] = useState<ChangelogUpdate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [types, setTypes] = useState<ApiUpdateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ editing: ChangelogUpdate | null } | null>(null);
  const [addingProduct, setAddingProduct] = useState<{ thenAddUpdate: boolean } | null>(null);
  const [deleting, setDeleting] = useState<ChangelogUpdate | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [uRes, pRes, tRes] = await Promise.all([
        fetch('/api/updates', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/update-types', { cache: 'no-store' }),
      ]);

      if (uRes.status === 401 || pRes.status === 401) {
        router.push('/panel/login');
        return;
      }

      if (!uRes.ok || !pRes.ok || !tRes.ok) {
        throw new Error('Failed to load employee panel data.');
      }

      const uData = await uRes.json();
      const pData = await pRes.json();
      const tData = await tRes.json();

      setUpdates(uData.updates || []);
      setProducts(pData.products || []);
      setTypes(tData.updateTypes || []);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/panel/login');
      router.refresh();
    }
  };

  // Filter by status tab
  const tabFilteredUpdates = useMemo(() => {
    if (statusFilter === 'published') return updates.filter((u) => u.status === 'PUBLISHED');
    if (statusFilter === 'draft') return updates.filter((u) => u.status === 'DRAFT');
    return updates;
  }, [updates, statusFilter]);

  // Filter by product search query
  const filtering = query.trim() !== '';
  const visible = useMemo(
    () => filterUpdatesByProduct(tabFilteredUpdates, products, query),
    [tabFilteredUpdates, products, query]
  );

  const startAddUpdate = () => {
    if (products.length === 0) {
      setAddingProduct({ thenAddUpdate: true });
    } else {
      setForm({ editing: null });
    }
  };

  const submitUpdate = async (input: UpdateInput): Promise<FieldErrors | null> => {
    try {
      const isEditing = Boolean(form?.editing);
      const url = isEditing ? `/api/updates/${form!.editing!.id}` : '/api/updates';
      const method = isEditing ? 'PUT' : 'POST';

      // Find typeId from update types
      let typeId = input.typeId;
      if (!typeId) {
        const found = types.find((t) => t.name.toLowerCase() === input.type.toLowerCase());
        if (found) typeId = found.id;
      }

      if (!typeId && types.length > 0) {
        typeId = types[0].id;
      }

      const bodyPayload = {
        productId: input.productId,
        moduleName: input.moduleName,
        title: input.title,
        description: input.description,
        releaseDate: input.releaseDate,
        typeId,
        version: input.version || null,
        reviewUrl: input.reviewUrl !== undefined ? input.reviewUrl : null,
        status: input.status || 'DRAFT',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.issues) {
          const fe: FieldErrors = {};
          for (const msg of data.issues) {
            fe.title = msg;
          }
          return fe;
        }
        return { title: data.error || 'Failed to save update' };
      }

      setForm(null);
      flash(isEditing ? 'Update updated successfully.' : 'Update created successfully.');
      await loadAll();
      return null;
    } catch {
      return { title: 'Network or server error occurred.' };
    }
  };

  const handlePublish = async (u: ChangelogUpdate) => {
    setActionLoadingId(u.id);
    try {
      const res = await fetch(`/api/updates/${u.id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flash(`Error: ${err.error || 'Failed to publish'}`);
        return;
      }
      flash(`"${u.title}" published.`);
      await loadAll();
    } catch {
      flash('Error communicating with server.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnpublish = async (u: ChangelogUpdate) => {
    setActionLoadingId(u.id);
    try {
      const res = await fetch(`/api/updates/${u.id}/unpublish`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flash(`Error: ${err.error || 'Failed to unpublish'}`);
        return;
      }
      flash(`"${u.title}" returned to draft.`);
      await loadAll();
    } catch {
      flash('Error communicating with server.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (u: ChangelogUpdate) => {
    setDeletingInProgress(true);
    try {
      const res = await fetch(`/api/updates/${u.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flash(`Error: ${err.error || 'Failed to delete'}`);
        return;
      }
      setDeleting(null);
      flash(`Update "${u.title}" deleted.`);
      await loadAll();
    } catch {
      flash('Error communicating with server.');
    } finally {
      setDeletingInProgress(false);
    }
  };

  const handleAddProduct = async (name: string): Promise<string[] | null> => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return [data.error || 'Failed to add product'];
      }
      const next = addingProduct?.thenAddUpdate;
      setAddingProduct(null);
      flash(`Product "${data.product.name}" created.`);
      await loadAll();
      if (next) setForm({ editing: null });
      return null;
    } catch {
      return ['Network error occurred while adding product.'];
    }
  };

  const handleAddType = async (name: string) => {
    try {
      const res = await fetch('/api/update-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, errors: [data.error || 'Failed to create type'] };
      }
      await loadAll();
      return { ok: true, value: data.updateType.name, errors: [] };
    } catch {
      return { ok: false, errors: ['Network error creating update type.'] };
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e6edf3]">Employee Changelog Panel</h1>
          <p className="text-sm text-[#8b949e]">PostgreSQL Database &middot; Manage drafts and published updates</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/changelog"
            className="rounded-md border border-[#30363d] px-3 py-1 text-sm text-[#8b949e] hover:text-[#e6edf3]"
          >
            Client View &rarr;
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-md border border-[#f85149]/50 bg-[#f85149]/10 px-3 py-1 text-sm text-[#f85149] hover:bg-[#f85149]/20 cursor-pointer inline-flex items-center gap-1.5"
          >
            {loggingOut && <Spinner className="h-3.5 w-3.5" />}
            <span>{loggingOut ? 'Logging out…' : 'Log Out'}</span>
          </button>
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[#f85149]/60 bg-[#f85149]/10 p-3 text-sm text-[#f85149]"
        >
          {errorMessage}
        </div>
      )}

      {/* Filter Tabs and Actions Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-md border border-[#30363d] p-0.5" role="tablist">
            {(['all', 'published', 'draft'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={statusFilter === t}
                onClick={() => setStatusFilter(t)}
                className={`cursor-pointer rounded px-3 py-1 text-sm capitalize ${
                  statusFilter === t ? 'bg-[#30363d] font-medium text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                {t} ({updates.filter((u) => (t === 'all' ? true : u.status?.toLowerCase() === t)).length})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={startAddUpdate}>
              + Add update
            </button>
            <button className="btn" onClick={() => setAddingProduct({ thenAddUpdate: false })}>
              + Add product
            </button>
          </div>
        </div>

        {products.length > 0 && (
          <div>
            <ProductSearch value={query} onChange={setQuery} products={products} />
          </div>
        )}
      </div>

      {loading ? (
        <ChangelogSkeleton monthCount={2} cardsPerMonth={2} withActions={true} />
      ) : updates.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-[#e6edf3]">No updates in database</h2>
          <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-[#8b949e]">
            Start by adding a product and your first changelog update.
          </p>
          <button className="btn btn-primary" onClick={startAddUpdate}>
            + Add update
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-[#e6edf3]">No matching updates</h2>
          <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-[#8b949e]">
            No update matches the current filter or search criteria.
          </p>
          <button className="btn" onClick={() => { setQuery(''); setStatusFilter('all'); }}>
            Reset filters
          </button>
        </div>
      ) : (
        <>
          {filtering && (
            <p className="mb-3 text-sm text-[#8b949e]" role="status">
              {visible.length} update{visible.length === 1 ? '' : 's'} matching “{query.trim()}”
            </p>
          )}
          <MonthlyChangelog
            updates={visible}
            products={products}
            defaultOpen={filtering}
            showStatus={true}
            renderActions={(u) => {
              const isActionLoading = actionLoadingId === u.id;
              return (
                <>
                  {u.status === 'PUBLISHED' ? (
                    <button
                      className="btn cursor-pointer text-xs"
                      onClick={() => handleUnpublish(u)}
                      disabled={isActionLoading}
                      title="Return this update to draft status"
                    >
                      {isActionLoading ? (
                        <>
                          <Spinner className="h-3 w-3" />
                          <span>Unpublishing…</span>
                        </>
                      ) : (
                        'Unpublish'
                      )}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary cursor-pointer text-xs"
                      onClick={() => handlePublish(u)}
                      disabled={isActionLoading}
                      title="Publish this update for client view"
                    >
                      {isActionLoading ? (
                        <>
                          <Spinner className="h-3 w-3" />
                          <span>Publishing…</span>
                        </>
                      ) : (
                        'Publish'
                      )}
                    </button>
                  )}
                  <button
                    className="btn cursor-pointer text-xs"
                    onClick={() => setForm({ editing: u })}
                    disabled={isActionLoading}
                    aria-label={`Edit ${u.title}`}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger cursor-pointer text-xs"
                    onClick={() => setDeleting(u)}
                    disabled={isActionLoading}
                    aria-label={`Delete ${u.title}`}
                  >
                    Delete
                  </button>
                </>
              );
            }}
          />
        </>
      )}

      {form && (
        <UpdateForm
          products={products}
          types={types.map((t) => ({ id: t.id, name: t.name }))}
          onAddType={handleAddType}
          defaultProductId={products[0]?.id || ''}
          editing={form.editing}
          onSubmit={submitUpdate}
          onCancel={() => setForm(null)}
        />
      )}

      {addingProduct && (
        <AddProductDialog
          onCancel={() => setAddingProduct(null)}
          onAdd={handleAddProduct}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete update?"
          confirmLabel="Delete"
          danger
          loading={deletingInProgress}
          onCancel={() => !deletingInProgress && setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        >
          <p>
            “{deleting.title}” will be permanently removed from PostgreSQL. This action cannot be undone.
          </p>
        </ConfirmDialog>
      )}

      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-4 left-4 z-[60] rounded-md border border-[#2ea043] bg-[#0d1117] p-3 text-sm shadow-xl sm:left-auto"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
