import type { Knex } from "knex";
import dotenv from "dotenv";

import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const isProduction = process.env.NODE_ENV === "production";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "demo_credit_dev",
    },
    migrations: {
      directory: isProduction
        ? path.join(__dirname, "../dist/migrations")
        : path.join(__dirname, "../src/migrations"),
      extension: "ts",
    },
    seeds: {
      directory: isProduction
        ? path.join(__dirname, "../dist/seeds")
        : path.join(__dirname, "../src/seeds"),
      extension: "ts",
    },
  },

  test: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "demo_credit_test",
    },
    migrations: {
      directory: path.join(__dirname, "../src/migrations"),
      extension: "ts",
    },
  },
  production: {
    client: "mysql2",
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: isProduction
        ? path.join(__dirname, "../dist/migrations")
        : path.join(__dirname, "../src/migrations"),
      extension: "ts",
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;
