import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { GithubService } from './github.service';
import { Issue } from './issue';
import { Observable } from 'rxjs';

@Controller('github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);
  constructor(private githubService: GithubService) { }

  @Post('issues')
  postIssue(@Body() issue: Issue): Observable<Issue> {
    this.logger.log('Post Issue');
    return this.githubService.postIssue(issue);
  }

  @Get('issues')
  getIssue(@Body() issue: Issue): Observable<Issue> {
    this.logger.log('Post Issue');
    return this.githubService.postIssue(issue);
  }
}
