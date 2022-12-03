import { Module } from '@nestjs/common';
import { SpeechAzureService } from './speech-azure.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SpeechAzureService],
  exports: [SpeechAzureService],
})
export class SpeechModule { }
