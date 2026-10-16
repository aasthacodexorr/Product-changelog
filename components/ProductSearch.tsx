'use client';

import { useId, useState } from 'react';
import { suggestProducts, type Product } from '@/lib/changelog';

interface Props {
  value: string;
  onChange: (v: string) => void;
  products: Product[];
}

export function ProductSearch({ value, onChange, products }: Props) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const suggestions = suggestProducts(products, value).filter((p) => p.name !== value);
  const showList = focused && suggestions.length > 0;

  const pick = (name: string) => {
    onChange(name);
    setActive(-1);
  };

  return (
    <div className="relative">
      <label htmlFor="product-search" className="sr-only">Search by product name</label>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8b949e]" aria-hidden="true">
        <circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5L17 17" />
      </svg>
      <input
        id="product-search"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className="field py-2.5 pr-10 pl-9 text-base [&::-webkit-search-cancel-button]:hidden"
        placeholder="Search by product name..."
        value={value}
        onChange={(e) => { onChange(e.target.value); setActive(-1); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && showList) { e.preventDefault(); setActive((a) => (a + 1) % suggestions.length); }
          else if (e.key === 'ArrowUp' && showList) { e.preventDefault(); setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1)); }
          else if (e.key === 'Enter' && showList && active >= 0) { e.preventDefault(); pick(suggestions[active].name); }
          else if (e.key === 'Escape') { if (showList) setFocused(false); else onChange(''); }
        }}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#8b949e] hover:text-[#e6edf3]">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>
      )}
      {showList && (
        <ul id={listId} role="listbox" className="card absolute z-20 mt-1 w-full overflow-hidden shadow-xl">
          {suggestions.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(p.name); }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-[#30363d]' : 'hover:bg-[#21262d]'}`}>
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
