import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';

const dbConfig: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database:
      env === 'test'
        ? process.env.DB_NAME_TEST || 'demo_credit_test'
        : process.env.DB_NAME || 'demo_credit_dev',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

const db: Knex = knex(dbConfig);

export default db;