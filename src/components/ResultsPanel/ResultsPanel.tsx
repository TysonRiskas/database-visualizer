import React, { useState } from 'react';
import { LockEntry, LockWaitQueueEntry, QueryResult, SimulationStep } from '../../types/database';
import { QueryResultGrid } from './QueryResultGrid';
import { TransactionLogStream } from './TransactionLogStream';
import { BarChart3, FileText, Lock, Eye, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ResultsPanelProps {
  queryResult?: QueryResult;
  logs: SimulationStep[];
  onClearLogs: () => void;
  activeLocks: LockEntry[];
  waitingLocks: LockWaitQueueEntry[];
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  queryResult,
  logs,
  onClearLogs,
  activeLocks,
  waitingLocks,
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'logs' | 'locks'>('results');

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Outputs & Diagnostics</h2>
            <p className="text-[11px] text-slate-400">Query results & live audit trail</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-950/60 border-b border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Results</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Logs ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('locks')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'locks'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Locks ({activeLocks.length})</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-3.5 flex-1 overflow-y-auto">
        {activeTab === 'results' && <QueryResultGrid queryResult={queryResult} />}
        {activeTab === 'logs' && (
          <TransactionLogStream logs={logs} onClearLogs={onClearLogs} />
        )}
        {activeTab === 'locks' && (
          <div className="space-y-3 font-mono text-xs">
            {/* Active Locks Table */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Active Held Locks ({activeLocks.length})</span>
                </span>
              </div>
              {activeLocks.length === 0 ? (
                <div className="p-3 text-center text-slate-500 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px]">
                  All resources unlocked. No active locks held.
                </div>
              ) : (
                <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-1.5">Resource</th>
                        <th className="p-1.5">Mode</th>
                        <th className="p-1.5">Holder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {activeLocks.map((l) => (
                        <tr key={l.id} className="text-slate-300">
                          <td className="p-1.5 font-bold text-amber-300">{l.resourceId}</td>
                          <td className="p-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                l.mode === 'EXCLUSIVE'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {l.mode}
                            </span>
                          </td>
                          <td className="p-1.5 text-slate-400">{l.holderThreadName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Wait Queue */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lock Wait Queue ({waitingLocks.length})</span>
                </span>
              </div>
              {waitingLocks.length === 0 ? (
                <div className="p-3 text-center text-slate-500 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px]">
                  Wait queue is empty. No blocked transactions.
                </div>
              ) : (
                <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-1.5">Target Resource</th>
                        <th className="p-1.5">Waiting Thread</th>
                        <th className="p-1.5">Blocked By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {waitingLocks.map((w) => (
                        <tr key={w.id} className="bg-amber-500/10 text-amber-200">
                          <td className="p-1.5 font-bold">{w.resourceId}</td>
                          <td className="p-1.5">{w.requestorThreadName}</td>
                          <td className="p-1.5 font-bold text-rose-400">{w.blockedByTxId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
