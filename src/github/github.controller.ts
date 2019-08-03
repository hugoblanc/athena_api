import { Controller, Post } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {

  constructor(private githubService: GithubService) {

  }

  @Post()
  postIssue(issue: any) {
    // TODO: rajouter le token
    this.githubService.postIssue(issue);
  }

}
