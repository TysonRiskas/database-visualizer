import { DatabaseState, RowData, TableSchema } from '../types/database';
import { getFreshDatabaseState } from './initialData';
import { LockManager } from './lockManager';
import { WriteAheadLog } from './wal';

export class DatabaseEngine {
  private state: DatabaseState;
  public lockManager: LockManager;
  public wal: WriteAheadLog;

  constructor() {
    this.state = getFreshDatabaseState();
    this.lockManager = new LockManager();
    this.wal = new WriteAheadLog();
  }

  public reset(): void {
    this.state = getFreshDatabaseState();
    this.lockManager.clear();
    this.wal.clear();
  }

  public getState(): DatabaseState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public setState(newState: DatabaseState): void {
    this.state = JSON.parse(JSON.stringify(newState));
  }

  public getTableNames(): string[] {
    return Object.keys(this.state);
  }

  public getTableSchema(tableName: string): TableSchema | undefined {
    return this.state[tableName]?.schema;
  }

  public getTableRows(tableName: string): RowData[] {
    return this.state[tableName]?.rows || [];
  }

  public getRow(tableName: string, pkValue: any): RowData | undefined {
    const table = this.state[tableName];
    if (!table) return undefined;
    const pkCol = table.schema.primaryKey;
    return table.rows.find((r) => String(r[pkCol]) === String(pkValue));
  }

  public insertRow(tableName: string, row: RowData): { success: boolean; error?: string } {
    const table = this.state[tableName];
    if (!table) return { success: false, error: `Table '${tableName}' does not exist.` };

    const pkCol = table.schema.primaryKey;
    const pkVal = row[pkCol];

    // Check primary key uniqueness
    if (pkVal !== undefined && table.rows.some((r) => String(r[pkCol]) === String(pkVal))) {
      return { success: false, error: `Duplicate primary key violation: ${pkCol}=${pkVal} already exists.` };
    }

    // Check foreign keys
    for (const col of table.schema.columns) {
      if (col.isForeignKey && col.foreignKeyTarget) {
        const val = row[col.name];
        if (val !== undefined && val !== null) {
          const targetTable = this.state[col.foreignKeyTarget.table];
          if (!targetTable) {
            return { success: false, error: `Referenced table '${col.foreignKeyTarget.table}' not found.` };
          }
          const exists = targetTable.rows.some(
            (r) => String(r[col.foreignKeyTarget!.column]) === String(val)
          );
          if (!exists) {
            return {
              success: false,
              error: `Foreign Key Violation: Value ${val} for '${col.name}' does not exist in '${col.foreignKeyTarget.table}.${col.foreignKeyTarget.column}'.`,
            };
          }
        }
      }
    }

    table.rows.push({ ...row });
    return { success: true };
  }

  public updateRow(tableName: string, pkValue: any, updates: RowData): { success: boolean; error?: string } {
    const table = this.state[tableName];
    if (!table) return { success: false, error: `Table '${tableName}' does not exist.` };

    const pkCol = table.schema.primaryKey;
    const rowIndex = table.rows.findIndex((r) => String(r[pkCol]) === String(pkValue));
    if (rowIndex === -1) {
      return { success: false, error: `Row with primary key ${pkValue} not found in '${tableName}'.` };
    }

    table.rows[rowIndex] = {
      ...table.rows[rowIndex],
      ...updates,
    };

    return { success: true };
  }

  public deleteRow(tableName: string, pkValue: any): { success: boolean; error?: string } {
    const table = this.state[tableName];
    if (!table) return { success: false, error: `Table '${tableName}' does not exist.` };

    const pkCol = table.schema.primaryKey;
    const initialLen = table.rows.length;
    table.rows = table.rows.filter((r) => String(r[pkCol]) !== String(pkValue));

    if (table.rows.length === initialLen) {
      return { success: false, error: `Row with ${pkCol}=${pkValue} not found.` };
    }

    return { success: true };
  }
}
