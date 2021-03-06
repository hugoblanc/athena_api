import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ContentModule } from './content/content.module';
import { HelperModule } from './helper/helper.module';
import { ListMetaMediaModule } from './list-meta-media/list-meta-media.module';
import { MetaMediaModule } from './meta-media/meta-media.module';
import { GithubModule } from './github/github.module';
import { ConfigurationModule } from './core/configuration/configuration.module';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: process.env.ATHENA_DB_HOST,
            port: parseInt(process.env.ATHENA_DB_PORT, 10),
            username: process.env.ATHENA_DB_USER,
            password: process.env.ATHENA_DB_PASSWORD,
            database: 'athena',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            extra: {
              charset: 'utf8mb4_general_ci',
          }
        }),
        ListMetaMediaModule,
        MetaMediaModule,
        ContentModule,
        HelperModule,
        GithubModule,
        ConfigurationModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
