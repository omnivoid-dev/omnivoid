'use client';

interface InlineRenameProps {
  value: string;
  /** Called with the trimmed new name when it changed and is not empty */
  onSave: (next: string) => void;
}

/** A name that reads like text in a table but edits in place: Enter or blur saves, Escape cancels. */
export default function InlineRename({ value, onSave }: InlineRenameProps) {
  return (
    <input
      key={value}
      defaultValue={value}
      title="Click to rename; press Enter or click away to save"
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next && next !== value) onSave(next);
        else e.target.value = value;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
      className="w-full min-w-[220px] bg-transparent border border-transparent hover:border-[#333] focus:border-[#99ccff]/50 focus:bg-[#111] rounded px-2 py-1 text-sm text-white outline-none"
    />
  );
}
