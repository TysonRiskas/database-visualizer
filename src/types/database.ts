export type DataType = 'INTEGER' | 'TEXT' | 'DATE' | 'VARCHAR';
export type RelationshipCardinality = '1:1' | '1:M' | 'M:M';

export interface ColumnDefinition {
  name: string;
  type: DataType;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyTarget?: {
    table: string;
    column: string;
  };
  foreignKeyCardinality?: RelationshipCardinality;
  nullable?: boolean;
  defaultValue?: any;
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string;
}

export type RowData = Record<string, any>;

export interface TableState {
  schema: TableSchema;
  rows: RowData[];
}

export type DatabaseState = Record<string, TableState>;

export type LockMode = 'NONE' | 'SHARED' | 'EXCLUSIVE';

export interface LockEntry {
  id: string;
  resourceId: string;
  table: string;
  rowId?: string | number;
  mode: LockMode;
  holderTxId: string;
  holderThreadName: string;
  holderColor: string;
  acquiredAt: number;
}

export interface LockWaitQueueEntry {
  id: string;
  resourceId: string;
  table: string;
  rowId?: string | number;
  mode: LockMode;
  requestorTxId: string;
  requestorThreadName: string;
  requestorColor: string;
  requestedAt: number;
  blockedByTxId: string;
}

export interface WalRecord {
  lsn: number;
  txId: string;
  threadName: string;
  threadColor: string;
  operation: 'BEGIN' | 'INSERT' | 'UPDATE' | 'DELETE' | 'COMMIT' | 'ABORT' | 'LOCK_ACQUIRE' | 'LOCK_RELEASE';
  table?: string;
  rowId?: string | number;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  timestamp: string;
  rawSql?: string;
}

export type StepType =
  | 'STEP_INIT'
  | 'STEP_PICKUP_PAYLOAD'
  | 'STEP_PARSE_SQL'
  | 'STEP_WAL_APPEND'
  | 'STEP_MOVE_TO_RESOURCE'
  | 'STEP_PLACE_PADLOCK'
  | 'STEP_LOCK_BLOCKED'
  | 'STEP_LOCK_BLOCKED_BARRIER'
  | 'STEP_ENTER_WAIT_QUEUE'
  | 'STEP_DISPATCH_FROM_QUEUE'
  | 'STEP_GHOST_SLOT_CREATED'
  | 'STEP_SNAP_PAYLOAD'
  | 'STEP_ROW_INSERT'
  | 'STEP_SCAN_ROW'
  | 'STEP_EVAL_PREDICATE'
  | 'STEP_GRAB_KEY_TOKEN'
  | 'STEP_UNLOCK_PK_ROW'
  | 'STEP_JOIN_BEAM'
  | 'STEP_JOIN_MATCH'
  | 'STEP_EXTRACT_TO_TRAY'
  | 'STEP_CREATE_TABLE_FRAME'
  | 'STEP_STAMP_COLUMNS'
  | 'STEP_WIRE_RELATIONSHIP_FK'
  | 'STEP_CONSTRUCT_COMPLETE'
  | 'STEP_COMMIT'
  | 'STEP_RELEASE_PADLOCK'
  | 'STEP_RELEASE_LOCK'
  | 'STEP_EMIT_RESULTS'
  | 'STEP_ABORT_ROLLBACK'
  | 'STEP_ROLLBACK_COMPLETE'
  | 'STEP_CONSTRAINT_VIOLATION'
  | 'STEP_COMPLETE';

export interface WorkerRobotState {
  id: string;
  name: string;
  color: 'blue' | 'amber' | 'purple' | 'cyan' | 'rose' | 'emerald' | string;
  accentHex: string;
  txId: string;
  status: 'IDLE' | 'PARSING' | 'WALKING' | 'HOLDING_CARD' | 'HOLDING_KEY' | 'SCANNING' | 'LOCKED_BLOCKED' | 'SNAPPING_ROW' | 'UNLOCKING_PK' | 'WRITING' | 'COMMITTING' | 'SUCCESS' | 'MOVING' | 'INSERTING' | 'WRITING_WAL';
  x: number;
  y: number;
  targetTable?: string;
  targetRowIndex?: number;
  speech?: string;
  thought?: string;
  carryingPayload?: string;
  carryingCard?: {
    title: string;
    details: Record<string, any>;
  };
  carryingKeyToken?: {
    keyName: string;
    keyValue: any;
    sourceTable: string;
    targetTable: string;
  };
  inQueueLane?: {
    queuePosition: number;
    waitingOnResource: string;
    timerSec?: number;
  };
  waitTimerSeconds?: number;
}

