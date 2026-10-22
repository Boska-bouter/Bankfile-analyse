// Een D1-database voor tests, op het ingebouwde SQLite van Node (zelfde SQL-dialect als Cloudflare D1).
import { createRequire } from "node:module";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");

export function nepD1() {
  const db = new DatabaseSync(":memory:");
  const prepare = (sql) => {
    let args = [];
    const st = {
      bind: (...a) => { args = a; return st; },
      run: async () => { db.prepare(sql).run(...args); return { success: true }; },
      first: async () => db.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: db.prepare(sql).all(...args) }),
    };
    return st;
  };
  return { prepare, _db: db };
}
