import { Module } from '@nestjs/common';
import { PubsubhubService } from './pubsubhub/pubsubhub.service';
import { HelperModule } from '../../helper/helper.module';
import { ContentModule } from '../../content/content.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HelperModule, ContentModule, ConfigModule.forRoot()],
  providers: [PubsubhubService],
})
export class ConfigurationModule { }
