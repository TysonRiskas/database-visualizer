import React from 'react';
import { QueryResult } from '../../types/database';
import { Table, CheckCircle2, Clock, Layers, Sparkles, Filter } from 'lucide-react';

interface QueryResultGridProps {
  queryResult?: QueryResult;
}

export const QueryResultGrid: React.FC<QueryResultGridProps> = ({ queryResult }) => {
  if (!queryResult) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
        <Table className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs font-semibold text-slate-400">No Query Results Yet</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Execute a SQL query from the SQL Console to inspect live results and execution metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Rows Matched</span>
          </span>
          <span className="text-sm font-bold font-mono mt-0.5">
            {queryResult.rowsMatched} rows
          </span>
        </div>

        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-400" />
            <span>Rows Scanned</span>
          </span>
          <span className="text-sm font-bold font-mono mt-0.5">
            {queryResult.rowsScanned} rows
          </span>
        </div>

        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Exec Time</span>
          </span>
          <span className="text-sm font-bold font-mono mt-0.5">
            {queryResult.executionTimeMs.toFixed(1)} ms
          </span>
        </div>
      </div>

      {/* Query Plan Badges */}
      {queryResult.queryPlanSteps && queryResult.queryPlanSteps.length > 0 && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 text-[10px] font-mono space-y-1">
          <div className="flex items-center gap-1 text-slate-400 font-semibold uppercase">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Executed Plan:</span>
          </div>
          <div className="text-slate-300 space-y-0.5 pl-1">
            {queryResult.queryPlanSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950 shadow-inner">
        <div className="max-h-56 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-[11px] font-mono border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                <th className="p-2 w-8 text-center text-slate-500 border-r border-slate-800">#</th>
                {queryResult.columns.map((col) => (
                  <th key={col} className="p-2 px-2.5 font-bold text-cyan-300 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {queryResult.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={queryResult.columns.length + 1}
                    className="p-4 text-center text-slate-500 italic text-xs"
                  >
                    Zero rows matched the WHERE predicate criteria.
                  </td>
                </tr>
              ) : (
                queryResult.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60 transition">
                    <td className="p-1.5 text-center text-[10px] text-slate-500 bg-slate-950 border-r border-slate-800/80">
                      {idx + 1}
                    </td>
                    {queryResult.columns.map((col) => (
                      <td key={col} className="p-1.5 px-2.5 whitespace-nowrap">
                        {row[col] !== undefined ? (
                          String(row[col])
                        ) : (
                          <span className="text-slate-600 italic">NULL</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
