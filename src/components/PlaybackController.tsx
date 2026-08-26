import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, Sparkles, Database } from 'lucide-react';

interface PlaybackControllerProps {
  speed: number;
  setSpeed: (speed: number) => void;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onNextStep: () => void;
  onResetSimulation: () => void;
  onResetDatabase: () => void;
  currentStepIndex: number;
  totalStepsCount: number;
  isSimulating: boolean;
}

export const PlaybackController: React.FC<PlaybackControllerProps> = ({
  speed,
  setSpeed,
  isPlaying,
  onTogglePlayPause,
  onNextStep,
  onResetSimulation,
  onResetDatabase,
  currentStepIndex,
  totalStepsCount,
  isSimulating,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-2.5 px-4 shadow-md flex items-center justify-between gap-4 flex-wrap">
      {/* Database Reset & Simulator Cancel */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetDatabase}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          title="Reset Database to Initial 15 Seed Rows"
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset DB</span>
        </button>

        {isSimulating && (
          <button
            onClick={onResetSimulation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition"
            title="Cancel Current Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Main Playback Stepper Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlayPause}
          disabled={!isSimulating}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
            !isSimulating
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : isPlaying
              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
              : 'bg-emerald-100 text-[#275D38] border border-emerald-300 hover:bg-emerald-200'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{currentStepIndex >= 0 ? 'Resume' : 'Play'}</span>
            </>
          )}
        </button>

        {/* Manual Stepper Button (UVU Green) */}
        <button
          onClick={onNextStep}
          disabled={!isSimulating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#275D38] hover:bg-[#1b4327] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-md shadow-emerald-900/10 transition disabled:shadow-none"
        >
          <span>Next Step</span>
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Speed Selector & Step Indicator */}
      <div className="flex items-center gap-3">
        {/* Step Progress Pill */}
        {isSimulating && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-[#275D38] text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#275D38]" />
            <span>
              Step {currentStepIndex + 1} / {totalStepsCount}
            </span>
          </div>
        )}

        {/* Slower Paced Speeds */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {[
            { label: '0.25x (Slow)', val: 0.25 },
            { label: '0.5x (Deliberate)', val: 0.5 },
            { label: '1x (Normal)', val: 1.0 },
          ].map((s) => (
            <button
              key={s.val}
              onClick={() => setSpeed(s.val)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                speed === s.val
                  ? 'bg-[#275D38] text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
