import { WalRecord } from '../types/database';

export class WriteAheadLog {
  private records: WalRecord[] = [];
  private currentLsn = 1000;

  public append(params: {
    txId: string;
    threadName: string;
    threadColor: string;
    operation: WalRecord['operation'];
    table?: string;
    rowId?: string | number;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    rawSql?: string;
  }): WalRecord {
    this.currentLsn += 1;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, '0')}`;

    const record: WalRecord = {
      lsn: this.currentLsn,
      txId: params.txId,
      threadName: params.threadName,
      threadColor: params.threadColor,
      operation: params.operation,
      table: params.table,
      rowId: params.rowId,
      beforeState: params.beforeState,
      afterState: params.afterState,
      timestamp: timeStr,
      rawSql: params.rawSql,
    };

    this.records.push(record);
    return record;
  }

  public getRecords(): WalRecord[] {
    return [...this.records];
  }

  public getRecordsForTx(txId: string): WalRecord[] {
    return this.records.filter((r) => r.txId === txId);
  }

  public getLatestRecords(count = 10): WalRecord[] {
    return this.records.slice(-count);
  }

  public clear(): void {
    this.records = [];
    this.currentLsn = 1000;
  }
}
