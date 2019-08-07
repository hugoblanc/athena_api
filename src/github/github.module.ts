import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { HelperModule } from '../helper/helper.module';

@Module({
  imports: [HelperModule],
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule { }
