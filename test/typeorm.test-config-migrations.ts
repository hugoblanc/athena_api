import { testDatabaseName, typeormCOnfig } from '../src/core/configuration/typeorm.config';

export = {
  ...typeormCOnfig,
  autoLoadEntities: false,
  database: testDatabaseName,
  entities: ['src/**/*.entity{.ts,.js}'],
};
