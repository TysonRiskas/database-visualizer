import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle,
  Layers,
  HardDrive,
  Play,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';

export type AcidProperty = 'A' | 'C' | 'I' | 'D';

interface AcidSidebarProps {
  activeAcidProperty?: AcidProperty;
  onRunAcidDemo: (property: AcidProperty) => void;
  isPlaying?: boolean;
}

export const AcidSidebar: React.FC<AcidSidebarProps> = ({
  activeAcidProperty,
  onRunAcidDemo,
  isPlaying = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const acidItems = [
    {
      key: 'A' as const,
      letter: 'A',
      title: 'Atomicity',
      subtitle: 'All or Nothing Execution',
      color: 'rose',
      borderClass: 'border-rose-300 hover:border-rose-500 bg-rose-50/50',
      badgeBg: 'bg-rose-600 text-white',
      desc: 'Guarantees that a multi-table transaction either succeeds completely across all tables or cleanly rolls back with ZERO partial writes upon failure.',
      mechanism: 'Undo Logging & Automatic Rollback Segments',
      demoTitle: 'Crash & Rollback Demo',
      demoExplanation: 'Simulates a network drop mid-flight: Carlos Mendez is typed into Students, error occurs, and system rolls back to 0 corruption.',
    },
    {
      key: 'C' as const,
      letter: 'C',
      title: 'Consistency',
      subtitle: 'Referential Invariant Preservation',
      color: 'amber',
      borderClass: 'border-amber-300 hover:border-amber-500 bg-amber-50/50',
      badgeBg: 'bg-[#D4AF37] text-slate-950 font-bold',
      desc: 'Enforces that data always satisfies all schema rules, Primary Key uniqueness, and Foreign Key referential integrity constraints.',
      mechanism: 'Schema Validation & Foreign Key Resolution',
      demoTitle: 'FK Violation Demo',
      demoExplanation: 'Attempts to book invalid Tutor #999. Engine catches the missing parent PK and rejects the write to prevent orphan records.',
    },
    {
      key: 'I' as const,
      letter: 'I',
      title: 'Isolation',
      subtitle: 'Strict 2-Phase Locking Concurrency',
      color: 'blue',
      borderClass: 'border-blue-300 hover:border-blue-500 bg-blue-50/50',
      badgeBg: 'bg-[#275D38] text-white font-bold',
      desc: 'Controls how concurrent transactions execute simultaneously without race conditions, dirty reads, or conflicting updates.',
      mechanism: 'Strict 2PL & Lock Wait Queue Lane',
      demoTitle: '3-Thread Concurrency Demo',
      demoExplanation: 'Fires 3 simultaneous threads: Alpha locks Tutor #101, Beta enters the Wait Queue Lane, and Gamma runs in parallel.',
    },
    {
      key: 'D' as const,
      letter: 'D',
      title: 'Durability',
      subtitle: 'Write-Ahead Log (WAL) Persistence',
      color: 'emerald',
      borderClass: 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/50',
      badgeBg: 'bg-[#059669] text-white font-bold',
      desc: 'Guarantees that once a transaction receives COMMIT confirmation, all updates are written to non-volatile disk and survive reboots.',
      mechanism: 'WAL LSN Stamping & Disk fsync() Flush',
      demoTitle: 'WAL Persistence Demo',
      demoExplanation: 'Appends LSN #1094 to the non-volatile WAL journal before updating memory pages, ensuring crash recovery survival.',
    },
  ];

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center bg-white border border-slate-200 rounded-3xl p-3 shadow-xl transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition mb-4 shadow-sm"
          title="Expand ACID Framework Sidebar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-2 rounded-2xl bg-[#275D38] text-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-mono font-bold text-[#275D38] [writing-mode:vertical-lr] tracking-widest uppercase">
            ACID Framework
          </span>

          <div className="flex flex-col gap-2 mt-2">
            {acidItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setIsCollapsed(false);
                  onRunAcidDemo(item.key);
                }}
                className={`w-8 h-8 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition shadow-sm ${
                  activeAcidProperty === item.key
                    ? `${item.badgeBg} ring-2 ring-emerald-400 scale-110`
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
                title={`Demonstrate ${item.title}`}
              >
                {item.letter}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-full xl:w-80 2xl:w-96 flex flex-col bg-white border border-slate-200 rounded-3xl p-5 shadow-xl transition-all duration-300 gap-4 shrink-0">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-[#275D38] text-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#275D38] font-sans tracking-tight flex items-center gap-1.5">
              <span>ACID Framework</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-100 text-[#275D38] font-bold">
                Interactive
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">
              Click any letter to visualize the concept in real time
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
          title="Collapse Sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ACID Principle Cards */}
      <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        {acidItems.map((item) => {
          const isActive = activeAcidProperty === item.key;

          return (
            <div
              key={item.key}
              className={`rounded-2xl border-2 p-3.5 flex flex-col gap-2.5 transition-all duration-200 shadow-sm ${
                item.borderClass
              } ${isActive ? 'ring-2 ring-emerald-500 shadow-md scale-[1.01] bg-white' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl font-mono font-bold text-sm flex items-center justify-center shadow-sm shrink-0 ${item.badgeBg}`}
                  >
                    {item.letter}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono font-medium">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#275D38] text-white animate-pulse">
                    Live Demo
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                {item.desc}
              </p>

              <div className="p-2 rounded-xl bg-white/80 border border-slate-200/80 text-[10px] font-mono text-slate-600 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#275D38] shrink-0 mt-0.5" />
                <span>
                  <strong>Mechanism:</strong> {item.mechanism}
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onRunAcidDemo(item.key)}
                disabled={isPlaying}
                className={`mt-0.5 w-full py-2 px-3 rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 ${
                  isActive
                    ? 'bg-[#275D38] text-white hover:bg-[#1f492c] ring-2 ring-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Demonstrate [{item.letter}] in Practice</span>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
