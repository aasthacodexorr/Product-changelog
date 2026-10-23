'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
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
    <>
      <Header 
        buttons={[
          { label: 'Employee Panel', href: '/panel' }
        ]}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-5 min-h-[90vh]">
        <div className="mb-6 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-black">Product Updates</h1>
          <p className="text-sm text-[#666]">Latest product updates, fixes, and improvements</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-[#dc2626] bg-[#dc2626]/10 p-3 text-sm text-[#dc2626]"
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
            <h2 className="text-lg font-semibold text-[#2e8cff]">No updates have been published yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#666]">
              Check back soon for new releases and improvements across all our products.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-[#2e8cff]">No matching updates</h2>
            <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-[#666]">
              No product name contains “{query.trim()}”, or matching products have no updates.
            </p>
            <button className="btn" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            {filtering && (
              <p className="mb-3 text-sm text-[#666]" role="status">
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
    </>
  );
}
