import React, { useState } from 'react';
import { Terminal, Play, Sparkles, BookOpen, Code, Layers } from 'lucide-react';
import { SqlParser } from '../../db/sqlParser';

interface SqlConsoleProps {
  onRunSql: (sql: string) => void;
  isSimulating: boolean;
}

const SAMPLE_QUERIES = [
  {
    label: '1. 3-Table Multi-JOIN: Sessions + Tutors + Students (Full Schema Link)',
    sql: "SELECT Students.first_name, Students.major, Tutors.name, Sessions.session_date FROM Sessions JOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id JOIN Students ON Sessions.student_id = Students.student_id WHERE Sessions.status = 'Confirmed'",
    desc: '3-way relational join extracting student, tutor, and session attributes simultaneously.',
  },
  {
    label: '2. 2-Table JOIN & WHERE Predicate (Sessions + Tutors)',
    sql: "SELECT * FROM Sessions JOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id WHERE status = 'Completed'",
    desc: 'Demonstrates Sequential Table Scan, predicate evaluation, and Foreign Key JOIN lookup.',
  },
  {
    label: '3. Predicate Filter on Students (Computer Science)',
    sql: "SELECT * FROM Students WHERE major = 'Computer Science'",
    desc: 'Sequential scan inspecting each row and filtering out non-CS majors.',
  },
  {
    label: '4. Multi-condition Filter on Sessions',
    sql: "SELECT * FROM Sessions WHERE tutor_id = 101 AND status = 'Confirmed'",
    desc: 'Filters sessions booked with Dr. Alan Turing that are currently confirmed.',
  },
  {
    label: '5. Column Projection on Students',
    sql: 'SELECT student_id, first_name, major FROM Students',
    desc: 'Projects a subset of columns from the Students table.',
  },
  {
    label: '6. INSERT Record into Students',
    sql: "INSERT INTO Students (student_id, first_name, last_name, major) VALUES (6, 'Frank', 'Sinatra', 'Music Theory')",
    desc: 'Writes tentative WAL record, acquires Exclusive lock, and materializes row.',
  },
];

export const SqlConsole: React.FC<SqlConsoleProps> = ({ onRunSql, isSimulating }) => {
  const [sql, setSql] = useState(SAMPLE_QUERIES[0].sql);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  const parsed = SqlParser.parse(sql);

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setSql(SAMPLE_QUERIES[index].sql);
  };

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sql.trim() || isSimulating) return;
    onRunSql(sql.trim());
  };

  return (
    <div className="space-y-3.5">
      {/* Sample Query Presets */}
      <div>
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pre-built Educational Queries</span>
          </span>
          <span className="text-[10px] text-slate-400">Click to load</span>
        </label>
        <select
          value={selectedPresetIndex}
          onChange={(e) => handleSelectPreset(Number(e.target.value))}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
        >
          {SAMPLE_QUERIES.map((q, idx) => (
            <option key={idx} value={idx}>
              {q.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-400 mt-1 italic">
          💡 {SAMPLE_QUERIES[selectedPresetIndex].desc}
        </p>
      </div>

      {/* SQL Code Input */}
      <form onSubmit={handleExecute} className="space-y-2.5">
        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span>SQL Interactive Runner</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
              {parsed.ast.type}
            </span>
          </div>

          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={3}
            spellCheck={false}
            className="w-full bg-transparent p-3 text-xs font-mono text-cyan-300 focus:outline-none resize-none leading-relaxed selection:bg-cyan-700 selection:text-white"
            placeholder="Type standard SQL statement (SELECT, INSERT, UPDATE)..."
          />
        </div>

        {/* Live Plan Preview */}
        {parsed.plan.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px] space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Execution Plan Preview:</span>
            </span>
            <div className="font-mono text-slate-300 text-[10px] space-y-0.5 max-h-20 overflow-y-auto pl-1">
              {parsed.plan.slice(0, 3).map((p, idx) => (
                <div key={idx} className="truncate text-slate-400">
                  {p}
                </div>
              ))}
              {parsed.plan.length > 3 && (
                <div className="text-[9px] text-slate-400">... +{parsed.plan.length - 3} more steps</div>
              )}
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          type="submit"
          disabled={isSimulating || !sql.trim()}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wide shadow-lg flex items-center justify-center gap-2 transition duration-200 ${
            isSimulating || !sql.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-[0.99]'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isSimulating ? 'Worker Agent Executing Plan...' : 'Execute Query Plan'}</span>
        </button>
      </form>
    </div>
  );
};
