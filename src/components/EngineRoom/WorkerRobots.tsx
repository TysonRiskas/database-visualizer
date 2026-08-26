import React from 'react';
import { WorkerRobotState } from '../../types/database';
import { Lock, Clock, Check, Sparkles, AlertCircle, FileText, Search } from 'lucide-react';

interface WorkerRobotsProps {
  robots: WorkerRobotState[];
}

export const WorkerRobots: React.FC<WorkerRobotsProps> = ({ robots }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {robots.map((robot) => {
        const isBlocked = robot.status === 'LOCKED_BLOCKED';
        const isWriting = robot.status === 'WRITING';
        const isScanning = robot.status === 'SCANNING';
        const isSuccess = robot.status === 'SUCCESS';

        // Map color to Tailwind classes and hex
        const colorClasses = {
          blue: {
            body: 'fill-blue-500 stroke-blue-300',
            glow: 'shadow-blue-500/50',
            badgeBg: 'bg-blue-600 text-blue-100',
            bubbleBorder: 'border-blue-400 bg-slate-900/95 text-blue-200',
          },
          amber: {
            body: 'fill-amber-500 stroke-amber-300',
            glow: 'shadow-amber-500/50',
            badgeBg: 'bg-amber-600 text-amber-100',
            bubbleBorder: 'border-amber-400 bg-slate-900/95 text-amber-200',
          },
          purple: {
            body: 'fill-purple-500 stroke-purple-300',
            glow: 'shadow-purple-500/50',
            badgeBg: 'bg-purple-600 text-purple-100',
            bubbleBorder: 'border-purple-400 bg-slate-900/95 text-purple-200',
          },
          cyan: {
            body: 'fill-cyan-500 stroke-cyan-300',
            glow: 'shadow-cyan-500/50',
            badgeBg: 'bg-cyan-600 text-cyan-100',
            bubbleBorder: 'border-cyan-400 bg-slate-900/95 text-cyan-200',
          },
        }[robot.color as 'blue' | 'amber' | 'purple' | 'cyan'] || {
          body: 'fill-blue-500 stroke-blue-300',
          glow: 'shadow-blue-500/50',
          badgeBg: 'bg-blue-600 text-blue-100',
          bubbleBorder: 'border-blue-400 bg-slate-900/95 text-blue-200',
        };

        return (
          <div
            key={robot.id}
            className="absolute transition-all duration-700 ease-out flex flex-col items-center pointer-events-auto"
            style={{
              left: `${robot.x}%`,
              top: `${robot.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Thought Bubble (when planning or calculating) */}
            {robot.thought && (
              <div
                className={`mb-1 max-w-[200px] text-[10px] p-2 rounded-xl shadow-xl border ${colorClasses.bubbleBorder} backdrop-blur animate-bounce-subtle z-40`}
              >
                <div className="font-semibold flex items-center gap-1 mb-0.5 text-[9px] uppercase tracking-wider text-slate-400">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  <span>Engine Intent</span>
                </div>
                <p className="leading-tight text-slate-200 font-mono">{robot.thought}</p>
                {/* Speech Bubble Arrow */}
                <div className="w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-700 mx-auto -mb-3 mt-1"></div>
              </div>
            )}

            {/* Speech Bubble (current action) */}
            {robot.speech && !robot.thought && (
              <div
                className={`mb-1 text-[11px] font-medium px-2.5 py-1 rounded-full shadow-lg border ${colorClasses.bubbleBorder} flex items-center gap-1.5 whitespace-nowrap animate-bounce-subtle`}
              >
                {isBlocked && <Clock className="w-3 h-3 text-amber-400 animate-spin" />}
                {isScanning && <Search className="w-3 h-3 text-cyan-400" />}
                {isWriting && <Lock className="w-3 h-3 text-rose-400" />}
                {isSuccess && <Check className="w-3 h-3 text-emerald-400" />}
                <span>{robot.speech}</span>
              </div>
            )}

            {/* Carrying Payload Badge */}
            {robot.carryingPayload && (
              <div className="mb-0.5 flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-300 shadow-md">
                <FileText className="w-2.5 h-2.5 text-blue-400" />
                <span>{robot.carryingPayload}</span>
              </div>
            )}

            {/* 2D SVG Robot Body */}
            <div className="relative group cursor-pointer">
              {/* Blocked / Contention halo */}
              {isBlocked && (
                <div className="absolute -inset-2 rounded-full border-2 border-dashed border-amber-400 animate-spin pointer-events-none"></div>
              )}

              {/* Exclusive Lock Aura */}
              {isWriting && (
                <div className="absolute -inset-2 rounded-full bg-rose-500/20 animate-pulse-fast pointer-events-none"></div>
              )}

              <svg
                width="48"
                height="56"
                viewBox="0 0 48 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`filter drop-shadow-lg ${
                  isBlocked ? 'opacity-90' : 'opacity-100'
                }`}
              >
                {/* Antenna */}
                <line x1="24" y1="12" x2="24" y2="2" stroke="#94a3b8" strokeWidth="2" />
                <circle
                  cx="24"
                  cy="2"
                  r="3"
                  className={
                    isBlocked
                      ? 'fill-amber-400 animate-ping'
                      : isWriting
                      ? 'fill-rose-500 animate-pulse'
                      : 'fill-cyan-400 animate-pulse'
                  }
                />

                {/* Robot Head */}
                <rect
                  x="8"
                  y="10"
                  width="32"
                  height="22"
                  rx="6"
                  className="fill-slate-800 stroke-slate-600"
                  strokeWidth="2"
                />

                {/* Visor Screen */}
                <rect
                  x="12"
                  y="14"
                  width="24"
                  height="12"
                  rx="3"
                  className="fill-slate-950 stroke-slate-700"
                  strokeWidth="1"
                />

                {/* Robot Eyes */}
                {isBlocked ? (
                  // Sweating / Worried Eyes
                  <>
                    <circle cx="18" cy="20" r="2.5" className="fill-amber-400" />
                    <circle cx="30" cy="20" r="2.5" className="fill-amber-400" />
                    <path
                      d="M17 16L20 18M31 16L28 18"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </>
                ) : isWriting ? (
                  // Focused / Write Eyes
                  <>
                    <rect x="16" y="19" width="5" height="2" rx="1" className="fill-rose-400" />
                    <rect x="27" y="19" width="5" height="2" rx="1" className="fill-rose-400" />
                  </>
                ) : isScanning ? (
                  // Laser Scanning Eyes
                  <>
                    <circle cx="18" cy="20" r="3" className="fill-cyan-400 animate-pulse" />
                    <circle cx="30" cy="20" r="3" className="fill-cyan-400 animate-pulse" />
                  </>
                ) : (
                  // Happy Eyes
                  <>
                    <circle cx="18" cy="20" r="2.5" className="fill-blue-400" />
                    <circle cx="30" cy="20" r="2.5" className="fill-blue-400" />
                  </>
                )}

                {/* Robot Body */}
                <rect
                  x="10"
                  y="34"
                  width="28"
                  height="18"
                  rx="4"
                  className={colorClasses.body}
                  strokeWidth="1.5"
                />

                {/* Chest Badge / Core */}
                <rect
                  x="18"
                  y="38"
                  width="12"
                  height="10"
                  rx="2"
                  className="fill-slate-900"
                />
                <circle
                  cx="24"
                  cy="43"
                  r="2"
                  className={
                    isBlocked
                      ? 'fill-amber-400'
                      : isWriting
                      ? 'fill-rose-500'
                      : 'fill-emerald-400'
                  }
                />

                {/* Arms */}
                <line x1="6" y1="38" x2="10" y2="44" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="42" y1="38" x2="38" y2="44" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

                {/* Wheels / Base */}
                <ellipse cx="24" cy="53" rx="8" ry="3" className="fill-slate-700" />
              </svg>

              {/* Thread Name & TxID Badge below robot */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow ${colorClasses.badgeBg}`}
                >
                  {robot.name} ({robot.txId})
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
