import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DatabaseState,
  LockEntry,
  RowData,
  SimulationStep,
  WorkerRobotState,
  WaitQueueLaneRobot,
  TableState,
} from '../../types/database';
import {
  Key,
  Link,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  Table,
  Code2,
  ShieldAlert,
  Users,
  Cpu,
  Layers,
  Database,
} from 'lucide-react';

interface StageCanvasProps {
  databaseState: DatabaseState;
  activeLocks: LockEntry[];
  currentStep?: SimulationStep;
  workerRobots: WorkerRobotState[];
  extractedTrayRows?: RowData[];
}

interface AnchorPoint {
  x: number;
  y: number;
}

interface RelationshipLink {
  id: string;
  sourceTable: string;
  sourceCol: string;
  targetTable: string;
  targetCol: string;
  cardinality: string;
  fromAnchorId: string;
  toAnchorId: string;
}

/**
 * Character-by-character typing animation component with human cadence (~115ms)
 */
const TypingCell: React.FC<{ text: any; isTyping?: boolean; prefix?: string }> = ({
  text,
  isTyping = false,
  prefix = '',
}) => {
  const str = text !== undefined && text !== null ? String(text) : '';
  const [displayedLength, setDisplayedLength] = useState(isTyping ? 0 : str.length);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedLength(str.length);
      return;
    }

    setDisplayedLength(0);
    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      setDisplayedLength(currentIdx);
      if (currentIdx >= str.length) {
        clearInterval(interval);
      }
    }, 115);

    return () => clearInterval(interval);
  }, [str, isTyping]);

  return (
    <span className="font-mono inline-flex items-center">
      {prefix}
      <span>{str.slice(0, displayedLength)}</span>
      {isTyping && displayedLength < str.length && (
        <span className="inline-block w-1.5 h-3.5 bg-[#275D38] ml-0.5 animate-pulse" />
      )}
    </span>
  );
};

