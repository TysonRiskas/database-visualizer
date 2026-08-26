import React from 'react';
import { SimulationStep } from '../types/database';
import { Sparkles, CheckCircle2, ShieldAlert, Lock, Cpu, Eye, ArrowRight, Layers } from 'lucide-react';

interface StepExplanationBannerProps {
  currentStep?: SimulationStep;
  currentStepIndex: number;
  totalStepsCount: number;
  isSimulating: boolean;
}

export const StepExplanationBanner: React.FC<StepExplanationBannerProps> = ({
  currentStep,
  currentStepIndex,
  totalStepsCount,
  isSimulating,
}) => {
  if (!isSimulating && !currentStep) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 px-6 shadow-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-200 block text-sm">Database Engine Ready</span>
            <span className="text-slate-400 text-xs">
              Select an action above: <strong>Book a Session (TPS Insert)</strong>, <strong>Fire 3 Concurrent Bookings</strong>, or <strong>Run SQL / JOIN</strong>.
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
          ● Engine Idle
        </span>
      </div>
    );
  }

  const isBlocked = currentStep?.type === 'STEP_LOCK_BLOCKED_BARRIER';
  const isPadlock = currentStep?.type === 'STEP_PLACE_PADLOCK';
  const isSnap = currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_EXTRACT_TO_TRAY';
  const isCommit = currentStep?.type === 'STEP_COMMIT' || currentStep?.type === 'STEP_RELEASE_PADLOCK' || currentStep?.type === 'STEP_COMPLETE';

  return (
    <div
      className={`rounded-2xl p-4 px-6 border shadow-2xl transition-all duration-300 backdrop-blur ${
        isBlocked
          ? 'bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-rose-950/80 border-amber-500/50 shadow-amber-500/10'
          : isCommit
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900/95 to-blue-950/80 border-emerald-500/50 shadow-emerald-500/10'
          : 'bg-gradient-to-r from-blue-950/80 via-slate-900/95 to-slate-900 border-blue-500/40 shadow-blue-500/10'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Step Icon & Main Text */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className={`p-2.5 rounded-xl shrink-0 mt-0.5 shadow-md ${
              isBlocked
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                : isCommit
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
            }`}
          >
            {isBlocked && <ShieldAlert className="w-5 h-5" />}
            {isPadlock && <Lock className="w-5 h-5" />}
            {isSnap && <CheckCircle2 className="w-5 h-5" />}
            {isCommit && <Sparkles className="w-5 h-5" />}
            {!isBlocked && !isPadlock && !isSnap && !isCommit && <Cpu className="w-5 h-5" />}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-950 text-cyan-300 border border-slate-700">
                Step {currentStepIndex + 1} of {totalStepsCount}
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                  currentStep?.threadColor === 'amber'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : currentStep?.threadColor === 'purple'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}
              >
                {currentStep?.threadName} [{currentStep?.txId}]
              </span>
            </div>

            {/* High-visibility Action Summary Line */}
            <h3 className="text-sm md:text-base font-bold text-slate-100 tracking-tight leading-snug">
              {currentStep?.actionSummary}
            </h3>

            {/* Pedagogical Commentary */}
            <p className="text-xs text-slate-300/90 font-sans leading-relaxed pt-0.5">
              💡 {currentStep?.pedagogicalDetail}
            </p>
          </div>
        </div>

        {/* Step Progress Dots on Right */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0 pl-4 border-l border-slate-800/80">
          {Array.from({ length: totalStepsCount }).map((_, idx) => {
            const isPassed = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'bg-blue-400 ring-4 ring-blue-500/30 scale-125'
                    : isPassed
                    ? 'bg-emerald-400'
                    : 'bg-slate-700'
                }`}
                title={`Step ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
