import { LockEntry, LockMode, LockWaitQueueEntry } from '../types/database';

export class LockManager {
  private activeLocks: LockEntry[] = [];
  private waitQueue: LockWaitQueueEntry[] = [];

  public static getResourceId(table: string, rowId?: string | number): string {
    return rowId !== undefined ? `${table}:${rowId}` : `${table}:__table__`;
  }

  public getActiveLocks(): LockEntry[] {
    return [...this.activeLocks];
  }

  public getWaitQueue(): LockWaitQueueEntry[] {
    return [...this.waitQueue];
  }

  public clear(): void {
    this.activeLocks = [];
    this.waitQueue = [];
  }

  /**
   * Request a lock adhering to Strict 2-Phase Locking (2PL) rules.
   */
  public requestLock(params: {
    txId: string;
    threadName: string;
    threadColor: string;
    table: string;
    rowId?: string | number;
    mode: LockMode;
  }): {
    granted: boolean;
    lock?: LockEntry;
    waitEntry?: LockWaitQueueEntry;
    reason: string;
  } {
    const { txId, threadName, threadColor, table, rowId, mode } = params;
    const resourceId = LockManager.getResourceId(table, rowId);

    // Also check if entire table has an exclusive lock
    const tableResourceId = LockManager.getResourceId(table);
    const tableLock = this.activeLocks.find((l) => l.resourceId === tableResourceId && l.holderTxId !== txId);

    if (tableLock && tableLock.mode === 'EXCLUSIVE') {
      const waitEntry: LockWaitQueueEntry = {
        id: `wait_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        resourceId,
        table,
        rowId,
        mode,
        requestorTxId: txId,
        requestorThreadName: threadName,
        requestorColor: threadColor,
        requestedAt: Date.now(),
        blockedByTxId: tableLock.holderTxId,
      };
      this.waitQueue.push(waitEntry);
      return {
        granted: false,
        waitEntry,
        reason: `Blocked: Table '${table}' is exclusively locked by ${tableLock.holderThreadName} (Tx: ${tableLock.holderTxId})`,
      };
    }

    // Check locks on this specific resource
    const existingOnResource = this.activeLocks.filter((l) => l.resourceId === resourceId);

    // If transaction already holds the exact or stronger lock
    const existingHeldBySelf = existingOnResource.find((l) => l.holderTxId === txId);
    if (existingHeldBySelf) {
      if (existingHeldBySelf.mode === mode || existingHeldBySelf.mode === 'EXCLUSIVE') {
        return {
          granted: true,
          lock: existingHeldBySelf,
          reason: `Lock already held (${existingHeldBySelf.mode}) by this transaction.`,
        };
      }
      // Upgrade from Shared to Exclusive
      if (existingHeldBySelf.mode === 'SHARED' && mode === 'EXCLUSIVE') {
        // Can upgrade only if no other transaction holds a shared lock
        const otherHolders = existingOnResource.filter((l) => l.holderTxId !== txId);
        if (otherHolders.length === 0) {
          existingHeldBySelf.mode = 'EXCLUSIVE';
          return {
            granted: true,
            lock: existingHeldBySelf,
            reason: `Lock upgraded from SHARED to EXCLUSIVE on ${resourceId}`,
          };
        } else {
          // Blocked waiting for other shared locks to release
          const waitEntry: LockWaitQueueEntry = {
            id: `wait_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            resourceId,
            table,
            rowId,
            mode,
            requestorTxId: txId,
            requestorThreadName: threadName,
            requestorColor: threadColor,
            requestedAt: Date.now(),
            blockedByTxId: otherHolders[0].holderTxId,
          };
          this.waitQueue.push(waitEntry);
          return {
            granted: false,
            waitEntry,
            reason: `Lock upgrade blocked: ${otherHolders.length} other transaction(s) holding SHARED lock.`,
          };
        }
      }
    }

    // Checking lock conflicts with other transactions
    if (mode === 'SHARED') {
      const exclusiveLock = existingOnResource.find((l) => l.mode === 'EXCLUSIVE' && l.holderTxId !== txId);
      if (exclusiveLock) {
        const waitEntry: LockWaitQueueEntry = {
          id: `wait_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          resourceId,
          table,
          rowId,
          mode,
          requestorTxId: txId,
          requestorThreadName: threadName,
          requestorColor: threadColor,
          requestedAt: Date.now(),
          blockedByTxId: exclusiveLock.holderTxId,
        };
        this.waitQueue.push(waitEntry);
        return {
          granted: false,
          waitEntry,
          reason: `Conflict: Resource ${resourceId} is exclusively locked by ${exclusiveLock.holderThreadName}`,
        };
      } else {
        // Shared lock can be granted (compatible with existing shared locks)
        const lock: LockEntry = {
          id: `lock_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          resourceId,
          table,
          rowId,
          mode: 'SHARED',
          holderTxId: txId,
          holderThreadName: threadName,
          holderColor: threadColor,
          acquiredAt: Date.now(),
        };
        this.activeLocks.push(lock);
        return {
          granted: true,
          lock,
          reason: `SHARED (Read) lock granted on ${resourceId}`,
        };
      }
    } else {
      // mode === 'EXCLUSIVE'
      const anyConflict = existingOnResource.find((l) => l.holderTxId !== txId);
      if (anyConflict) {
        const waitEntry: LockWaitQueueEntry = {
          id: `wait_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          resourceId,
          table,
          rowId,
          mode,
          requestorTxId: txId,
          requestorThreadName: threadName,
          requestorColor: threadColor,
          requestedAt: Date.now(),
          blockedByTxId: anyConflict.holderTxId,
        };
        this.waitQueue.push(waitEntry);
        return {
          granted: false,
          waitEntry,
          reason: `Conflict: Resource ${resourceId} is locked (${anyConflict.mode}) by ${anyConflict.holderThreadName}`,
        };
      } else {
        const lock: LockEntry = {
          id: `lock_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          resourceId,
          table,
          rowId,
          mode: 'EXCLUSIVE',
          holderTxId: txId,
          holderThreadName: threadName,
          holderColor: threadColor,
          acquiredAt: Date.now(),
        };
        this.activeLocks.push(lock);
        return {
          granted: true,
          lock,
          reason: `EXCLUSIVE (Write) lock acquired on ${resourceId}`,
        };
      }
    }
  }

  /**
   * Strict 2PL: Release all locks held by a transaction at COMMIT or ABORT time.
   * Checks the wait queue and unblocks any transactions that can now acquire their locks.
   */
  public releaseLocksForTx(txId: string): {
    releasedLocks: LockEntry[];
    unblockedWaiters: LockWaitQueueEntry[];
  } {
    const releasedLocks = this.activeLocks.filter((l) => l.holderTxId === txId);
    this.activeLocks = this.activeLocks.filter((l) => l.holderTxId !== txId);

    // Remove any pending wait queue entries for this tx itself
    this.waitQueue = this.waitQueue.filter((w) => w.requestorTxId !== txId);

    const unblockedWaiters: LockWaitQueueEntry[] = [];
    const remainingWaiters: LockWaitQueueEntry[] = [];

    // Check which waiters can now be granted
    for (const waiter of this.waitQueue) {
      const existing = this.activeLocks.filter((l) => l.resourceId === waiter.resourceId);
      let canGrant = false;

      if (waiter.mode === 'SHARED') {
        const hasExclusive = existing.some((l) => l.mode === 'EXCLUSIVE');
        canGrant = !hasExclusive;
      } else {
        // EXCLUSIVE
        canGrant = existing.length === 0;
      }

      if (canGrant) {
        // Grant the lock!
        this.activeLocks.push({
          id: `lock_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          resourceId: waiter.resourceId,
          table: waiter.table,
          rowId: waiter.rowId,
          mode: waiter.mode,
          holderTxId: waiter.requestorTxId,
          holderThreadName: waiter.requestorThreadName,
          holderColor: waiter.requestorColor,
          acquiredAt: Date.now(),
        });
        unblockedWaiters.push(waiter);
      } else {
        remainingWaiters.push(waiter);
      }
    }

    this.waitQueue = remainingWaiters;

    return {
      releasedLocks,
      unblockedWaiters,
    };
  }

  public getLocksForTable(tableName: string): LockEntry[] {
    return this.activeLocks.filter((l) => l.table === tableName);
  }

  public getRowLock(table: string, rowId: string | number): LockEntry | undefined {
    const resourceId = LockManager.getResourceId(table, rowId);
    return this.activeLocks.find((l) => l.resourceId === resourceId);
  }
}
