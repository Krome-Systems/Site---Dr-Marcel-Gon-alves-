import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL não foi configurada. Adicione a conexão MySQL nas variáveis de ambiente da Hostinger antes de usar o banco.",
    );
  }

  pool ??= mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 10,
    enableKeepAlive: true,
  });

  return drizzle(pool, { schema, mode: "default" });
}
