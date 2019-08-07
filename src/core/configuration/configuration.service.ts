import { Injectable } from '@nestjs/common';
import { IConfigurationService } from './iconfiguration-service';
import { PubsubhubService } from './pubsubhub/pubsubhub.service';

@Injectable()
export class ConfigurationService implements IConfigurationService {

  constructor(private pubsubhubService: PubsubhubService) {

  }

  init() {
    this.pubsubhubService.init();
  }
}
