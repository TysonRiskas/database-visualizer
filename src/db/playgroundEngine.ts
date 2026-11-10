import {
  DatabaseState,
  PlaygroundState,
  QueryResult,
  RowData,
  SqlAst,
  ViewDefinition,
  StoredProcedureDefinition,
  JoinClause,
} from '../types/database';
import { SqlParser } from './sqlParser';

export interface PlaygroundExecutionResult {
  state: PlaygroundState;
  results: QueryResult[];
  messages: string[];
  hasErrors: boolean;
  totalDurationMs: number;
}

export class PlaygroundEngine {
  /**
   * Safe column value accessor that resolves case-insensitively across:
   * 1. Exact match ('Sessions.status' or 'status')
   * 2. Unprefixed bare match ('status' from 'Sessions.status')
   * 3. Table-qualified match ('Sessions.status' from 'status')
   */
  public static getColValue(row: RowData, colIdentifier: string): any {
    if (!colIdentifier) return undefined;
    if (row[colIdentifier] !== undefined) return row[colIdentifier];

    const bare = colIdentifier.includes('.') ? colIdentifier.split('.').pop()! : colIdentifier;
    if (row[bare] !== undefined) return row[bare];

    const entry = Object.entries(row).find(([k]) => {
      const kLower = k.toLowerCase();
      const colLower = colIdentifier.toLowerCase();
      const bareLower = bare.toLowerCase();
      const kBare = k.includes('.') ? k.split('.').pop()!.toLowerCase() : kLower;

      return kLower === colLower || kLower === bareLower || kBare === bareLower;
    });

    return entry ? entry[1] : undefined;
  }

