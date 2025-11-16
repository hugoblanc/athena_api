import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
export const testDatabaseName = 'athena_test';
export const databaseName = 'athena';

export const typeormConfig: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.ATHENA_DB_HOST,
  port: parseInt(process.env.ATHENA_DB_PORT, 10) || 5432,
  username: process.env.ATHENA_DB_USER,
  password: process.env.ATHENA_DB_PASSWORD,
  database: process.env.NODE_ENV === 'test' ? testDatabaseName : databaseName,
  synchronize: true,
  // PostgreSQL utilise UTF-8 par défaut, pas besoin de config charset
}
