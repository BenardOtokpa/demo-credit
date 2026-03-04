import knex from "knex";
import type { Knex } from "knex";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV || "development";

const getConnection = (): Knex.Config["connection"] => {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: Number(url.port),
      user: url.username,
      password: url.password,
      database: url.pathname.replace("/", ""),
    };
  }
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database:
      env === "test"
        ? process.env.DB_NAME_TEST || "demo_credit_test"
        : process.env.DB_NAME || "demo_credit_dev",
  };
};

const db: Knex = knex({
  client: "mysql2",
  connection: getConnection(),
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: "knex_migrations",
    directory: path.join(__dirname, "../migrations"),
    extension: "js",
    loadExtensions: [".js"],
  },
});

export default db;