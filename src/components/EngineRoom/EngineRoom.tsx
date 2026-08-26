import React from 'react';
import { DatabaseState, LockEntry, SimulationStep, WorkerRobotState } from '../../types/database';
import { TableVisualizer } from './TableVisualizer';
import { WorkerRobots } from './WorkerRobots';
import { WalVisualizer } from './WalVisualizer';
import { Cpu, Terminal, Shield, Info, Sparkles, AlertCircle } from 'lucide-react';

interface EngineRoomProps {
  databaseState: DatabaseState;
  activeLocks: LockEntry[];
  currentStep?: SimulationStep;
  workerRobots: WorkerRobotState[];
  isSimulating: boolean;
  walRecords: any[];
}

export const EngineRoom: React.FC<EngineRoomProps> = ({
  databaseState,
  activeLocks,
  currentStep,
  workerRobots,
  isSimulating,
  walRecords,
}) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-2xl relative">
      {/* Engine Room Top Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">The Engine Room</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                "Glass Box" View
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live in-memory relational pages, locks & active worker threads
            </p>
          </div>
        </div>

        {/* Lock Legend Badges */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Unlocked</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>Shared (S)</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Exclusive (X)</span>
          </div>
        </div>
      </div>

      {/* Step Narration Banner */}
      {currentStep && (
        <div className="bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-indigo-950/70 border-b border-blue-500/30 p-2.5 px-4 flex items-start gap-2.5 z-20 transition-all shadow-inner">
          <div className="p-1 rounded bg-blue-500/20 text-blue-300 shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-200">
                {currentStep.title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Thread: {currentStep.threadName}
              </span>
              {currentStep.targetTable && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Target: {currentStep.targetTable}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300/90 mt-0.5 leading-relaxed font-sans">
              {currentStep.pedagogicalDetail}
            </p>
          </div>
        </div>
      )}

      {/* Main Animated Stage Area */}
      <div className="relative flex-1 p-3.5 overflow-y-auto space-y-3.5">
        {/* Worker Robots 2D SVG Overlay */}
        <WorkerRobots robots={workerRobots} />

        {/* Relational Table Grids Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Students Table */}
          <TableVisualizer
            tableName="Students"
            databaseState={databaseState}
            activeLocks={activeLocks}
            currentStep={currentStep}
            accentColor="blue"
          />

          {/* Tutors Table */}
          <TableVisualizer
            tableName="Tutors"
            databaseState={databaseState}
            activeLocks={activeLocks}
            currentStep={currentStep}
            accentColor="cyan"
          />
        </div>

        {/* Sessions Table (Full Width) */}
        <div>
          <TableVisualizer
            tableName="Sessions"
            databaseState={databaseState}
            activeLocks={activeLocks}
            currentStep={currentStep}
            accentColor="purple"
          />
        </div>

        {/* Write-Ahead Log Tape */}
        <WalVisualizer walRecords={walRecords} activeTxId={currentStep?.txId} />
      </div>
    </div>
  );
};
