import { Controller, Post } from '@nestjs/common';
import { GithubService } from './github.service';
import { Issue } from './issue';

@Controller('github')
export class GithubController {

  constructor(private githubService: GithubService) {

  }

  @Post('issues')
  postIssue(issue: Issue) {
    this.githubService.postIssue(issue);
  }

}
