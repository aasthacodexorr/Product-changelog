'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { MonthlyChangelog } from '@/components/MonthlyChangelog';
import { ProductSearch } from '@/components/ProductSearch';
import { ProductTypeFilter } from '@/components/ProductTypeFilter';
import { ChangelogSkeleton } from '@/components/ChangelogSkeleton';
import { filterUpdates, type ChangelogUpdate, type Product } from '@/lib/changelog';

export default function PublicChangelogPage() {
  const [updates, setUpdates] = useState<ChangelogUpdate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [updatesRes, productsRes, typesRes] = await Promise.all([
        fetch('/api/updates', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/update-types', { cache: 'no-store' }),
      ]);

      if (!updatesRes.ok || !productsRes.ok) {
        throw new Error('Failed to load changelog data');
      }

      const updatesData = await updatesRes.json();
      const productsData = await productsRes.json();
      const loadedUpdates: ChangelogUpdate[] = updatesData.updates || [];

      setUpdates(loadedUpdates);
      setProducts(productsData.products || []);

      // Extract types from API and updates
      let typeNames: string[] = [];
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        typeNames = (typesData.updateTypes || []).map((t: { name: string }) => t.name);
      }
      const updateTypes = loadedUpdates.map((u) => u.type).filter(Boolean);
      const combined = Array.from(new Set([...typeNames, ...updateTypes]));
      setAvailableTypes(combined);
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

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of updates) {
      if (u.type) {
        counts[u.type] = (counts[u.type] || 0) + 1;
      }
    }
    return counts;
  }, [updates]);

  const filtering = query.trim() !== '' || selectedTypes.length > 0;
  const visible = useMemo(
    () => filterUpdates(updates, products, query, selectedTypes),
    [updates, products, query, selectedTypes]
  );

  const clearAllFilters = () => {
    setQuery('');
    setSelectedTypes([]);
  };

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
          <div className="mb-4">
            <ProductSearch value={query} onChange={setQuery} products={products} />
          </div>
        )}

        {/* Product Type Filter Pills */}
        {!loading && availableTypes.length > 0 && (
          <div className="mb-6">
            <ProductTypeFilter
              types={availableTypes}
              selectedTypes={selectedTypes}
              onChange={setSelectedTypes}
              counts={typeCounts}
            />
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
              {query.trim() && selectedTypes.length > 0
                ? `No updates match product “${query.trim()}” with selected type(s): ${selectedTypes.join(', ')}.`
                : query.trim()
                ? `No product name contains “${query.trim()}”, or matching products have no updates.`
                : `No updates match selected type(s): ${selectedTypes.join(', ')}.`}
            </p>
            <button className="btn" onClick={clearAllFilters}>
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {filtering && (
              <p className="mb-3 text-sm text-[#666]" role="status">
                {visible.length} update{visible.length === 1 ? '' : 's'} matching
                {query.trim() ? ` “${query.trim()}”` : ''}
                {query.trim() && selectedTypes.length > 0 ? ' and ' : ' '}
                {selectedTypes.length > 0 ? `type(s): ${selectedTypes.join(', ')}` : ''}
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