  /**
   * Evaluates a SELECT query against database tables and registered views.
   */
  public static executeSelect(
    databaseState: DatabaseState,
    views: Record<string, ViewDefinition>,
    ast: SqlAst
  ): { result?: QueryResult; error?: string } {
    const startTime = performance.now();
    const primaryName = ast.table;

    // Helper to tag rows with table name prefix for multi-table ambiguity resolution
    const tagRowWithTable = (row: RowData, tableName: string): RowData => {
      const tagged: RowData = { ...row };
      for (const [k, v] of Object.entries(row)) {
        if (!k.includes('.')) {
          tagged[`${tableName}.${k}`] = v;
        }
      }
      return tagged;
    };

    // Check if table is a base table or a view
    let baseRows: RowData[] = [];
    let baseColumns: string[] = [];

    const matchedTableKey = Object.keys(databaseState).find(
      (k) => k.toLowerCase() === primaryName.toLowerCase()
    );
    const matchedViewKey = Object.keys(views).find(
      (k) => k.toLowerCase() === primaryName.toLowerCase()
    );

    if (matchedTableKey) {
      const table = databaseState[matchedTableKey];
      baseRows = table.rows.map((r) => tagRowWithTable(r, matchedTableKey));
      baseColumns = table.schema.columns.map((c) => c.name);
    } else if (matchedViewKey) {
      // Dynamically evaluate view query
      const view = views[matchedViewKey];
      const viewParse = SqlParser.parse(view.definitionQuery);
      if (viewParse.error || viewParse.ast.type !== 'SELECT') {
        return { error: `Error evaluating View '${view.name}': ${viewParse.error || 'Invalid query'}` };
      }
      const viewExec = PlaygroundEngine.executeSelect(databaseState, views, viewParse.ast);
      if (viewExec.error || !viewExec.result) {
        return { error: viewExec.error || `Failed to evaluate view '${view.name}'.` };
      }
      baseRows = viewExec.result.rows.map((r) => tagRowWithTable(r, view.name));
      baseColumns = viewExec.result.columns;
    } else {
      return { error: `Relation '${primaryName}' does not exist in tables or views.` };
    }

    let scannedCount = baseRows.length;
    let joinedRows = baseRows;

    // Handle JOIN clauses if any
    const joinClauses: JoinClause[] =
      ast.joinClauses && ast.joinClauses.length > 0
        ? ast.joinClauses
        : ast.joinClause
        ? [ast.joinClause]
        : [];

    for (const join of joinClauses) {
      const targetRelName = join.targetTable;
      let targetRows: RowData[] = [];

      const joinTableKey = Object.keys(databaseState).find(
        (k) => k.toLowerCase() === targetRelName.toLowerCase()
      );
      const joinViewKey = Object.keys(views).find(
        (k) => k.toLowerCase() === targetRelName.toLowerCase()
      );

      if (joinTableKey) {
        targetRows = databaseState[joinTableKey].rows.map((r) => tagRowWithTable(r, joinTableKey));
      } else if (joinViewKey) {
        const view = views[joinViewKey];
        const vp = SqlParser.parse(view.definitionQuery);
        const ve = PlaygroundEngine.executeSelect(databaseState, views, vp.ast);
        if (ve.result) {
          targetRows = ve.result.rows.map((r) => tagRowWithTable(r, view.name));
        }
      } else {
        return { error: `JOIN target '${targetRelName}' does not exist.` };
      }

      scannedCount += targetRows.length;
      const nextJoined: RowData[] = [];

      for (const leftRow of joinedRows) {
        const leftVal = PlaygroundEngine.getColValue(leftRow, join.sourceColumn);

        const matches = targetRows.filter((rightRow) => {
          const rightVal = PlaygroundEngine.getColValue(rightRow, join.targetColumn);
          return String(leftVal) === String(rightVal);
        });

        if (matches.length > 0) {
          matches.forEach((m) => {
            nextJoined.push({ ...leftRow, ...m });
          });
        } else if (join.type === 'LEFT') {
          nextJoined.push({ ...leftRow });
        }
      }

      joinedRows = nextJoined;
    }

    // Evaluate WHERE filtering
    let filteredRows = joinedRows;
    if (ast.whereClause) {
      const wc = ast.whereClause;
      filteredRows = joinedRows.filter((row) => {
        const colVal = PlaygroundEngine.getColValue(row, wc.column);

        const targetVal = wc.value;
        const op = wc.operator;

        let passed = false;
        if (op === '=') passed = String(colVal).toLowerCase() === String(targetVal).toLowerCase();
        else if (op === '!=') passed = String(colVal).toLowerCase() !== String(targetVal).toLowerCase();
        else if (op === '>') passed = Number(colVal) > Number(targetVal);
        else if (op === '<') passed = Number(colVal) < Number(targetVal);
        else if (op === '>=') passed = Number(colVal) >= Number(targetVal);
        else if (op === '<=') passed = Number(colVal) <= Number(targetVal);
        else if (op === 'LIKE') {
          const pattern = String(targetVal).replace(/%/g, '').toLowerCase();
          passed = String(colVal).toLowerCase().includes(pattern);
        }

        if (wc.andWhere) {
          const andOp = wc.andWhere.operator;
          const andVal = wc.andWhere.value;
          const actualAndVal = PlaygroundEngine.getColValue(row, wc.andWhere.column);

          let andPassed = false;
          if (andOp === '=') andPassed = String(actualAndVal).toLowerCase() === String(andVal).toLowerCase();
          else if (andOp === '!=') andPassed = String(actualAndVal).toLowerCase() !== String(andVal).toLowerCase();
          else if (andOp === '>') andPassed = Number(actualAndVal) > Number(andVal);
          else if (andOp === '<') andPassed = Number(actualAndVal) < Number(andVal);
          else if (andOp === '>=') andPassed = Number(actualAndVal) >= Number(andVal);
          else if (andOp === '<=') andPassed = Number(actualAndVal) <= Number(andVal);
          return passed && andPassed;
        }

        return passed;
      });
    }

    // Projection / Column Selection (supports "col AS alias" and "Table.col AS alias")
    const isSelectAll = ast.columns.includes('*') || ast.columns.some((c) => c.trim() === '*');
    let outputColumns: string[] = [];
    let projectedRows: RowData[] = [];

    const parseColumnProjection = (colStr: string): { source: string; alias: string } => {
      const trimmed = colStr.trim();
      const asMatch = trimmed.match(/^([\s\S]+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
      if (asMatch) {
        return { source: asMatch[1].trim(), alias: asMatch[2].trim() };
      }
      const spaceMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s+([a-zA-Z0-9_]+)$/);
      if (spaceMatch) {
        return { source: spaceMatch[1].trim(), alias: spaceMatch[2].trim() };
      }
      const bare = trimmed.includes('.') ? trimmed.split('.').pop()! : trimmed;
      return { source: trimmed, alias: bare.trim() };
    };

    if (isSelectAll) {
      const colSet = new Set<string>();
      filteredRows.forEach((r) => {
        Object.keys(r).forEach((k) => {
          if (!k.includes('.')) colSet.add(k);
        });
      });
      if (colSet.size === 0) baseColumns.forEach((c) => colSet.add(c));
      outputColumns = Array.from(colSet);
      projectedRows = filteredRows.map((row) => {
        const out: RowData = {};
        outputColumns.forEach((col) => {
          out[col] = PlaygroundEngine.getColValue(row, col);
        });
        return out;
      });
    } else {
      const parsedProjections = ast.columns.map(parseColumnProjection);
      outputColumns = parsedProjections.map((p) => p.alias);
      projectedRows = filteredRows.map((row) => {
        const out: RowData = {};
        parsedProjections.forEach((proj) => {
          out[proj.alias] = PlaygroundEngine.getColValue(row, proj.source);
        });
        return out;
      });
    }

    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));

