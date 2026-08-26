import React, { useState } from 'react';
import { DatabaseState } from '../../types/database';
import { TpsBookingForm } from './TpsBookingForm';
import { ConcurrencySimulator } from './ConcurrencySimulator';
import { SqlConsole } from './SqlConsole';
import { Sliders, Zap, Terminal, PlusCircle } from 'lucide-react';

interface ControlPanelProps {
  databaseState: DatabaseState;
  onBookSession: (data: any) => void;
  onFireConcurrent: () => void;
  onRunSql: (sql: string) => void;
  isSimulating: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  databaseState,
  onBookSession,
  onFireConcurrent,
  onRunSql,
  isSimulating,
}) => {
  const [activeTab, setActiveTab] = useState<'tps' | 'concurrency' | 'sql'>('tps');

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Control & Inputs</h2>
            <p className="text-[11px] text-slate-400">Database client operations</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-950/60 border-b border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('tps')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'tps'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>TPS Form</span>
        </button>

        <button
          onClick={() => setActiveTab('concurrency')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'concurrency'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Concurrency</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'sql'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>SQL Console</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-3.5 flex-1 overflow-y-auto">
        {activeTab === 'tps' && (
          <TpsBookingForm
            databaseState={databaseState}
            onBookSession={onBookSession}
            isSimulating={isSimulating}
          />
        )}
        {activeTab === 'concurrency' && (
          <ConcurrencySimulator
            onFireConcurrent={onFireConcurrent}
            isSimulating={isSimulating}
          />
        )}
        {activeTab === 'sql' && (
          <SqlConsole onRunSql={onRunSql} isSimulating={isSimulating} />
        )}
      </div>
    </div>
  );
};
