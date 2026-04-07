import { Pool } from 'pg';

export interface ExecuteResult {
  rows: any[];
  rowsAffected: number;
}

export interface ExecuteParams {
  sql: string;
  args: any[];
}

export class PgWrapper {
  constructor(private pool: Pool) {}

  async execute(params: ExecuteParams | string): Promise<ExecuteResult> {
    if (typeof params === 'string') {
      const result = await this.pool.query(params);
      return {
        rows: result.rows,
        rowsAffected: result.rowCount || 0,
      };
    }

    const pgQuery = this.convertToPostgresQuery(params.sql, params.args);
    const result = await this.pool.query(pgQuery.text, pgQuery.values);
    
    return {
      rows: result.rows,
      rowsAffected: result.rowCount || 0,
    };
  }

  private convertToPostgresQuery(sql: string, args: any[]): { text: string; values: any[] } {
    let index = 1;
    const text = sql.replace(/\?/g, () => `$${index++}`);
    
    return {
      text,
      values: args,
    };
  }

  async close() {
    await this.pool.end();
  }
}
