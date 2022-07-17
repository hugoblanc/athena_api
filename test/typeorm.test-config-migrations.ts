require('dotenv').config()
import { DataSource } from 'typeorm';
import { typeormConfig } from '../src/core/configuration/typeorm.config';

export const testDatabaseName = 'athena_test';

export const dataSource = new DataSource({
  synchronize: true,
  ...typeormConfig,
  dropSchema: true,
  migrations: ['src/migration/**/*.ts'],
  migrationsTableName: "custom_migration_table",
  database: testDatabaseName,
  entities: ['src/**/*.entity{.ts,.js}'],
});
