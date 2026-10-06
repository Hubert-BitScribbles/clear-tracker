// Stand-in for expo-sqlite so the native database.ts runs unmodified in
// Node, on real SQLite (node:sqlite). Each open gets a fresh in-memory DB.
import { DatabaseSync } from 'node:sqlite';

const plain = <T>(row: unknown) => (row == null ? null : ({ ...(row as object) } as T));

export async function openDatabaseAsync(_name: string) {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: unknown[] = []) {
      return db.prepare(sql).run(...(params as never[]));
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []) {
      return plain<T>(db.prepare(sql).get(...(params as never[])));
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])).map((r) => plain<T>(r)!);
    },
  };
}
export type SQLiteDatabase = Awaited<ReturnType<typeof openDatabaseAsync>>;
