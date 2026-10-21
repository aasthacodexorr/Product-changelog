'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MonthlyChangelog } from '@/components/MonthlyChangelog';
import { ProductSearch } from '@/components/ProductSearch';
import { ChangelogSkeleton } from '@/components/ChangelogSkeleton';
import { filterUpdatesByProduct, type ChangelogUpdate, type Product } from '@/lib/changelog';

export default function PublicChangelogPage() {
  const [updates, setUpdates] = useState<ChangelogUpdate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [updatesRes, productsRes] = await Promise.all([
        fetch('/api/updates', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
      ]);

      if (!updatesRes.ok || !productsRes.ok) {
        throw new Error('Failed to load changelog data');
      }

      const updatesData = await updatesRes.json();
      const productsData = await productsRes.json();

      setUpdates(updatesData.updates || []);
      setProducts(productsData.products || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load latest changelog updates. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtering = query.trim() !== '';
  const visible = useMemo(
    () => filterUpdatesByProduct(updates, products, query),
    [updates, products, query]
  );

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e6edf3]">Product Changelog</h1>
          <p className="text-sm text-[#8b949e]">Latest product updates, fixes, and improvements</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/panel"
            className="rounded-md flex justify-center items-center gap-1 border border-[#30363d] px-3 py-1.5 text-xs font-medium text-[#8b949e] hover:border-[#8b949e] hover:text-[#e6edf3]"
          >
            Employee Panel <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 512 512">
              <rect width="512" height="512" fill="none" />
              <path
                d="M224 144 H160
       A80 80 0 0 0 80 224
       V368
       A80 80 0 0 0 160 448
       H288
       A80 80 0 0 0 368 368
       V288"
                fill="none"
                stroke="#B8BBDD"
                strokeWidth="32"
                strokeLinecap="round"
                strokeLinejoin="round"
              />


              <path
                d="M272 80 H432 V240
       M432 80 L192 320"
                fill="none"
                stroke="#4655FF"
                strokeWidth="32"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[#f85149]/60 bg-[#f85149]/10 p-3 text-sm text-[#f85149]"
        >
          {error}
        </div>
      )}

      {products.length > 0 && (
        <div className="mb-6">
          <ProductSearch value={query} onChange={setQuery} products={products} />
        </div>
      )}

      {loading ? (
        <ChangelogSkeleton monthCount={2} cardsPerMonth={2} withActions={false} />
      ) : updates.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-[#e6edf3]">No updates have been published yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#8b949e]">
            Check back soon for new releases and improvements across all our products.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-[#e6edf3]">No matching updates</h2>
          <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-[#8b949e]">
            No product name contains “{query.trim()}”, or matching products have no updates.
          </p>
          <button className="btn" onClick={() => setQuery('')}>
            Clear search
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
            showStatus={false}
          />
        </>
      )}
    </main>
  );
}
