import { testDatabaseName, typeormCOnfig } from '../src/core/configuration/typeorm.config';

export = {
  ...typeormCOnfig,
  autoLoadEntities: false,
  dropSchema: true,
  database: testDatabaseName,
  entities: ['src/**/*.entity{.ts,.js}'],
};
