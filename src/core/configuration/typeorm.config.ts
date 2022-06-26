import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeormCOnfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.ATHENA_DB_HOST,
  port: parseInt(process.env.ATHENA_DB_PORT, 10),
  username: process.env.ATHENA_DB_USER,
  password: process.env.ATHENA_DB_PASSWORD,
  database: process.env.NODE_ENV === 'test' ? 'athena_test' : 'athena',
  extra: {
    charset: 'utf8mb4_general_ci',
  },
  autoLoadEntities: true,
  keepConnectionAlive: true,
  synchronize: true,
}
