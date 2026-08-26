import React from 'react';
import { DatabaseState, LockEntry, SimulationStep } from '../../types/database';
import { Key, Link, Lock, Unlock, Eye, Sparkles, Check, X, ShieldAlert } from 'lucide-react';

interface TableVisualizerProps {
  tableName: 'Students' | 'Tutors' | 'Sessions';
  databaseState: DatabaseState;
  activeLocks: LockEntry[];
  currentStep?: SimulationStep;
  accentColor: 'blue' | 'cyan' | 'purple';
}

export const TableVisualizer: React.FC<TableVisualizerProps> = ({
  tableName,
  databaseState,
  activeLocks,
  currentStep,
  accentColor,
}) => {
  const table = databaseState[tableName];
  if (!table) return null;

  const isTargetTable = currentStep?.targetTable === tableName;
  const isScanning = isTargetTable && currentStep?.type === 'STEP_SCAN_ROW';
  const isJoinTarget = currentStep?.joinEvaluation?.pkTable === tableName;

  const themeColors = {
    blue: {
      border: 'border-blue-500/40',
      headerBg: 'bg-blue-950/40',
      titleText: 'text-blue-300',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    cyan: {
      border: 'border-cyan-500/40',
      headerBg: 'bg-cyan-950/40',
      titleText: 'text-cyan-300',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    purple: {
      border: 'border-purple-500/40',
      headerBg: 'bg-purple-950/40',
      titleText: 'text-purple-300',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  }[accentColor];

  // Helper to find lock on a specific row
  const getRowLock = (rowId: any): LockEntry | undefined => {
    return activeLocks.find(
      (l) => l.table === tableName && String(l.rowId) === String(rowId)
    );
  };

  // Table-level lock check
  const tableLevelLock = activeLocks.find(
    (l) => l.table === tableName && (l.rowId === undefined || l.resourceId.endsWith(':__table__'))
  );

  return (
    <div
      className={`relative bg-slate-900/90 rounded-xl border ${themeColors.border} overflow-hidden shadow-lg flex flex-col transition-all duration-300 ${
        isTargetTable ? 'ring-2 ring-blue-400/40 shadow-blue-500/10' : ''
      }`}
    >
      {/* Table Laser Scan Line Overlay */}
      {isScanning && <div className="scan-laser-line" />}

      {/* Table Header & Metadata */}
      <div
        className={`p-2.5 border-b border-slate-800 ${themeColors.headerBg} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
          <h3 className={`font-mono font-bold text-xs ${themeColors.titleText}`}>
            {tableName}
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            ({table.rows.length} rows)
          </span>
        </div>

        {/* Table-level Lock / Status Badge */}
        {tableLevelLock ? (
          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
            <Eye className="w-3 h-3 text-blue-400" />
            <span>Table Read Lock (Shared)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            <Key className="w-2.5 h-2.5 text-amber-400" />
            <span>PK: {table.schema.primaryKey}</span>
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div className="overflow-x-auto max-h-56 overflow-y-auto">
        <table className="w-full text-left text-[11px] font-mono border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
              <th className="p-1.5 w-8 text-center text-[10px] font-medium text-slate-400 border-r border-slate-800/60">
                #
              </th>
              <th className="p-1.5 w-16 text-center text-[10px] font-medium text-slate-400 border-r border-slate-800/60">
                Lock
              </th>
              {table.schema.columns.map((col) => (
                <th key={col.name} className="p-1.5 px-2 font-semibold text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {col.isPrimaryKey && <Key className="w-3 h-3 text-amber-400 shrink-0" />}
                    {col.isForeignKey && <Link className="w-3 h-3 text-cyan-400 shrink-0" />}
                    <span>{col.name}</span>
                    <span className="text-[9px] text-slate-400 font-normal">
                      [{col.type.toLowerCase()}]
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {table.rows.map((row, rIndex) => {
              const pkVal = row[table.schema.primaryKey];
              const lock = getRowLock(pkVal);

              // Row scan state
              const isCurrentScanRow =
                isTargetTable &&
                currentStep?.targetRowIndex === rIndex;
              const predicatePass = currentStep?.predicateEvaluation?.passed;

              // Row insert animation
              const isNewlyInserted =
                isTargetTable &&
                currentStep?.type === 'STEP_ROW_INSERT' &&
                String(currentStep.targetRowId) === String(pkVal);

              // Join match highlight
              const isJoinMatchedRow =
                isJoinTarget &&
                String(row[currentStep?.joinEvaluation?.pkColumn || '']) ===
                  String(currentStep?.joinEvaluation?.fkValue);

              return (
                <tr
                  key={pkVal ?? rIndex}
                  className={`transition-all duration-300 relative ${
                    isNewlyInserted
                      ? 'bg-emerald-500/20 animate-commit-flash font-bold text-white'
                      : isCurrentScanRow
                      ? predicatePass
                        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500'
                        : 'bg-rose-500/10 text-slate-400 line-through opacity-70'
                      : isJoinMatchedRow
                      ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400'
                      : lock
                      ? lock.mode === 'EXCLUSIVE'
                        ? 'bg-rose-500/10 text-rose-200'
                        : 'bg-blue-500/10 text-blue-200'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  {/* Row Index */}
                  <td className="p-1.5 text-center text-[10px] text-slate-400 bg-slate-950/40 border-r border-slate-800/60 select-none">
                    {rIndex}
                  </td>

                  {/* Lock Indicator Cell */}
                  <td className="p-1.5 text-center border-r border-slate-800/60">
                    {lock ? (
                      lock.mode === 'EXCLUSIVE' ? (
                        <div
                          title={`Exclusive Lock held by ${lock.holderThreadName} (${lock.holderTxId})`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] animate-lock-pulse"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>X-Lock</span>
                        </div>
                      ) : (
                        <div
                          title={`Shared Read Lock held by ${lock.holderThreadName}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px]"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>S-Lock</span>
                        </div>
                      )
                    ) : (
                      <div
                        title="Resource Unlocked (Open for Read/Write)"
                        className="inline-flex items-center gap-0.5 text-emerald-400 text-[9px] opacity-75"
                      >
                        <Unlock className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </td>

                  {/* Columns */}
                  {table.schema.columns.map((col) => {
                    const cellVal = row[col.name];
                    const isPkCol = col.isPrimaryKey;
                    const isFkCol = col.isForeignKey;

                    return (
                      <td key={col.name} className="p-1.5 px-2 whitespace-nowrap">
                        {isPkCol ? (
                          <span className="font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                            {cellVal}
                          </span>
                        ) : isFkCol ? (
                          <span
                            title={`FK -> ${col.foreignKeyTarget?.table}.${col.foreignKeyTarget?.column}`}
                            className="text-cyan-300 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20 flex items-center gap-1 w-fit"
                          >
                            <Link className="w-2.5 h-2.5 opacity-70" />
                            {cellVal}
                          </span>
                        ) : col.name === 'status' ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              cellVal === 'Confirmed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : cellVal === 'Completed'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : cellVal === 'Pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {cellVal}
                          </span>
                        ) : (
                          <span>{cellVal}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
