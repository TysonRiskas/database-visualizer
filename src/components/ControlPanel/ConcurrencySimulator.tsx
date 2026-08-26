import React from 'react';
import { Zap, AlertTriangle, ShieldAlert, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';

interface ConcurrencySimulatorProps {
  onFireConcurrent: () => void;
  isSimulating: boolean;
}

export const ConcurrencySimulator: React.FC<ConcurrencySimulatorProps> = ({
  onFireConcurrent,
  isSimulating,
}) => {
  return (
    <div className="space-y-4">
      {/* Intro Alert */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-200">Strict 2PL & Lock Contention</p>
          <p className="text-amber-300/80 mt-0.5">
            When multiple transactions attempt to acquire conflicting Exclusive locks on the same row, the Lock Manager prevents race conditions by <strong>blocking</strong> the second thread in a wait queue until the first transaction commits.
          </p>
        </div>
      </div>

      {/* 3 Concurrent Threads Diagram */}
      <div className="space-y-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>Simulated Concurrent Thread Pool</span>
        </h4>

        {/* Thread 1 */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <div>
              <span className="font-semibold text-blue-300">Thread-Alpha (Tx-201)</span>
              <p className="text-[10px] text-slate-400">Books session with Tutor #101 (Dr. Alan Turing)</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-semibold">
            Acquires Lock
          </span>
        </div>

        {/* Thread 2 (Contention) */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <div>
              <span className="font-semibold text-amber-300">Thread-Beta (Tx-202)</span>
              <p className="text-[10px] text-slate-400">ALSO books Tutor #101 (Same Resource!)</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-semibold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            BLOCKED ⏳
          </span>
        </div>

        {/* Thread 3 */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <div>
              <span className="font-semibold text-purple-300">Thread-Gamma (Tx-203)</span>
              <p className="text-[10px] text-slate-400">Books session with Tutor #102 (Prof. Ada Lovelace)</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-semibold">
            Parallel OK ✔
          </span>
        </div>
      </div>

      {/* Key Pedagogical Points */}
      <div className="space-y-1 text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
        <p className="flex items-center gap-1.5 text-slate-300 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>What to observe in the Glass Box:</span>
        </p>
        <p className="pl-5 text-slate-400">1. Robot Beta enters <span className="text-amber-300 font-semibold">BLOCKED</span> state with a live wait timer.</p>
        <p className="pl-5 text-slate-400">2. Once Robot Alpha commits, Lock Manager <span className="text-emerald-300 font-semibold">unblocks Beta</span> immediately.</p>
      </div>

      {/* Trigger Button */}
      <button
        onClick={onFireConcurrent}
        disabled={isSimulating}
        className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide shadow-lg flex items-center justify-center gap-2 transition duration-200 ${
          isSimulating
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-amber-500/20 active:scale-[0.99]'
        }`}
      >
        <Zap className="w-4 h-4 fill-current" />
        <span>{isSimulating ? 'Simulation in Progress...' : 'Fire 3 Concurrent Bookings'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
