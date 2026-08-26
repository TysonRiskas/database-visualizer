import React, { useState } from 'react';
import { SimulationStep } from '../../types/database';
import { Terminal, Filter, Trash2, Download, CheckCircle2, Lock, FileText, Cpu } from 'lucide-react';

interface TransactionLogStreamProps {
  logs: SimulationStep[];
  onClearLogs: () => void;
}

export const TransactionLogStream: React.FC<TransactionLogStreamProps> = ({ logs, onClearLogs }) => {
  const [filterThread, setFilterThread] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterThread === 'ALL') return true;
    return log.threadName.toLowerCase().includes(filterThread.toLowerCase());
  });

  const handleExport = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.threadName} / ${l.txId}] ${l.type} - ${l.title}: ${l.pedagogicalDetail}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `db-internals-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2.5 flex flex-col h-full">
      {/* Log Header Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
          {['ALL', 'Alpha', 'Beta', 'Gamma'].map((threadOpt) => (
            <button
              key={threadOpt}
              onClick={() => setFilterThread(threadOpt)}
              className={`px-2 py-0.5 rounded font-medium transition ${
                filterThread === threadOpt
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {threadOpt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700 disabled:opacity-40"
            title="Download Log as Text File"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-[10px] font-mono flex items-center gap-1 border border-slate-700 disabled:opacity-40"
            title="Clear Log History"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Logs Stream Container */}
      <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-2.5 overflow-y-auto max-h-72 font-mono text-[10px] space-y-1.5 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-slate-600 py-6 text-xs">
            Transaction log is empty. Operations will stream live with millisecond timestamps.
          </div>
        ) : (
          filteredLogs.map((item, idx) => {
            const isLock = item.type.includes('LOCK');
            const isBlocked = item.type === 'STEP_LOCK_BLOCKED';
            const isCommit = item.type === 'STEP_COMMIT';
            const isWal = item.type === 'STEP_WAL_APPEND';

            return (
              <div
                key={idx}
                className={`p-1.5 rounded border transition-all ${
                  isBlocked
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : isCommit
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : isLock
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                    : isWal
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">{item.timestamp}</span>
                    <span
                      className={`px-1 rounded font-bold text-[9px] ${
                        item.threadColor === 'amber'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : item.threadColor === 'purple'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {item.threadName}
                    </span>
                    <span className="text-slate-400">[{item.txId}]</span>
                  </div>

                  <span className="text-[8px] uppercase tracking-wider text-slate-400">
                    {item.type}
                  </span>
                </div>

                <div className="font-semibold text-slate-100 flex items-center gap-1">
                  {isBlocked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                  {isCommit && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                  {isWal && <FileText className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
                  <span>{item.title}</span>
                </div>

                <p className="text-[9.5px] text-slate-400 font-sans mt-0.5 leading-snug">
                  {item.pedagogicalDetail}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
