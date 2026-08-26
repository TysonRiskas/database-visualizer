import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Lock,
  ShieldCheck,
  Cpu,
  Layers,
  FileText,
  Key,
} from 'lucide-react';

interface EducationalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cardinality' | 'query' | '2pl' | 'acid' | 'wal'>('cardinality');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-[#275D38]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                UVU Database Internals Theory & Pedagogical Guide
              </h2>
              <p className="text-xs text-slate-500">
                Relational Cardinality (1:1, 1:M, M:M), Strict 2PL, Foreign Keys & WAL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Topic Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('cardinality')}
            className={`flex-1 py-2.5 px-3 border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cardinality'
                ? 'border-[#275D38] text-[#275D38] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cardinality (1:1, 1:M, M:M)</span>
          </button>

          <button
            onClick={() => setActiveTab('query')}
            className={`flex-1 py-2.5 px-3 border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'query'
                ? 'border-[#275D38] text-[#275D38] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>FK & PK Joins</span>
          </button>

          <button
            onClick={() => setActiveTab('2pl')}
            className={`flex-1 py-2.5 px-3 border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === '2pl'
                ? 'border-[#275D38] text-[#275D38] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Strict 2PL</span>
          </button>

          <button
            onClick={() => setActiveTab('acid')}
            className={`flex-1 py-2.5 px-3 border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'acid'
                ? 'border-[#275D38] text-[#275D38] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ACID Guarantees</span>
          </button>

          <button
            onClick={() => setActiveTab('wal')}
            className={`flex-1 py-2.5 px-3 border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'wal'
                ? 'border-[#275D38] text-[#275D38] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>WAL (Durability)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
          {activeTab === 'cardinality' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-sm text-[#275D38] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#275D38]" />
                  <span>Relational Database Cardinality Framework</span>
                </h3>
                <p className="text-slate-700 text-xs">
                  <strong>Cardinality</strong> specifies the numerical relationship between occurrences in Table A and Table B. In SQL relational databases, there are 3 fundamental cardinality types:
                </p>
              </div>

              {/* 1:M (One-to-Many) */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#275D38] flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#275D38] text-white font-mono text-xs">1 : M</span>
                    <span>One-to-Many Relationship (Most Common)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-[#275D38] font-semibold">
                    Standard Foreign Key
                  </span>
                </div>
                <p className="text-slate-700 text-xs">
                  <strong>Definition:</strong> One record in the parent table can relate to <strong>many</strong> records in the child table. However, each child record references exactly <strong>one</strong> parent.
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 font-mono text-[11px] space-y-1">
                  <div className="text-slate-700"><strong>Example in Stage:</strong> <code className="text-[#275D38]">Students</code> (1) ➔ <code className="text-[#275D38]">Sessions</code> (M)</div>
                  <div className="text-slate-500 text-[10px]">One student can book 10 tutoring sessions. Each individual session is assigned to 1 student.</div>
                </div>
              </div>

              {/* M:M (Many-to-Many) */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-purple-900 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-mono text-xs">M : M</span>
                    <span>Many-to-Many Relationship (Resolved via Junction Table)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                    Junction / Associative Table
                  </span>
                </div>
                <p className="text-slate-700 text-xs">
                  <strong>Definition:</strong> Multiple records in Table A can relate to multiple records in Table B. In relational databases, this <em>cannot</em> be implemented directly with a single foreign key; it requires a <strong>Junction Table</strong> containing two foreign keys.
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-purple-200 font-mono text-[11px] space-y-1">
                  <div className="text-slate-700"><strong>Example in Stage:</strong> <code className="text-purple-700">Students</code> (M) ➔ <code className="text-purple-700">Sessions</code> (Junction) ➔ <code className="text-purple-700">Tutors</code> (M)</div>
                  <div className="text-slate-500 text-[10px]">A student can have many tutors, and a tutor teaches many students. The <code className="text-purple-700">Sessions</code> table bridges the relationship!</div>
                </div>
              </div>

              {/* 1:1 (One-to-One) */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-900 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono text-xs">1 : 1</span>
                    <span>One-to-One Relationship</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    Unique Foreign Key
                  </span>
                </div>
                <p className="text-slate-700 text-xs">
                  <strong>Definition:</strong> Each record in Table A relates to at most <strong>one</strong> record in Table B, and vice versa.
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 font-mono text-[11px] space-y-1">
                  <div className="text-slate-700"><strong>Example:</strong> <code className="text-blue-700">Users</code> (1) ➔ <code className="text-blue-700">UserProfiles</code> (1)</div>
                  <div className="text-slate-500 text-[10px]">Implemented by placing a <code className="text-blue-700">UNIQUE</code> constraint on the Foreign Key.</div>
                </div>
              </div>
            </div>
          )}
          {activeTab === '2pl' && (
            <div className="space-y-3.5">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-sm text-[#275D38]">
                  What is Strict Two-Phase Locking (2PL)?
                </h3>
                <p className="text-slate-700">
                  Strict 2PL is the standard concurrency control protocol used by relational database engines to guarantee <strong>Serializability</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="font-bold text-[#275D38]">Phase 1: Growing Phase</span>
                    <p className="text-slate-600 mt-0.5 text-[11px]">
                      The transaction acquires Shared (S) or Exclusive (X) locks as needed. No locks may be released during this phase.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="font-bold text-amber-800">Phase 2: Strict Shrinking Phase</span>
                    <p className="text-slate-600 mt-0.5 text-[11px]">
                      All locks held by the transaction are held continuously until the exact moment of <strong>COMMIT</strong>, where all locks are released simultaneously.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lock Compatibility Matrix */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Lock Compatibility Matrix:</span>
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-center text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-left">Existing \ Requested</th>
                        <th className="p-2 text-blue-700">Shared (Read / S)</th>
                        <th className="p-2 text-rose-700">Exclusive (Write / X)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2 text-left font-bold text-blue-800">Shared (S)</td>
                        <td className="p-2 text-[#275D38] bg-emerald-50 font-bold">GRANTED ✔</td>
                        <td className="p-2 text-rose-600 bg-rose-50 font-bold">BLOCKED ✖</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-left font-bold text-rose-800">Exclusive (X)</td>
                        <td className="p-2 text-rose-600 bg-rose-50 font-bold">BLOCKED ✖</td>
                        <td className="p-2 text-rose-600 bg-rose-50 font-bold">BLOCKED ✖</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'acid' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[#275D38]">
                The 4 ACID Pillars of Relational Database Transactions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-[#275D38] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-[#275D38] flex items-center justify-center text-xs font-mono font-bold">A</span>
                    Atomicity ("All or Nothing")
                  </span>
                  <p className="text-slate-600 text-[11px] mt-1">
                    Either all modifications in the transaction succeed and commit, or every operation is rolled back using WAL undo records.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-blue-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-mono font-bold">C</span>
                    Consistency (Integrity Constraints)
                  </span>
                  <p className="text-slate-600 text-[11px] mt-1">
                    Enforces Primary Key uniqueness and Foreign Key referential integrity across all related tables.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-amber-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-mono font-bold">I</span>
                    Isolation (Concurrency Control)
                  </span>
                  <p className="text-slate-600 text-[11px] mt-1">
                    Strict 2PL prevents race conditions, dirty reads, and write skew between concurrent clients.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-purple-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center text-xs font-mono font-bold">D</span>
                    Durability (Write-Ahead Log)
                  </span>
                  <p className="text-slate-600 text-[11px] mt-1">
                    Once committed, data persists permanently even through system power outages.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'query' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[#275D38]">
                Foreign Key Tokens & Primary Key Unlocking (SQL Joins)
              </h3>
              <p className="text-slate-700">
                In relational databases, foreign keys act as physical pointers (or "Key Tokens") that look up and unlock parent records:
              </p>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="font-bold text-[#275D38] shrink-0">1. FK Key Token Grab:</span>
                  <span className="text-slate-600 font-sans">
                    The query engine reads the <code className="text-blue-700 font-mono">Sessions.tutor_id</code> value from the matching child record.
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="font-bold text-amber-700 shrink-0">2. Primary Key Unlocking:</span>
                  <span className="text-slate-600 font-sans">
                    The engine indexes into <strong className="text-slate-900">Tutors</strong> and unlocks the row where <code className="text-amber-700 font-mono">Tutors.tutor_id = Sessions.tutor_id</code>.
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <span className="font-bold text-[#275D38] shrink-0">3. Projection into Results Tray:</span>
                  <span className="text-slate-600 font-sans">
                    Combines session date, student details, and tutor attributes into a single result row and extracts it to the Results Tray.
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wal' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[#275D38]">
                Write-Ahead Logging (WAL) & LSN Tracking
              </h3>
              <p className="text-slate-700">
                Log records must hit non-volatile storage before dirty memory pages are modified.
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1 text-[11px]">
                <span className="font-bold text-[#275D38]">Log Sequence Numbers (LSN):</span>
                <p className="text-slate-600">
                  Every INSERT, UPDATE, and COMMIT operation is tagged with a strictly sequential integer LSN for crash recovery.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#275D38] hover:bg-[#1b4327] text-white font-bold text-xs transition shadow"
          >
            Got it, return to stage
          </button>
        </div>
      </div>
    </div>
  );
};
