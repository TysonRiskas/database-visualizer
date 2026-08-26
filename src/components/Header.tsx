import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  BookOpen,
  Database,
  Lock,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  speed: number;
  setSpeed: (speed: number) => void;
  isStepByStep: boolean;
  setIsStepByStep: (val: boolean) => void;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onNextStep: () => void;
  onResetSimulation: () => void;
  onResetDatabase: () => void;
  onOpenHelp: () => void;
  activeLocksCount: number;
  totalRowsCount: number;
  currentStepIndex: number;
  totalStepsCount: number;
  isSimulating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  speed,
  setSpeed,
  isStepByStep,
  setIsStepByStep,
  isPlaying,
  onTogglePlayPause,
  onNextStep,
  onResetSimulation,
  onResetDatabase,
  onOpenHelp,
  activeLocksCount,
  totalRowsCount,
  currentStepIndex,
  totalStepsCount,
  isSimulating,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-1.5">
                Glass Box <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">DB Visualizer</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Internals Lab
              </span>
            </div>
            <p className="text-xs text-slate-400">
              University Tutoring Center • Relational Engine, 2PL Concurrency & Query Planner
            </p>
          </div>
        </div>

        {/* Live Metrics Pills */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Records:</span>
            <span className="font-mono font-semibold text-blue-300">{totalRowsCount} rows</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            activeLocksCount > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <Lock className="w-3.5 h-3.5" />
            <span>Active Locks:</span>
            <span className="font-mono font-bold">{activeLocksCount}</span>
          </div>

          {isSimulating && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Step:</span>
              <span className="font-mono font-bold">
                {currentStepIndex + 1} / {totalStepsCount}
              </span>
            </div>
          )}
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Speed Selection */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[
              { label: '0.5x', speedVal: 0.5, stepMode: false },
              { label: '1x', speedVal: 1, stepMode: false },
              { label: '2x', speedVal: 2, stepMode: false },
              { label: 'Step', speedVal: 1, stepMode: true },
            ].map((opt) => {
              const active =
                opt.stepMode === isStepByStep &&
                (opt.stepMode || speed === opt.speedVal);
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    if (opt.stepMode) {
                      setIsStepByStep(true);
                    } else {
                      setIsStepByStep(false);
                      setSpeed(opt.speedVal);
                    }
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Playback Controls (Play/Pause, Step Next) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={onTogglePlayPause}
              disabled={!isSimulating}
              title={isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
              className={`p-1.5 rounded-md transition ${
                !isSimulating
                  ? 'text-slate-600 cursor-not-allowed'
                  : isPlaying
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={onNextStep}
              disabled={!isSimulating || (isPlaying && !isStepByStep)}
              title="Next Micro-Step"
              className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={onResetSimulation}
              disabled={!isSimulating}
              title="Cancel Current Simulation"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Database Hard Reset */}
          <button
            onClick={onResetDatabase}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            title="Reset Database to Seed State (15 Records)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset DB</span>
          </button>

          {/* Education / Theory Modal */}
          <button
            onClick={onOpenHelp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium border border-blue-500/30 transition shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>DB Theory</span>
          </button>
        </div>
      </div>
    </header>
  );
};