    const result: QueryResult = {
      columns: outputColumns,
      rows: projectedRows,
      executionTimeMs,
      rowsScanned: scannedCount,
      rowsMatched: projectedRows.length,
    };

    return { result };
  }

  /**
   * Executes a multi-statement SQL script against the isolated playground environment.
   */
  public static executeScript(
    initialState: PlaygroundState,
    script: string
  ): PlaygroundExecutionResult {
    const startTime = performance.now();
    const workingState: PlaygroundState = JSON.parse(JSON.stringify(initialState));
    const results: QueryResult[] = [];
    const messages: string[] = [];
    let hasErrors = false;

    const statements = SqlParser.splitScriptStatements(script);

    if (statements.length === 0) {
      messages.push('No executable SQL statements found.');
      return {
        state: workingState,
        results,
        messages,
        hasErrors: false,
        totalDurationMs: 0,
      };
    }

    for (let sIdx = 0; sIdx < statements.length; sIdx++) {
      const stmt = statements[sIdx];
      const parseResult = SqlParser.parse(stmt);
      const ast = parseResult.ast;

      if (parseResult.error || ast.type === 'UNKNOWN') {
        messages.push(`❌ Statement #${sIdx + 1} Error: ${parseResult.error || 'Syntax error'}`);
        messages.push(`   Query: ${stmt}`);
        hasErrors = true;
        continue;
      }

      try {
        // 1. CREATE VIEW
        if (ast.type === 'CREATE_VIEW' && ast.createView) {
          const viewDef = ast.createView;
          const viewName = viewDef.name;

          // Check query syntax
          const testSelect = SqlParser.parse(viewDef.query);
          if (testSelect.error) {
            messages.push(`❌ Error creating View '${viewName}': ${testSelect.error}`);
            hasErrors = true;
            continue;
          }

          // Evaluate columns
          const testExec = PlaygroundEngine.executeSelect(
            workingState.databaseState,
            workingState.views,
            testSelect.ast
          );
          const columns =
            viewDef.columns && viewDef.columns.length > 0
              ? viewDef.columns
              : testExec.result
              ? testExec.result.columns
              : testSelect.ast.columns;

          workingState.views[viewName] = {
            name: viewName,
            definitionQuery: viewDef.query,
            columns,
            createdAt: new Date().toLocaleTimeString(),
          };

          messages.push(`✅ View '${viewName}' created successfully.`);
          messages.push(`   Attributes: [${columns.join(', ')}]`);

          if (testExec.result) {
            results.push(testExec.result);
            messages.push(`📊 Loaded preview of ${testExec.result.rows.length} row(s) from View '${viewName}'. (Query it anytime with: SELECT * FROM ${viewName};)`);
          }
        }

        // 2. DROP VIEW
        else if (ast.type === 'DROP_VIEW' && ast.dropView) {
          const viewName = ast.dropView.name;
          const matched = Object.keys(workingState.views).find(
            (k) => k.toLowerCase() === viewName.toLowerCase()
          );
          if (matched) {
            delete workingState.views[matched];
            messages.push(`✅ View '${viewName}' dropped successfully.`);
          } else if (ast.dropView.ifExists) {
            messages.push(`ℹ️ View '${viewName}' does not exist (skipping DROP).`);
          } else {
            messages.push(`❌ View '${viewName}' does not exist.`);
            hasErrors = true;
          }
        }

        // 3. CREATE PROCEDURE
        else if (ast.type === 'CREATE_PROCEDURE' && ast.createProcedure) {
          const procDef = ast.createProcedure;
          const procName = procDef.name;

          workingState.procedures[procName] = {
            name: procName,
            parameters: procDef.parameters,
            body: procDef.body,
            createdAt: new Date().toLocaleTimeString(),
          };

          const paramSig = procDef.parameters.map((p) => `${p.name} ${p.type}`).join(', ');
          messages.push(`✅ Stored Procedure '${procName}(${paramSig})' created successfully.`);
        }

        // 4. DROP PROCEDURE
        else if (ast.type === 'DROP_PROCEDURE' && ast.dropProcedure) {
          const procName = ast.dropProcedure.name;
          const matched = Object.keys(workingState.procedures).find(
            (k) => k.toLowerCase() === procName.toLowerCase()
          );
          if (matched) {
            delete workingState.procedures[matched];
            messages.push(`✅ Stored Procedure '${procName}' dropped successfully.`);
          } else if (ast.dropProcedure.ifExists) {
            messages.push(`ℹ️ Procedure '${procName}' does not exist (skipping DROP).`);
          } else {
            messages.push(`❌ Stored Procedure '${procName}' does not exist.`);
            hasErrors = true;
          }
        }

        // 5. CALL / EXEC PROCEDURE
        else if (ast.type === 'CALL_PROCEDURE' && ast.callProcedure) {
          const callDef = ast.callProcedure;
          const procName = callDef.name;

          const matchedKey = Object.keys(workingState.procedures).find(
            (k) => k.toLowerCase() === procName.toLowerCase()
          );

          if (!matchedKey) {
            messages.push(`❌ Stored Procedure '${procName}' does not exist in catalog.`);
            hasErrors = true;
            continue;
          }

          const proc = workingState.procedures[matchedKey];
          messages.push(`⚡ Executing Stored Procedure '${proc.name}'...`);

          // Parameter binding
          let boundBody = proc.body;
          proc.parameters.forEach((param, pIdx) => {
            const argVal = callDef.arguments[pIdx];
            const replacement =
              argVal === null || argVal === undefined
                ? 'NULL'
                : typeof argVal === 'number'
                ? String(argVal)
                : `'${String(argVal).replace(/'/g, "''")}'`;

            // Replace @paramName or paramName
            const regex = new RegExp(`[@]?\\b${param.name}\\b`, 'g');
            boundBody = boundBody.replace(regex, replacement);
          });

          // Execute statements inside procedure body
          const bodyResult = PlaygroundEngine.executeScript(workingState, boundBody);
          Object.assign(workingState.databaseState, bodyResult.state.databaseState);
          Object.assign(workingState.views, bodyResult.state.views);
          Object.assign(workingState.procedures, bodyResult.state.procedures);

          results.push(...bodyResult.results);
          messages.push(...bodyResult.messages.map((m) => `   ${m}`));
          messages.push(`✅ Procedure '${proc.name}' execution completed.`);
        }

        // 6. SELECT QUERY
        else if (ast.type === 'SELECT') {
          const selectResult = PlaygroundEngine.executeSelect(
            workingState.databaseState,
            workingState.views,
            ast
          );

          if (selectResult.error || !selectResult.result) {
            messages.push(`❌ Query Error: ${selectResult.error || 'Execution failed.'}`);
            hasErrors = true;
          } else {
            results.push(selectResult.result);
            messages.push(
              `📊 (${selectResult.result.rows.length} row(s) returned in ${selectResult.result.executionTimeMs}ms)`
            );
          }
        }

        // 7. INSERT STATEMENT
        else if (ast.type === 'INSERT') {
          const tableName = Object.keys(workingState.databaseState).find(
            (k) => k.toLowerCase() === ast.table.toLowerCase()
          ) || ast.table;
          const table = workingState.databaseState[tableName];

          if (!table) {
            messages.push(`❌ Table '${ast.table}' does not exist.`);
            hasErrors = true;
            continue;
          }

          const insertVals = ast.insertValues || {};
          const rowPayload: Record<string, any> = {};
          const valEntries = Object.entries(insertVals);

          table.schema.columns.forEach((col, cIdx) => {
            if (insertVals[col.name] !== undefined) {
              rowPayload[col.name] = insertVals[col.name];
            } else if (valEntries[cIdx] !== undefined) {
              rowPayload[col.name] = valEntries[cIdx][1];
            }
          });
          Object.assign(rowPayload, insertVals);

          // Primary key uniqueness check
          const pkName = table.schema.primaryKey;
          const pkVal = rowPayload[pkName];
          if (pkName && pkVal !== undefined) {
            const duplicate = table.rows.some((r) => String(r[pkName]) === String(pkVal));
            if (duplicate) {
              messages.push(
                `❌ Duplicate Primary Key Error: Key (${pkName}=${pkVal}) already exists in '${tableName}'.`
              );
              hasErrors = true;
              continue;
            }
          }

          table.rows.push(rowPayload);
          messages.push(`📥 (1 row inserted into '${tableName}')`);
        }

        // 8. UPDATE STATEMENT
        else if (ast.type === 'UPDATE') {
          const tableName = Object.keys(workingState.databaseState).find(
            (k) => k.toLowerCase() === ast.table.toLowerCase()
          ) || ast.table;
          const table = workingState.databaseState[tableName];

          if (!table) {
            messages.push(`❌ Table '${ast.table}' does not exist.`);
            hasErrors = true;
            continue;
          }

          const updateVals = ast.updateValues || {};
          const whereClause = ast.whereClause;

          let affected = 0;
          table.rows.forEach((row) => {
            let matches = true;
            if (whereClause) {
              const colVal =
                row[whereClause.column] !== undefined
                  ? row[whereClause.column]
                  : Object.entries(row).find(
                      ([k]) => k.toLowerCase() === whereClause.column.toLowerCase()
                    )?.[1];
              if (whereClause.operator === '=') {
                matches = String(colVal).toLowerCase() === String(whereClause.value).toLowerCase();
              } else if (whereClause.operator === '!=') {
                matches = String(colVal).toLowerCase() !== String(whereClause.value).toLowerCase();
              }
            }

            if (matches) {
              Object.entries(updateVals).forEach(([k, v]) => {
                const matchedKey =
                  Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase()) || k;
                row[matchedKey] = v;
              });
              affected++;
            }
          });

          messages.push(`✏️ (${affected} row(s) updated in '${tableName}')`);
        }

        // 9. DELETE STATEMENT
        else if (ast.type === 'DELETE') {
          const tableName = Object.keys(workingState.databaseState).find(
            (k) => k.toLowerCase() === ast.table.toLowerCase()
          ) || ast.table;
          const table = workingState.databaseState[tableName];

          if (!table) {
            messages.push(`❌ Table '${ast.table}' does not exist.`);
            hasErrors = true;
            continue;
          }

          const whereClause = ast.whereClause;
          const initialLen = table.rows.length;

          table.rows = table.rows.filter((row) => {
            if (!whereClause) return false; // Delete all if no where
            const colVal =
              row[whereClause.column] !== undefined
                ? row[whereClause.column]
                : Object.entries(row).find(
                    ([k]) => k.toLowerCase() === whereClause.column.toLowerCase()
                  )?.[1];
            if (whereClause.operator === '=') {
              return String(colVal).toLowerCase() !== String(whereClause.value).toLowerCase();
            } else if (whereClause.operator === '!=') {
              return String(colVal).toLowerCase() === String(whereClause.value).toLowerCase();
            }
            return false;
          });

          const affected = initialLen - table.rows.length;
          messages.push(`🗑️ (${affected} row(s) deleted from '${tableName}')`);
        }

        // 10. CREATE TABLE
        else if (ast.type === 'CREATE_TABLE' && ast.createTable) {
          const tableDef = ast.createTable;
          const tableName = tableDef.tableName;

          workingState.databaseState[tableName] = {
            schema: {
              name: tableName,
              columns: tableDef.columns,
              primaryKey: tableDef.primaryKey,
            },
            rows: tableDef.seedRows ? [...tableDef.seedRows] : [],
          };

          messages.push(`🔨 Table '${tableName}' created successfully with ${tableDef.columns.length} column(s).`);
        }

        // 11. DROP TABLE
        else if (ast.type === 'DROP_TABLE' && ast.dropTable) {
          const tableName = ast.dropTable.name;
          const matched = Object.keys(workingState.databaseState).find(
            (k) => k.toLowerCase() === tableName.toLowerCase()
          );
          if (matched) {
            delete workingState.databaseState[matched];
            messages.push(`🔨 Table '${tableName}' dropped successfully.`);
          } else if (ast.dropTable.ifExists) {
            messages.push(`ℹ️ Table '${tableName}' does not exist (skipping DROP).`);
          } else {
            messages.push(`❌ Table '${tableName}' does not exist.`);
            hasErrors = true;
          }
        }
      } catch (err: any) {
        messages.push(`❌ Runtime Execution Error: ${err.message || String(err)}`);
        hasErrors = true;
      }
    }

    const totalDurationMs = Math.max(1, Math.round(performance.now() - startTime));
    messages.push(`⏱️ Execution finished in ${totalDurationMs}ms.`);

    // Add to history
    const historyItem = {
      id: `q-${Date.now()}`,
      sql: script,
      timestamp: new Date().toLocaleTimeString(),
      durationMs: totalDurationMs,
      success: !hasErrors,
      rowsAffected: results.reduce((acc, r) => acc + r.rows.length, 0),
    };
    workingState.queryHistory.unshift(historyItem);
    if (workingState.queryHistory.length > 30) workingState.queryHistory.pop();

    return {
      state: workingState,
      results,
      messages,
      hasErrors,
      totalDurationMs,
    };
  }
}