export interface GhostSlotInfo {
  table: string;
  rowId: any;
  rowData: Record<string, any>;
  isSnapped: boolean;
}

export interface PadlockInfo {
  table: string;
  rowId?: any;
  isLocked: boolean;
  holderName: string;
  holderColor: string;
  mode: LockMode;
}

export interface KeyTokenInfo {
  active: boolean;
  keyName: string;
  keyValue: any;
  sourceTable: string;
  targetTable: string;
  targetPkColumn: string;
  targetPkValue: any;
  isUnlocking: boolean;
}

export interface JoinBeamInfo {
  active: boolean;
  fromTable: string;
  fromCol: string;
  fromVal: any;
  toTable: string;
  toCol: string;
  toVal: any;
}

export interface BarrierInfo {
  active: boolean;
  x: number;
  y: number;
  text: string;
  timerSec?: number;
}

export interface WaitQueueLaneRobot {
  id: string;
  name: string;
  color: string;
  txId: string;
  waitingOnResource: string;
  timerSec?: number;
  queuePosition: number;
}

export interface SimulationStep {
  stepIndex: number;
  totalSteps?: number;
  type: StepType;
  txId: string;
  threadId: string;
  threadName: string;
  threadColor: 'blue' | 'amber' | 'purple' | 'cyan' | 'rose' | 'emerald' | string;
  title: string;
  actionSummary?: string;
  pedagogicalDetail: string;
  timestamp: string;
  targetTable?: string;
  targetRowId?: string | number;
  targetRowIndex?: number;
  activeSqlString?: string;
  sqlClauseHighlight?: 'SELECT' | 'FROM' | 'JOIN' | 'WHERE' | 'INSERT' | 'VALUES' | 'COMMIT' | 'ROLLBACK' | string;
  ghostSlot?: GhostSlotInfo;
  padlock?: PadlockInfo;
  barrier?: BarrierInfo;
  keyToken?: KeyTokenInfo;
  joinBeam?: JoinBeamInfo;
  waitQueueLaneRobots?: WaitQueueLaneRobot[];
  extractedTrayRows?: RowData[];
  walEntry?: WalRecord;
  joinEvaluation?: {
    fkTable: string;
    fkColumn: string;
    fkValue: any;
    pkTable: string;
    pkColumn: string;
    matchedRow?: Record<string, any>;
  };
  lockInfo?: {
    mode: LockMode;
    resource: string;
    action: 'ACQUIRE_REQUEST' | 'GRANTED' | 'BLOCKED' | 'RELEASED';
    conflictingTxId?: string;
  };
  predicateEvaluation?: {
    expression: string;
    actualValues: Record<string, any>;
    passed: boolean;
    reason: string;
  };
  evaluatedRowStatuses?: {
    table?: string;
    rowIndex?: number;
    rowId?: any;
    status: 'MATCH' | 'FILTERED';
  }[];
  projectedColumns?: string[];
  tableStateSnapshot?: DatabaseState;
  activeLocksSnapshot?: LockEntry[];
  waitingLocksSnapshot?: LockWaitQueueEntry[];
  workerStatesSnapshot?: WorkerRobotState[];
  queryResultSnapshot?: QueryResult;
}

export interface QueryResult {
  columns: string[];
  rows: RowData[];
  executionTimeMs: number;
  rowsScanned: number;
  rowsMatched: number;
  queryPlanSteps?: string[];
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT';
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
}

export interface SqlAst {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE_TABLE' | 'BATCH_DDL' | 'UNKNOWN';
  rawQuery: string;
  table: string;
  columns: string[];
  whereClause?: {
    column: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE';
    value: any;
    andWhere?: {
      column: string;
      operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE';
      value: any;
    };
  };
  joinClause?: JoinClause;
  joinClauses?: JoinClause[];
  insertValues?: Record<string, any>;
  updateValues?: Record<string, any>;
  createTable?: {
    tableName: string;
    columns: ColumnDefinition[];
    primaryKey: string;
    foreignKeys?: {
      column: string;
      targetTable: string;
      targetColumn: string;
      cardinality: RelationshipCardinality;
    }[];
    seedRows?: RowData[];
    cardinality?: RelationshipCardinality;
  };
  ddlStatements?: {
    tableName: string;
    columns: ColumnDefinition[];
    primaryKey: string;
    foreignKeys?: {
      column: string;
      targetTable: string;
      targetColumn: string;
      cardinality: RelationshipCardinality;
    }[];
    seedRows?: RowData[];
  }[];
}
