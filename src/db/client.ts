import { Pool } from "pg";
import { getEnv } from "@/src/config/env";

let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getEnv().DATABASE_URL
    });
  }

  return pool;
}
