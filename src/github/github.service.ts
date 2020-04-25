import { AxiosRequestConfig } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { ExternalService } from '../providers/external-service';
import { Issue } from './issue';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private static BASE_URL = 'https://api.github.com/repos/';
  private static REPO = 'hugoblanc/Athena/';

  private static ISSUE = 'issues';
  private static COMMENTS = 'comments';

  private static FULL_ISSUE = GithubService.BASE_URL + GithubService.REPO + GithubService.ISSUE;

  constructor(private http: ExternalService) { }

  postIssue(issue: Issue) {

    if (issue == null || issue.title == null || issue.title.length < 2) {
      this.logger.error('Le titre ne peut pas être vide');
      throw new Error('Le titre ne peut pas être vide');
    }

    if (issue == null || issue.body == null || issue.body.length < 2) {
      this.logger.error('La description ne peut pas être vide');
      throw new Error('La description ne peut pas être vide');
    }

    const authConfig = this.createConfig();

    return this.http.post(GithubService.FULL_ISSUE, issue, authConfig);
  }

  clapIssue(issueId: string) {
    return this.postComment('+1', issueId);
  }

  private postComment(comment: string, issueId: string) {
    const url = GithubService.FULL_ISSUE + `/${issueId}/` + GithubService.COMMENTS;
    const body = {
      body: comment,
    };
    const authConfig = this.createConfig();

    return this.http.post(url, body, authConfig);
  }

  private createConfig(): AxiosRequestConfig {
    const config = {
      headers: { Authorization: 'Token ' + process.env.ATHENA_GITHUB_TOKEN },
    };
    return config;
  }
}
