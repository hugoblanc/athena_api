import { AxiosRequestConfig } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExternalService } from '../providers/external-service';
import { Issue } from './issue';

/** Forme allégée d'une issue renvoyée au front (roadmap). */
export interface IssueSummary {
  id: number;
  title: string;
  body: string;
  claps: number;
  url: string;
  state: string;
  labels: string[];
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private static BASE_URL = 'https://api.github.com/repos/';
  private static REPO = 'hugoblanc/Athena/';

  private static ISSUE = 'issues';
  private static COMMENTS = 'comments';

  private static FULL_ISSUE = GithubService.BASE_URL + GithubService.REPO + GithubService.ISSUE;

  constructor(private http: ExternalService) { }

  /** Liste les issues ouvertes du repo (roadmap). claps = réactions 👍. */
  listIssues(): Observable<IssueSummary[]> {
    const url =
      GithubService.FULL_ISSUE +
      '?state=open&sort=created&direction=desc&per_page=50';
    return this.http.get(url, this.createConfig()).pipe(
      map((issues: any[]) =>
        (issues ?? [])
          .filter((i) => !i.pull_request) // exclut les PR
          .map((i) => ({
            id: i.number,
            title: i.title,
            body: i.body ?? '',
            claps: i.reactions?.['+1'] ?? i.comments ?? 0,
            url: i.html_url,
            state: i.state,
            labels: (i.labels ?? []).map((l: any) => l.name),
          })),
      ),
    );
  }

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
