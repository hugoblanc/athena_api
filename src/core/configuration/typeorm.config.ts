import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
export const testDatabaseName = 'athena_test';
export const databaseName = 'athena';

export const typeormConfig: MysqlConnectionOptions = {
  type: 'mysql',
  host: process.env.ATHENA_DB_HOST,
  port: parseInt(process.env.ATHENA_DB_PORT, 10),
  username: process.env.ATHENA_DB_USER,
  password: process.env.ATHENA_DB_PASSWORD,
  database: process.env.NODE_ENV === 'test' ? testDatabaseName : databaseName,
  extra: {
    charset: 'utf8mb4_general_ci',
  },
  synchronize: true,
}
