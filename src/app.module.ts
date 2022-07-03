import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ContentModule } from './content/content.module';
import { ConfigurationModule } from './core/configuration/configuration.module';
import { typeormCOnfig } from './core/configuration/typeorm.config';
import { GithubModule } from './github/github.module';
import { HelperModule } from './helper/helper.module';
import { ListMetaMediaModule } from './list-meta-media/list-meta-media.module';
import { MetaMediaModule } from './meta-media/meta-media.module';
import { getConnectionManager } from 'typeorm';
import { Logger } from '@nestjs/common';



@Module({
  imports: [
    TypeOrmModule.forRoot(typeormCOnfig),
    ListMetaMediaModule,
    MetaMediaModule,
    ContentModule,
    HelperModule,
    GithubModule,
    ConfigurationModule,
  ],
  controllers: [AppController],
})
export class AppModule implements OnModuleDestroy {
  logger = new Logger(AppModule.name);

  onModuleDestroy() {
    this.closeDBConnection();
  }

  private closeDBConnection() {
    const conn = getConnectionManager().get();

    if (conn.isConnected) {
      conn
        .close()
        .then(() => {
          this.logger.log('DB conn closed');
        })
        .catch((err: any) => {
          this.logger.error('Error clossing conn to DB, ', err);
        });
    } else {
      this.logger.log('DB conn already closed.');
    }
  }
}
