import { Controller, Post, Body } from '@nestjs/common';
import { GithubService } from './github.service';
import { Issue } from './issue';
import { Observable } from 'rxjs';

@Controller('github')
export class GithubController {

  constructor(private githubService: GithubService) {

  }

  @Post('issues')
  postIssue(@Body()issue: Issue): Observable<Issue> {
    return this.githubService.postIssue(issue);
  }
}
