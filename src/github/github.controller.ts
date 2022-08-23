import { Controller, Post, Body, Logger, Get, Param } from '@nestjs/common';
import { GithubService } from './github.service';
import { Issue } from './issue';
import { Observable } from 'rxjs';

@Controller()
export class GithubController {
  private static BASE_URL = 'issues';
  private readonly logger = new Logger(GithubController.name);
  constructor(private githubService: GithubService) { }

  /**
   * @deprecated The method should not be used
   */
  @Get('github/'+GithubController.BASE_URL)
  getIssueLegacy(@Body() issue: Issue): Observable<Issue> {
    this.logger.log('Post Issue');
    return this.githubService.postIssue(issue);
  }

  /**
   * @deprecated The method should not be used
   */
  @Post('github/'+GithubController.BASE_URL)
  postIssueLegacy(@Body() issue: Issue): Observable<Issue> {
    this.logger.log('Post Issue');
    return this.githubService.postIssue(issue);
  }

  /**
   * @deprecated The method should not be used
   */
  @Post('github/'+GithubController.BASE_URL + '/:issueId/clap')
  clapIssueLegacy(@Param('issueId') issueId: string): Observable<Issue> {
    this.logger.log('Clap issue' + issueId);
    return this.githubService.clapIssue(issueId);
  }

  @Get(GithubController.BASE_URL)
  getIssue(@Body() issue: Issue): Observable<Issue> {
    this.logger.log('Post Issue');
    return this.githubService.postIssue(issue);
  }

  @Post(GithubController.BASE_URL)
  postIssue(@Body() issue: Issue): Observable<Issue> {
    this.logger.log('Post Issue');
    return this.githubService.postIssue(issue);
  }

  @Post(GithubController.BASE_URL + '/:issueId/clap')
  clapIssue(@Param('issueId') issueId: string): Observable<Issue> {
    this.logger.log('Clap issue' + issueId);
    return this.githubService.clapIssue(issueId);
  }


}
