'use client';

import { useState } from 'react';

interface ScanResult {
  count: number;
  bytes: number;
  files: { path: string; size: number; createdAt: string }[];
}

const fmtBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Finds files uploaded but never saved into a record (older than 24h) and lets the admin purge them. */
export default function StorageCleanup() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState<'scan' | 'purge' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const runScan = async () => {
    setBusy('scan');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/storage-cleanup');
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setScan(d.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Scan failed' });
    } finally {
      setBusy(null);
    }
  };

  const runPurge = async () => {
    if (!scan || !confirm(`Permanently delete ${scan.count} unused file(s)?`)) return;
    setBusy('purge');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/storage-cleanup', { method: 'POST' });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setMessage({ type: 'success', text: `Deleted ${d.data.deleted} file(s), freed ${fmtBytes(d.data.bytes)}.` });
      setScan(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Purge failed' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">🧹 STORAGE CLEANUP</h2>
          <p className="text-[11px] text-white/40 max-w-xl">
            Uploads that were never saved into an edition, paper, track or branding setting are unused. Files newer than 24 hours are left alone so open forms are safe.
            Replaced or deleted items already clean up after themselves.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={runScan}
            disabled={busy !== null}
            className="px-4 py-2 text-[10px] font-bold rounded border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 disabled:opacity-40"
          >
            {busy === 'scan' ? 'SCANNING...' : 'SCAN FOR UNUSED FILES'}
          </button>
          {scan && scan.count > 0 && (
            <button
              onClick={runPurge}
              disabled={busy !== null}
              className="px-4 py-2 text-[10px] font-bold rounded bg-red-500/80 text-white hover:bg-red-500 disabled:opacity-40"
            >
              {busy === 'purge' ? 'PURGING...' : `PURGE ${scan.count} (${fmtBytes(scan.bytes)})`}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {scan && (
        <div className="text-xs text-white/60">
          {scan.count === 0 ? (
            'Nothing unused. Storage is clean.'
          ) : (
            <ul className="max-h-40 overflow-y-auto space-y-1 font-mono text-[10px] text-white/50">
              {scan.files.map((f) => (
                <li key={f.path} className="flex justify-between gap-4">
                  <span className="truncate">{f.path}</span>
                  <span className="shrink-0">{fmtBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
