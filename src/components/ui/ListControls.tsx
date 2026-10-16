'use client';

import { SORT_LABELS, type SortMode } from '@/lib/listView';

export interface Option {
  value: string;
  label: string;
}

interface ListControlsProps {
  search?: string;
  onSearch?: (v: string) => void;
  editions?: Option[];
  edition?: string;
  onEdition?: (v: string) => void;
  performers?: Option[];
  performer?: string;
  onPerformer?: (v: string) => void;
  /** Extra single-select filter (type, kind, status...) */
  extra?: { label: string; options: Option[]; value: string; onChange: (v: string) => void };
  sort: SortMode;
  onSort: (v: SortMode) => void;
  sortModes?: SortMode[];
  /** Shows "12 of 40" */
  shown?: number;
  total?: number;
  className?: string;
}

const control =
  'bg-[#111] border border-[#333] rounded px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-[#99ccff] font-mono min-w-0';

/** Search + edition / performer filters + sort, shared by the admin lists and the public Gallery. */
export function ListControls({
  search,
  onSearch,
  editions,
  edition = '',
  onEdition,
  performers,
  performer = '',
  onPerformer,
  extra,
  sort,
  onSort,
  sortModes = ['date-desc', 'date-asc', 'az', 'za'],
  shown,
  total,
  className = '',
}: ListControlsProps) {
  const active = !!(search || edition || performer || extra?.value);
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onSearch && <input value={search || ''} onChange={(e) => onSearch(e.target.value)} placeholder="Search..." className={`${control} w-40`} />}
      {editions && onEdition && (
        <select value={edition} onChange={(e) => onEdition(e.target.value)} className={control} aria-label="Filter by edition">
          <option value="">All editions</option>
          {editions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {performers && onPerformer && (
        <select value={performer} onChange={(e) => onPerformer(e.target.value)} className={control} aria-label="Filter by performer">
          <option value="">All performers</option>
          {performers.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {extra && (
        <select value={extra.value} onChange={(e) => extra.onChange(e.target.value)} className={control} aria-label={extra.label}>
          <option value="">{extra.label}</option>
          {extra.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <select value={sort} onChange={(e) => onSort(e.target.value as SortMode)} className={control} aria-label="Sort">
        {sortModes.map((m) => (
          <option key={m} value={m}>
            {SORT_LABELS[m]}
          </option>
        ))}
      </select>
      {active && (
        <button
          type="button"
          onClick={() => {
            onSearch?.('');
            onEdition?.('');
            onPerformer?.('');
            extra?.onChange('');
          }}
          className="text-[10px] text-white/50 hover:text-white underline"
        >
          clear
        </button>
      )}
      {shown !== undefined && total !== undefined && (
        <span className="text-[10px] text-white/30 ml-auto">{shown === total ? `${total}` : `${shown} of ${total}`}</span>
      )}
    </div>
  );
}
