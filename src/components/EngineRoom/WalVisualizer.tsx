import React from 'react';
import { WalRecord } from '../../types/database';
import { FileText, ArrowRight, ShieldCheck, Database, Layers } from 'lucide-react';

interface WalVisualizerProps {
  walRecords: WalRecord[];
  activeTxId?: string;
}

export const WalVisualizer: React.FC<WalVisualizerProps> = ({ walRecords, activeTxId }) => {
  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-2.5 shadow-lg flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Write-Ahead Log (WAL) & Transaction Queue Tape</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Total WAL LSNs: <strong className="text-blue-400">{walRecords.length}</strong>
        </span>
      </div>

      {/* WAL Tape Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 max-w-full">
        {walRecords.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-1.5 px-3 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 w-full text-center">
            WAL buffer clean — Incoming write operations will appear here with Log Sequence Numbers (LSN)
          </div>
        ) : (
          walRecords.slice(-6).map((rec) => {
            const isCurrentTx = rec.txId === activeTxId;
            return (
              <div
                key={rec.lsn}
                className={`shrink-0 text-[10px] font-mono p-2 rounded-lg border flex flex-col gap-0.5 transition-all shadow-md ${
                  isCurrentTx
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-200 ring-1 ring-blue-500/30'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-amber-400">LSN #{rec.lsn}</span>
                  <span
                    className={`px-1 rounded text-[9px] font-bold ${
                      rec.operation === 'COMMIT'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : rec.operation === 'INSERT'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {rec.operation}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>Tx: <strong className="text-slate-300">{rec.txId}</strong></span>
                  {rec.table && <span>• {rec.table}</span>}
                </div>
                <span className="text-[9px] text-slate-400">{rec.timestamp}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