export const StageCanvas: React.FC<StageCanvasProps> = ({
  databaseState,
  activeLocks,
  currentStep,
  workerRobots,
  extractedTrayRows = [],
}) => {
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  const tableEntries = Object.entries(databaseState);
  const isCompletelyBlank = tableEntries.length === 0;

  const joinBeam = currentStep?.joinBeam;
  const keyToken = currentStep?.keyToken;
  const ghostSlot = currentStep?.ghostSlot;
  const waitQueueLaneRobots: WaitQueueLaneRobot[] = currentStep?.waitQueueLaneRobots || [];

  // Active SQL & Clause Highlight
  const activeSql = currentStep?.activeSqlString;
  const highlightClause = currentStep?.sqlClauseHighlight;

  // Auto-scroll refs
  const tableBottomRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Dynamic Anchor Points for PK ➔ FK Column Header Connectors
  const [relationshipAnchors, setRelationshipAnchors] = useState<
    Record<string, { from: AnchorPoint | null; to: AnchorPoint | null }>
  >({});

  // Helper for row-level lock
  const getRowLock = (tableName: string, rowId: any): LockEntry | undefined => {
    return activeLocks.find(
      (l) =>
        l.table.toLowerCase() === tableName.toLowerCase() &&
        String(l.rowId) === String(rowId)
    );
  };

  const isColumnProjected = (tableName: string, colName: string): boolean => {
    const cols = currentStep?.projectedColumns;
    if (cols && cols.length > 0) {
      if (cols.includes('*') || cols.some((c) => c.trim() === '*')) {
        return true;
      }
      const cleanCol = colName.toLowerCase();
      return cols.some((c) => {
        const clean = c.trim().toLowerCase();
        if (clean === '*' || clean === `${tableName.toLowerCase()}.*`) return true;
        const colPart = clean.includes('.') ? clean.split('.').pop() : clean;
        const tablePart = clean.includes('.') ? clean.split('.')[0] : null;
        if (tablePart && tablePart !== tableName.toLowerCase()) return false;
        return colPart === cleanCol || clean === cleanCol;
      });
    }
    if (activeSql) {
      if (activeSql.includes('*')) return true;
      return activeSql.toLowerCase().includes(colName.toLowerCase());
    }
    return false;
  };

  const isEntireRowProjected = (tableName: string): boolean => {
    const cols = currentStep?.projectedColumns;
    if (cols && cols.length > 0) {
      if (cols.includes('*') || cols.some((c) => c.trim() === '*')) return true;
      if (cols.some((c) => c.trim().toLowerCase() === `${tableName.toLowerCase()}.*`)) return true;
      const table = databaseState[tableName];
      if (!table || !table.schema?.columns || table.schema.columns.length === 0) return false;
      return table.schema.columns.every((col) => isColumnProjected(tableName, col.name));
    }
    if (activeSql && activeSql.includes('*')) return true;
    return false;
  };

  // Discover all active relationships
  const relationships: RelationshipLink[] = [];
  tableEntries.forEach(([tName, table]) => {
    table.schema.columns.forEach((col) => {
      if (col.isForeignKey && col.foreignKeyTarget) {
        const targetTable = col.foreignKeyTarget.table;
        const targetCol = col.foreignKeyTarget.column;
        const relId = `${tName}.${col.name}->${targetTable}.${targetCol}`;
        relationships.push({
          id: relId,
          sourceTable: tName,
          sourceCol: col.name,
          targetTable,
          targetCol,
          cardinality: col.foreignKeyCardinality || '1:M',
          fromAnchorId: `anchor-pk-${targetTable.toLowerCase()}-${targetCol.toLowerCase()}`,
          toAnchorId: `anchor-fk-${tName.toLowerCase()}-${col.name.toLowerCase()}`,
        });
      }
    });
  });

  const updateAnchorPositions = () => {
    if (!stageContainerRef.current) return;
    const stageRect = stageContainerRef.current.getBoundingClientRect();

    const getCenter = (id: string): AnchorPoint | null => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - stageRect.left,
        y: rect.top + rect.height / 2 - stageRect.top,
      };
    };

    const newAnchors: Record<string, { from: AnchorPoint | null; to: AnchorPoint | null }> = {};
    relationships.forEach((rel) => {
      newAnchors[rel.id] = {
        from: getCenter(rel.fromAnchorId),
        to: getCenter(rel.toAnchorId),
      };
    });
    setRelationshipAnchors(newAnchors);
  };

  useLayoutEffect(() => {
    updateAnchorPositions();
    const ro = new ResizeObserver(updateAnchorPositions);
    if (stageContainerRef.current) {
      ro.observe(stageContainerRef.current);
    }
    window.addEventListener('resize', updateAnchorPositions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateAnchorPositions);
    };
  }, [databaseState, currentStep]);

  useEffect(() => {
    if (ghostSlot?.table && tableBottomRefs.current[ghostSlot.table]) {
      tableBottomRefs.current[ghostSlot.table]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [ghostSlot]);

  // Separate parent tables from junction/child tables
  const parentTables: [string, TableState][] = [];
  const childTables: [string, TableState][] = [];

  tableEntries.forEach(([tName, table]) => {
    const fkCount = table.schema.columns.filter((c) => c.isForeignKey).length;
    if (fkCount >= 2 || tName.toLowerCase() === 'sessions') {
      childTables.push([tName, table]);
    } else {
      parentTables.push([tName, table]);
    }
  });

  const renderTableCard = (tableName: string, table: TableState, isFullWidth = false) => {
    const isTarget =
      currentStep?.targetTable?.toLowerCase() === tableName.toLowerCase() ||
      (activeSql && activeSql.toLowerCase().includes(tableName.toLowerCase()));

    const isDrivingFocus =
      highlightClause === 'FROM' &&
      (currentStep?.targetTable?.toLowerCase() === tableName.toLowerCase() ||
        (activeSql && activeSql.toLowerCase().includes(`from ${tableName.toLowerCase()}`)));

    const isSelectTarget =
      activeSql &&
      activeSql.toUpperCase().includes('SELECT') &&
      isTarget &&
      !isDrivingFocus;

    const fkColumns = table.schema.columns.filter((c) => c.isForeignKey);
    const isJunction = fkColumns.length >= 2;

    return (
      <div
        key={tableName}
        className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-md flex flex-col relative z-10 ${
          isDrivingFocus
            ? 'border-[#275D38] ring-4 ring-emerald-500/40 shadow-2xl bg-emerald-50/20'
            : isSelectTarget
            ? 'border-cyan-500 ring-2 ring-cyan-400/30 shadow-lg bg-cyan-50/10'
            : 'border-slate-200'
        } ${isFullWidth ? 'w-full' : ''}`}
      >
        {/* Table Card Header */}
        <div className="p-3 bg-[#275D38]/10 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#275D38]" />
            <h3 className="font-mono font-bold text-xs text-[#275D38]">{tableName}</h3>
            <span className="text-[10px] text-slate-500 font-mono">({table.rows.length} rows)</span>

            {isDrivingFocus && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#275D38] text-white animate-pulse shadow-xs">
                FROM Driving Table Focus
              </span>
            )}

            {isSelectTarget && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-700 text-white shadow-sm flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3 h-3 text-cyan-200" /> SELECT Target ({tableName})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
            {isJunction && (
              <div className="group relative cursor-help">
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold flex items-center gap-1 shadow-xs transition hover:scale-105 hover:bg-purple-600 hover:text-white">
                  <Layers className="w-3 h-3 text-purple-600 group-hover:text-white" />
                  <span>M:M Junction</span>
                </span>
                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex flex-col w-80 p-3.5 bg-slate-950/95 text-white rounded-2xl shadow-2xl z-50 text-xs font-sans border border-purple-500/40 pointer-events-none backdrop-blur animate-fadeIn">
                  <div className="font-bold text-purple-300 flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>M:M (Many-to-Many Junction Table)</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-700">
                      Associative Table
                    </span>
                  </div>
                  <p className="text-slate-200 mt-2 text-[11px] leading-relaxed">
                    Table <strong className="text-purple-400">{tableName}</strong> acts as an associative/junction table containing dual Foreign Keys to resolve Many-to-Many entity relationships.
                  </p>
                </div>
              </div>
            )}

            {table.schema.primaryKey && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
                <Key className="w-3 h-3 text-amber-600" /> PK: {table.schema.primaryKey}
              </span>
            )}

            {fkColumns.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 font-semibold">
                <Link className="w-3 h-3 text-blue-600" /> FK: {fkColumns.map((c) => c.name).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Table Card Body */}
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] sticky top-0 bg-slate-100 z-10">
                <th className="p-2 w-8 text-center text-slate-400">#</th>
                <th className="p-2 w-16 text-center text-slate-400">Lock</th>
                {table.schema.columns.map((col) => {
                  const isProj = isColumnProjected(tableName, col.name);
                  const isPk = col.isPrimaryKey;
                  const isFk = col.isForeignKey;
                  const pkAnchorId = `anchor-pk-${tableName.toLowerCase()}-${col.name.toLowerCase()}`;
                  const fkAnchorId = `anchor-fk-${tableName.toLowerCase()}-${col.name.toLowerCase()}`;

                  return (
                    <th
                      key={col.name}
                      id={isPk ? pkAnchorId : isFk ? fkAnchorId : undefined}
                      className={`p-2 transition-colors duration-200 ${
                        isProj
                          ? 'text-cyan-950 bg-cyan-100/90 border-b-2 border-cyan-500 font-bold'
                          : isPk
                          ? 'text-amber-800 bg-amber-100/70 border-b-2 border-amber-400 font-bold'
                          : isFk
                          ? 'text-blue-800 bg-blue-100/70 border-b-2 border-blue-400 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        {isPk && <Key className="w-3 h-3 text-amber-600" />}
                        {isFk && <Link className="w-3 h-3 text-blue-600" />}
                        <span>
                          {col.name}{' '}
                          {isPk
                            ? '(PK)'
                            : isFk
                            ? `(FK ${col.foreignKeyCardinality || '1:M'})`
                            : `(${col.type})`}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
              {table.rows.length === 0 && (!ghostSlot || ghostSlot.table?.toLowerCase() !== tableName.toLowerCase()) ? (
                <tr>
                  <td
                    colSpan={table.schema.columns.length + 2}
                    className="p-4 text-center text-slate-400 italic text-[11px]"
                  >
                    Table ready! No rows inserted yet.
                  </td>
                </tr>
              ) : (
                table.rows.map((row, idx) => {
                  const pkVal = row[table.schema.primaryKey];
                  const lock = getRowLock(tableName, pkVal);
                  const isNewlyAdded =
                    currentStep?.targetTable?.toLowerCase() === tableName.toLowerCase() &&
                    String(currentStep?.targetRowId) === String(pkVal);

                  const rowPersistentStatus = currentStep?.evaluatedRowStatuses?.find(
                    (es) =>
                      es.table?.toLowerCase() === tableName.toLowerCase() &&
                      ((pkVal !== undefined && String(es.rowId) === String(pkVal)) ||
                        es.rowIndex === idx)
                  )?.status;

                  const isScanningThisRow =
                    currentStep?.targetTable?.toLowerCase() === tableName.toLowerCase() &&
                    (currentStep?.targetRowIndex === idx ||
                      (pkVal !== undefined && String(currentStep?.targetRowId) === String(pkVal)));

                  const isRowMatch =
                    rowPersistentStatus === 'MATCH' ||
                    (isScanningThisRow && currentStep?.predicateEvaluation?.passed === true);
                  const isRowFailed =
                    rowPersistentStatus === 'FILTERED' ||
                    (isScanningThisRow && currentStep?.predicateEvaluation?.passed === false);

                  const isGrabbingKeyFromThisRow =
                    keyToken?.active &&
                    keyToken.sourceTable?.toLowerCase() === tableName.toLowerCase() &&
                    String(keyToken.keyValue) === String(pkVal);

                  return (
                    <tr
                      key={idx}
                      className={`relative transition-all duration-300 ${
                        isRowMatch
                          ? 'bg-red-50/40 text-slate-900 font-bold'
                          : isRowFailed
                          ? 'bg-rose-50/80 text-slate-400 opacity-60'
                          : lock
                          ? 'bg-rose-50 text-rose-900'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* 1. BOLD RED STRIKE-THROUGH LINE ON WHERE FAILURE */}
                      {isRowFailed && (
                        <div className="absolute inset-y-1/2 left-2 right-2 h-1 bg-red-600 shadow-md rounded-full pointer-events-none z-30 animate-strike-through" />
                      )}

                      {/* 2. BOLD RED CIRCLE ON WHERE MATCH (FULL ROW IF SELECT *) */}
                      {(isRowMatch || isGrabbingKeyFromThisRow) && isEntireRowProjected(tableName) && (
                        <div className="absolute -inset-1 rounded-2xl border-3 border-red-600 bg-red-500/10 pointer-events-none z-20 animate-red-circle shadow-lg" />
                      )}

                      <td className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">
                        {idx + 1}
                      </td>
                      <td className="p-2 text-center">
                        {isGrabbingKeyFromThisRow ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-400 text-[9px] font-extrabold animate-pulse">
                            <Key className="w-3 h-3" />
                            <span>FK Key</span>
                          </div>
                        ) : isRowMatch ? (
                          <span className="text-red-600 font-extrabold flex items-center justify-center gap-0.5 text-[10px] bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                          </span>
                        ) : isRowFailed ? (
                          <span className="text-rose-700 font-extrabold flex items-center justify-center gap-0.5 text-[10px] bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> FILTER
                          </span>
                        ) : lock ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9px] font-bold animate-lock-pulse">
                            <Lock className="w-3 h-3" />
                            <span>PADLOCK</span>
                          </div>
                        ) : (
                          <Unlock className="w-3 h-3 text-emerald-600/40 inline" />
                        )}
                      </td>

                      {/* Dynamic Column Data Cells */}
                      {table.schema.columns.map((col) => {
                        const cellVal = row[col.name];
                        const isProj = isColumnProjected(tableName, col.name);
                        const isPk = col.isPrimaryKey;
                        const isFk = col.isForeignKey;

                        return (
                          <td
                            key={col.name}
                            className={`p-2 font-mono relative transition-colors duration-200 ${
                              isRowMatch && isProj
                                ? 'text-red-950 font-bold bg-red-50/60'
                                : isPk
                                ? 'text-amber-700 bg-amber-50/30'
                                : isFk
                                ? 'text-blue-700 bg-blue-50/20'
                                : ''
                            }`}
                          >
                            {/* Individual cell red circle if NOT entire row circled */}
                            {isRowMatch && !isEntireRowProjected(tableName) && isProj && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <div className="flex items-center gap-1 relative z-10">
                              {isPk && <Key className="w-3 h-3 text-amber-600 shrink-0" />}
                              {isFk && <Link className="w-3 h-3 text-blue-600 shrink-0" />}
                              <span>
                                <TypingCell
                                  text={cellVal}
                                  isTyping={
                                    isNewlyAdded &&
                                    (currentStep?.type === 'STEP_SNAP_PAYLOAD' ||
                                      currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')
                                  }
                                  prefix={isPk || isFk ? '#' : ''}
                                />
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}

              {/* GHOST SLOT FOR NEW TUPLE INSERTION */}
              {ghostSlot && ghostSlot.table?.toLowerCase() === tableName.toLowerCase() && (
                <tr
                  ref={(el) => {
                    tableBottomRefs.current[tableName] = el;
                  }}
                  className="bg-emerald-50 border-2 border-dashed border-[#275D38] animate-pulse text-[#275D38] font-bold"
                >
                  <td className="p-2 text-center text-[10px] bg-slate-100 font-mono">
                    {table.rows.length + 1}
                  </td>
                  <td className="p-2 text-center">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9px]">
                      <Lock className="w-3 h-3" /> PADLOCK
                    </span>
                  </td>
                  {table.schema.columns.map((col) => {
                    const ghostVal = ghostSlot.rowData?.[col.name] ?? '';
                    return (
                      <td key={col.name} className="p-2 font-mono">
                        <TypingCell
                          text={ghostVal || `${col.name}...`}
                          isTyping={true}
                          prefix={col.isPrimaryKey || col.isForeignKey ? '#' : ''}
                        />
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={stageContainerRef}
      className="relative bg-white rounded-3xl border border-slate-200 p-5 shadow-xl flex flex-col gap-5 overflow-visible min-h-[740px]"
    >
      {/* 1. TOP STAGE HEADER: UVU Green Header with Live SQL Code Highlighter & Lock Wait Queue Lane */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#275D38] animate-pulse" />
            <h2 className="text-base font-bold text-[#275D38] font-sans tracking-tight">
              UVU Relational Database Internals Stage
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-mono text-slate-700">
              <Users className="w-3 h-3 text-[#275D38]" />
              <span>Left-Hand Staging Bay Active</span>
            </div>
          </div>

          {/* ON-STAGE VISUAL LOCK WAIT QUEUE LANE */}
          <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-2 px-3.5 flex items-center gap-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Lock Wait Queue Lane:</span>
            </div>

            {waitQueueLaneRobots.length === 0 ? (
              <span className="text-[11px] font-mono text-slate-500 italic">
                (Empty — 0 blocked threads)
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {waitQueueLaneRobots.map((wb) => (
                  <div
                    key={wb.id}
                    className="flex items-center gap-1.5 bg-amber-200/80 border border-amber-400 text-amber-950 px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold animate-pulse shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                    <span>#{wb.queuePosition} In Queue:</span>
                    <span>{wb.name}</span>
                    <span className="text-[10px] text-amber-800 font-normal">
                      (Waiting on {wb.waitingOnResource})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LIVE SQL CLAUSE HIGHLIGHTER BAR */}
        {activeSql && (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-3 px-4 shadow-lg text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-100 animate-fadeIn">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Code2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Active SQL Plan:
              </span>
            </div>

            <div className="flex-1 overflow-x-auto text-slate-200 flex items-center gap-2 flex-wrap text-[11px] leading-relaxed">
              <span className="font-mono">{activeSql}</span>
            </div>

            {highlightClause && (
              <div className="shrink-0 bg-[#275D38] text-white font-bold px-2.5 py-1 rounded-xl text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm animate-pulse">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Executing: {highlightClause}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN STAGE BODY: LEFT-HAND STAGING BAY + RIGHT-HAND DATABASE TABLES */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch relative">
        {/* DEDICATED LEFT-HAND WORKER ROBOT STAGING BAY */}
        <div className="w-full lg:w-44 xl:w-48 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-4 shadow-inner">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Cpu className="w-4 h-4 text-[#275D38]" />
            <div>
              <h3 className="text-xs font-bold text-[#275D38] font-sans">
                Worker Staging Bay
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">Idle & Return Docks</p>
            </div>
          </div>

          {/* 3 VISUAL DOCKING PADS */}
          <div className="flex flex-row lg:flex-col justify-around lg:justify-between gap-3 flex-1 py-1">
            {/* Dock 1: Alpha / Primary */}
            <div className="flex-1 rounded-xl border-2 border-dashed border-[#275D38]/40 bg-white/80 p-2.5 flex flex-col items-center justify-center gap-1 relative shadow-xs">
              <div className="w-9 h-9 rounded-full border border-emerald-400 bg-emerald-50 flex items-center justify-center shadow-inner">
                <div className="w-4 h-4 rounded-full bg-[#275D38] animate-pulse" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#275D38]">
                Dock #1 (Alpha)
              </span>
              <span className="text-[9px] text-slate-500 font-sans">Primary Worker</span>
            </div>

            {/* Dock 2: Beta */}
            <div className="flex-1 rounded-xl border-2 border-dashed border-blue-300 bg-white/80 p-2.5 flex flex-col items-center justify-center gap-1 relative shadow-xs">
              <div className="w-9 h-9 rounded-full border border-blue-400 bg-blue-50 flex items-center justify-center shadow-inner">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-900">
                Dock #2 (Beta)
              </span>
              <span className="text-[9px] text-slate-500 font-sans">Secondary Worker</span>
            </div>

            {/* Dock 3: Gamma */}
            <div className="flex-1 rounded-xl border-2 border-dashed border-purple-300 bg-white/80 p-2.5 flex flex-col items-center justify-center gap-1 relative shadow-xs">
              <div className="w-9 h-9 rounded-full border border-purple-400 bg-purple-50 flex items-center justify-center shadow-inner">
                <div className="w-4 h-4 rounded-full bg-purple-600" />
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-900">
                Dock #3 (Gamma)
              </span>
              <span className="text-[9px] text-slate-500 font-sans">Parallel Agent</span>
            </div>
          </div>
        </div>

        {/* RIGHT-HAND CONTAINER: TABLES & RESULTS TRAY */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* EMPTY CONSTRUCTION CANVAS WHEN NO TABLES EXIST */}
          {isCompletelyBlank && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/80 rounded-3xl border-2 border-dashed border-slate-300 min-h-[480px] text-center gap-4 relative overflow-hidden shadow-inner">
              <div className="p-4 rounded-3xl bg-emerald-50 text-[#275D38] border border-emerald-200 shadow-sm animate-pulse">
                <Database className="w-10 h-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-bold text-base text-slate-800 font-sans flex items-center justify-center gap-2">
                  <span>🏗️ Database Construction Stage Ready</span>
                </h3>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  No tables exist in the database yet. Write your <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[#275D38]">CREATE TABLE</code> command and click <strong>Execute SQL</strong> to watch the Wolverine Architect Robot construct the table foundation!
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Wolverine Agent Ready in Staging Dock #1</span>
              </div>
            </div>
          )}

          {/* PARENT ENTITY TABLES (Top Grid) */}
          {parentTables.length > 0 && (
            <div
              className={`grid gap-5 relative z-10 ${
                parentTables.length === 1
                  ? 'grid-cols-1'
                  : 'grid-cols-1 lg:grid-cols-2'
              }`}
            >
              {parentTables.map(([tName, tbl]) => renderTableCard(tName, tbl))}
            </div>
          )}

          {/* CHILD / JUNCTION TABLES (Bottom Row) */}
          {childTables.length > 0 && (
            <div className="flex flex-col gap-5 relative z-10">
              {childTables.map(([tName, tbl]) => renderTableCard(tName, tbl, true))}
            </div>
          )}

          {/* PHYSICAL QUERY RESULTS TRAY AT BOTTOM OF STAGE */}
          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-[#275D38]/50 p-4 flex flex-col gap-2.5 shadow-md relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#275D38]/10 text-[#275D38]">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>Query Results Tray</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#275D38] text-white font-bold">
                      {extractedTrayRows.length} rows populated
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Populates incrementally after every matched and joined row in real time
                  </p>
                </div>
              </div>
            </div>

            {/* Extracted Rows Table */}
            {extractedTrayRows.length === 0 ? (
              <div className="text-center text-slate-500 py-4 text-xs font-mono italic">
                Results Tray Empty — Execute a SQL Query to watch Foreign Key tokens unlock parent records and populate rows step-by-step
              </div>
            ) : (
              <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className={`border-b ${activeSql?.includes('SELECT') ? 'bg-cyan-100/70 text-cyan-950 border-cyan-400' : 'bg-slate-100 text-[#275D38] border-slate-200'}`}>
                      <th className="p-1.5 w-8 text-center text-slate-400">#</th>
                      {Object.keys(extractedTrayRows[0]).map((col) => (
                        <th key={col} className={`p-1.5 px-2.5 font-bold whitespace-nowrap ${activeSql?.includes('SELECT') ? 'bg-cyan-100/90 text-cyan-950 border-b-2 border-cyan-500' : ''}`}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {extractedTrayRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/50 transition animate-fadeIn">
                        <td className="p-1.5 text-center text-[10px] text-slate-400 bg-slate-50">
                          {idx + 1}
                        </td>
                        {Object.keys(extractedTrayRows[0]).map((col) => (
                          <td key={col} className="p-1.5 px-2.5 whitespace-nowrap">
                            <TypingCell text={row[col]} isTyping={idx === extractedTrayRows.length - 1} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC SVG OVERLAY: DIRECT PK (Column Header) ➔ FK (Column Header) DOTTED CONNECTOR LINES */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
        <svg className="w-full h-full overflow-visible">
          <defs>
            <filter id="uvuGlowEffect" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Dotted Curves for All Relational Links */}
          {relationships.map((rel) => {
            const anchor = relationshipAnchors[rel.id];
            if (!anchor?.from || !anchor?.to) return null;

            const isTraversing =
              (keyToken?.active && keyToken.targetTable?.toLowerCase() === rel.targetTable.toLowerCase()) ||
              (joinBeam?.active && joinBeam.toTable?.toLowerCase() === rel.targetTable.toLowerCase());

            return (
              <g key={rel.id}>
                <path
                  d={`M ${anchor.from.x} ${anchor.from.y} C ${anchor.from.x} ${anchor.from.y + 60}, ${anchor.to.x} ${anchor.to.y - 60}, ${anchor.to.x} ${anchor.to.y}`}
                  stroke={rel.cardinality === '1:1' ? '#0284C7' : '#275D38'}
                  strokeWidth={isTraversing ? '4' : '2.5'}
                  strokeDasharray="6 4"
                  fill="none"
                  filter="url(#uvuGlowEffect)"
                  className={isTraversing ? 'animate-pulse' : 'opacity-85'}
                />
                <circle cx={anchor.from.x} cy={anchor.from.y} r="5" fill="#275D38" stroke="#ffffff" strokeWidth="2" />
                <circle cx={anchor.to.x} cy={anchor.to.y} r="5" fill="#275D38" stroke="#ffffff" strokeWidth="2" />
              </g>
            );
          })}

          {/* Animated Laser Beam on Live Join Traversal */}
          {joinBeam?.active && (
            <g className="animate-laser-beam">
              <line
                x1={joinBeam.fromTable === 'Sessions' ? '50%' : '35%'}
                y1="60%"
                x2={joinBeam.toTable === 'Students' ? '35%' : '75%'}
                y2="30%"
                stroke="#D4AF37"
                strokeWidth="6"
                strokeLinecap="round"
                filter="url(#uvuGlowEffect)"
              />
            </g>
          )}
        </svg>

        {/* Relationship Cardinality Badges with Rich Tooltips */}
        {relationships.map((rel) => {
          const anchor = relationshipAnchors[rel.id];
          if (!anchor?.from || !anchor?.to) return null;

          const isTraversing =
            (keyToken?.active && keyToken.targetTable?.toLowerCase() === rel.targetTable.toLowerCase()) ||
            (joinBeam?.active && joinBeam.toTable?.toLowerCase() === rel.targetTable.toLowerCase());

          return (
            <div
              key={rel.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30"
              style={{
                left: `${(anchor.from.x + anchor.to.x) / 2}px`,
                top: `${(anchor.from.y + anchor.to.y) / 2}px`,
              }}
            >
              <div className="group relative cursor-help">
                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shadow-lg flex items-center gap-1.5 font-bold transition-all duration-200 hover:scale-110 ${
                    isTraversing
                      ? 'bg-[#275D38] text-white border-emerald-300 ring-4 ring-emerald-300/40 animate-pulse'
                      : 'bg-emerald-50 text-[#275D38] border-emerald-400 hover:bg-[#275D38] hover:text-white'
                  }`}
                >
                  <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 text-[#275D38] font-bold text-[9px] group-hover:bg-white group-hover:text-[#275D38]">
                    {rel.cardinality}
                  </span>
                  <Link className="w-3 h-3" />
                  <span>
                    {rel.sourceCol} ➔ {rel.targetCol}
                  </span>
                </span>

                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col w-80 p-3.5 bg-slate-950/95 text-white rounded-2xl shadow-2xl z-50 text-xs font-sans border border-emerald-500/40 pointer-events-none backdrop-blur animate-fadeIn">
                  <div className="font-bold text-emerald-300 flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>{rel.cardinality} Relational Link</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700">
                      Foreign Key
                    </span>
                  </div>
                  <p className="text-slate-200 mt-2 text-[11px] leading-relaxed">
                    Referential constraint linking child table <strong className="text-emerald-400">{rel.sourceTable}.{rel.sourceCol}</strong> to parent table <strong className="text-emerald-400">{rel.targetTable}.{rel.targetCol}</strong>.
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Parent PK: {rel.targetTable}.{rel.targetCol} (1)</span>
                    <span>➔</span>
                    <span>Child FK: {rel.sourceTable}.{rel.sourceCol} ({rel.cardinality === '1:1' ? '1' : 'M'})</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2D Animated Worker Robots Layer with Dynamic Unclipped Speech Bubbles */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
        {workerRobots.map((robot) => {
          const isBlocked = robot.status === 'LOCKED_BLOCKED';
          const isHoldingCard = !!robot.carryingCard;
          const isHoldingKey = robot.status === 'HOLDING_KEY' || robot.status === 'UNLOCKING_PK';
          const isSnapping = robot.status === 'SNAPPING_ROW';
          const isSuccess = robot.status === 'SUCCESS';

          const isNearLeft = robot.x <= 28;
          const isNearRight = robot.x >= 72;

          const bubbleAlignStyle = isNearLeft
            ? { left: '0%', transform: 'none' }
            : isNearRight
            ? { right: '0%', transform: 'none' }
            : { left: '50%', transform: 'translateX(-50%)' };

          const pointerAlignStyle = isNearLeft
            ? { left: '20px' }
            : isNearRight
            ? { right: '20px' }
            : { left: '50%', transform: 'translateX(-50%)' };

          return (
            <div
              key={robot.id}
              className="absolute transition-all duration-700 ease-out flex flex-col items-center pointer-events-auto"
              style={{ left: `${robot.x}%`, top: `${robot.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {/* UNCLIPPED DYNAMIC SPEECH BUBBLE ANCHORED OVER ROBOT */}
              {robot.speech && (
                <div
                  className="relative mb-2 w-max max-w-[320px] sm:max-w-[360px] z-40 animate-bounce-subtle"
                  style={bubbleAlignStyle}
                >
                  <div className="bg-slate-900 border-2 border-[#275D38] text-white p-2.5 px-3.5 rounded-2xl shadow-2xl flex items-start gap-2 text-xs font-sans font-semibold leading-snug backdrop-blur break-words">
                    {isBlocked && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin" />}
                    {isHoldingKey && <Key className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5 animate-bounce" />}
                    {isSnapping && <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {!isBlocked && !isHoldingKey && !isSnapping && !isSuccess && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    )}
                    <span className="text-slate-100">{robot.speech}</span>
                  </div>
                  <div
                    className="w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-[#275D38] rotate-45 absolute -bottom-1.5"
                    style={pointerAlignStyle}
                  />
                </div>
              )}

              {/* TANGIBLE FOREIGN KEY TOKEN IN HANDS */}
              {isHoldingKey && robot.carryingKeyToken && (
                <div className="mb-2 p-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border-2 border-yellow-200 text-slate-950 shadow-2xl flex items-center gap-2 text-xs font-mono font-extrabold animate-bounce">
                  <Key className="w-4 h-4 text-slate-950 fill-current" />
                  <span>
                    🔑 FK Key: {robot.carryingKeyToken.keyName} = #{robot.carryingKeyToken.keyValue}
                  </span>
                </div>
              )}

              {/* TANGIBLE DATA PAYLOAD CARD IN HANDS */}
              {isHoldingCard && robot.carryingCard && (
                <div className="mb-2 p-2 px-3 rounded-xl bg-white border-2 border-[#275D38] text-[#275D38] shadow-2xl flex items-center gap-2 text-xs font-mono font-bold animate-bounce">
                  <FileText className="w-4 h-4 text-[#275D38]" />
                  <span>{robot.carryingCard.title}</span>
                </div>
              )}

              {/* PHYSICAL ROBOT AVATAR */}
              <div
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border-2 transition-all duration-300 ${
                  isBlocked
                    ? 'border-amber-500 ring-4 ring-amber-400/50 animate-shake'
                    : isHoldingKey
                    ? 'border-yellow-400 ring-4 ring-yellow-300/60 shadow-yellow-500/50'
                    : isSuccess
                    ? 'border-emerald-400 ring-4 ring-emerald-300/50'
                    : 'border-white'
                }`}
                style={{
                  backgroundColor: robot.accentHex || '#275D38',
                }}
              >
                <Cpu className="w-6 h-6 text-white" />
                {isBlocked && (
                  <div className="absolute -top-1 -right-1 p-1 bg-amber-500 text-white rounded-full shadow">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
                {isHoldingKey && (
                  <div className="absolute -top-1 -right-1 p-1 bg-yellow-400 text-slate-950 rounded-full shadow animate-pulse">
                    <Key className="w-3 h-3 fill-current" />
                  </div>
                )}
              </div>

              {/* Robot Name & TxID Badge */}
              <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[10px] font-mono font-semibold shadow flex items-center gap-1">
                <span>{robot.name}</span>
                {robot.txId && <span className="text-emerald-400 font-normal">({robot.txId})</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
