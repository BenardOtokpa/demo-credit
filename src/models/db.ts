import knex from "knex";
import type { Knex } from "knex";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

const dbConfig: Knex.Config = {
  client: "mysql2",

  connection: isProduction
    ? process.env.DATABASE_URL
    : {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "demo_credit_dev",
      },

  pool: {
    min: 2,
    max: 10,
  },

  migrations: {
    tableName: "knex_migrations",
    directory: path.join(__dirname, "../migrations"),
  },
};

const db: Knex = knex(dbConfig);

export default db;
