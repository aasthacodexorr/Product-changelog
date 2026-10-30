'use client';

import { typeColor } from '@/lib/changelog';

interface Props {
  types: string[];
  selectedTypes: string[];
  onChange: (selected: string[]) => void;
  counts?: Record<string, number>;
}

export function ProductTypeFilter({ types, selectedTypes, onChange, counts }: Props) {
  if (!types || types.length === 0) return null;

  const isAllSelected = selectedTypes.length === 0;

  const toggleType = (typeName: string) => {
    const isSelected = selectedTypes.some(
      (t) => t.toLowerCase() === typeName.toLowerCase()
    );
    if (isSelected) {
      onChange(
        selectedTypes.filter(
          (t) => t.toLowerCase() !== typeName.toLowerCase()
        )
      );
    } else {
      onChange([...selectedTypes, typeName]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div
      role="group"
      aria-label="Filter updates by product type"
      className="flex flex-wrap items-center gap-2"
    >
      {/* "All" Option */}
      <button
        type="button"
        onClick={clearAll}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e8cff] ${
          isAllSelected
            ? 'border-[#2e8cff] bg-[#2e8cff] text-white shadow-xs'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <span>All</span>
      </button>

      {/* Individual Type Pills with Checkboxes */}
      {types.map((typeName) => {
        const isSelected = selectedTypes.some(
          (t) => t.toLowerCase() === typeName.toLowerCase()
        );
        const count = counts ? counts[typeName] : undefined;
        const dotColor = typeColor(typeName);

        return (
          <label
            key={typeName}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer select-none focus-within:ring-2 focus-within:ring-[#2e8cff] ${
              isSelected
                ? 'border-[#2e8cff] bg-[#2e8cff]/10 text-[#2e8cff] font-semibold shadow-xs'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isSelected}
              onChange={() => toggleType(typeName)}
              aria-label={`Filter by ${typeName}`}
            />
            {/* Custom Checkbox */}
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                isSelected
                  ? 'border-[#2e8cff] bg-[#2e8cff] text-white'
                  : 'border-gray-400 bg-white'
              }`}
            >
              {isSelected && (
                <svg
                  className="h-3 w-3 stroke-[2.5]"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 6L5 8.5L9.5 3.5" />
                </svg>
              )}
            </span>

            {/* Type Color Dot */}
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: dotColor }}
              aria-hidden="true"
            />

            <span>{typeName}</span>

            {/* Count Badge */}
            {count !== undefined && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-px text-xs font-normal ${
                  isSelected
                    ? 'bg-[#2e8cff]/20 text-[#2e8cff] font-medium'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            )}
          </label>
        );
      })}

      {/* Clear Filters Button when any are selected */}
      {!isAllSelected && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-1 inline-flex items-center gap-1 text-xs text-[#666] hover:text-[#dc2626] cursor-pointer transition-colors py-1 px-2 rounded-md hover:bg-gray-100"
          title="Reset filter to show all types"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
          <span>Clear filter</span>
        </button>
      )}
    </div>
  );
}
