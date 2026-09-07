import React from 'react';
import {
  Database,
  Sparkles,
  Layers,
  Key,
  Lock,
  Bot,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Compass,
  FileText,
  Zap,
  CheckCircle2,
  Users,
  Table,
} from 'lucide-react';

interface WelcomePageProps {
  onSelectMode: (mode: 'engine_room' | 'database_builder' | 'database_editor') => void;
  onOpenTheory: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onSelectMode,
  onOpenTheory,
}) => {
  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto w-full py-6 md:py-10 px-4 gap-8 animate-fadeIn">
      {/* 1. HERO BANNER */}
      <div className="text-center space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-[#275D38] border border-emerald-200 text-xs font-mono font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#275D38] animate-pulse" />
          <span>Utah Valley University • Wolverine Database Lab</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          UVU Glass Box <br className="hidden sm:inline" />
          <span className="text-[#275D38] bg-gradient-to-r from-[#275D38] to-[#3b8754] bg-clip-text text-transparent">
            Database Internals Visualizer
          </span>
        </h1>

        <p className="text-sm md:text-base text-slate-600 leading-relaxed font-sans max-w-2xl mx-auto">
          Welcome to the <strong>interactive sandbox teaching environment</strong> designed to help you look inside the "glass box" and see how relational database engines truly work under the hood.
        </p>

        {/* Sandbox Notice Pill */}
        <div className="inline-flex items-center gap-2 p-2.5 px-4 rounded-2xl bg-slate-100/90 border border-slate-200 text-slate-700 text-xs shadow-xs">
          <Sparkles className="w-4 h-4 text-[#275D38] shrink-0" />
          <span>
            <strong>Safe Learning Sandbox:</strong> Experiment freely with SQL queries, concurrency locks, record mutations, and custom schemas with zero risk of breaking anything.
          </span>
        </div>
      </div>

      {/* 2. THREE PRIMARY PATHWAYS (CARDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* OPTION 1: ENGINE ROOM VISUALIZER */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-xl hover:shadow-2xl hover:border-emerald-500/60 transition-all duration-300 flex flex-col justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#275D38] to-emerald-400" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-emerald-50 text-[#275D38] border border-emerald-200 shadow-sm group-hover:scale-110 transition duration-300">
                <Bot className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/80 text-[#275D38] text-[10px] font-mono font-bold border border-emerald-300">
                Interactive Engine
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#275D38] transition">
                1. Engine Room Visualizer
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Step inside the active Engine Room with a live relational schema. Watch worker robots execute SQL joins, acquire Strict 2PL locks, and manage wait queues.
              </p>
            </div>

            <div className="space-y-2 pt-1 font-mono text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <Key className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>FK ➔ PK Key Token Unlocking:</strong> See how Foreign Keys unlock parent rows during Joins.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Strict 2PL Concurrency:</strong> Observe exclusive padlocks and transaction wait queues.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Interactive ACID Demos:</strong> Trigger rollbacks, constraint checks, and WAL flushes.
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectMode('engine_room')}
            className="w-full py-3 px-4 rounded-2xl bg-[#275D38] hover:bg-[#1c4529] text-white font-bold text-xs shadow-lg shadow-emerald-900/15 flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
          >
            <span>🔬 Enter Engine Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* OPTION 2: EDIT & MANIPULATE RECORDS (NEW) */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-xl hover:shadow-2xl hover:border-purple-500/60 transition-all duration-300 flex flex-col justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 to-indigo-500" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 shadow-sm group-hover:scale-110 transition duration-300">
                <Table className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-100/80 text-purple-900 text-[10px] font-mono font-bold border border-purple-300">
                DML Studio
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition">
                2. Edit Database Records
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add (<code className="font-mono text-purple-700 font-bold">INSERT</code>), modify (<code className="font-mono text-purple-700 font-bold">UPDATE</code>), and remove (<code className="font-mono text-purple-700 font-bold">DELETE</code>) records with guided instructions or visual forms.
              </p>
            </div>

            <div className="space-y-2 pt-1 font-mono text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <Compass className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Guided Step-by-Step DML:</strong> Learn tuple insertion, in-place updates, and deletion tombstones.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Interactive Visual Form:</strong> Click to add, edit, or delete with real-time 1:1 SQL generation.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Bot className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Live Little Robot Execution:</strong> Watch the robot acquire Exclusive Padlocks and log WAL records.
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectMode('database_editor')}
            className="w-full py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-lg shadow-purple-900/15 flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
          >
            <span>✏️ Enter Record Editor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* OPTION 3: BUILD YOUR OWN DATABASE */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-xl hover:shadow-2xl hover:border-blue-500/60 transition-all duration-300 flex flex-col justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-500" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 shadow-sm group-hover:scale-110 transition duration-300">
                <Database className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-100/80 text-blue-900 text-[10px] font-mono font-bold border border-blue-300">
                Architect Studio
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition">
                3. Build Your Own Database
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take the architect's seat! Follow a guided SQL tutorial or write custom DDL on a clean canvas, and watch the Wolverine Architect Robot assemble tables physically.
              </p>
            </div>

            <div className="space-y-2 pt-1 font-mono text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Granular DDL Training:</strong> Learn <code className="bg-slate-100 px-1 rounded text-blue-700 font-mono">CREATE TABLE</code>, Primary Keys, and Data Types.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Custom Table Freedom:</strong> Build any entity you want (Courses, Products, Dogs, Doctors).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Bot className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-sans text-[11px]">
                  <strong>Live Robot Construction:</strong> Watch the robot carry table frames and wire relational conduits.
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectMode('database_builder')}
            className="w-full py-3 px-4 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-lg shadow-blue-900/15 flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
          >
            <span>🏗️ Build Your Database</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. PEDAGOGICAL PILLARS OVERVIEW */}
      <div className="w-full max-w-5xl bg-slate-100/80 border border-slate-200/80 rounded-3xl p-6 md:p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <BookOpen className="w-4 h-4 text-[#275D38]" />
            <h3 className="font-bold text-sm text-slate-900">
              UVU Relational Database Theory & Internals Guide
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Want to review formal definitions before diving in? Explore our interactive pedagogical guide covering Relational Cardinality (1:1, 1:M, M:M), Strict 2PL locking, and ACID guarantees.
          </p>
        </div>

        <button
          onClick={onOpenTheory}
          className="shrink-0 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs shadow-sm flex items-center gap-2 transition"
        >
          <BookOpen className="w-4 h-4 text-[#275D38]" />
          <span>Open Theory Guide</span>
        </button>
      </div>
    </div>
  );
};
export default WelcomePage;
