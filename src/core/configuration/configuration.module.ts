import { Module } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { PubsubhubService } from './pubsubhub/pubsubhub.service';
import { HelperModule } from '../../helper/helper.module';

@Module({
  imports: [HelperModule],
  providers: [ConfigurationService, PubsubhubService]
})
export class ConfigurationModule {}