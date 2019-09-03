import { Injectable, Logger } from '@nestjs/common';
import { ExternalService } from '../providers/external-service';
import { Issue } from './issue';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private static BASE_URL = 'https://api.github.com/repos/';
  private static ATHENA = 'hugoblanc/Athena/';
  private static ISSUE = 'issues';

  constructor(private http: ExternalService) { }

  postIssue(issue: Issue) {

    if (issue == null || issue.title == null) {
      this.logger.error('Le titre ne peut pas être vide');
      throw new Error('Le titre ne peut pas être vide');
    }

    if (issue == null || issue.body == null) {
      this.logger.error('La description ne peut pas être vide');
      throw new Error('La description ne peut pas être vide');
    }

    const config = {
      headers: { Authorization: 'Token ' + process.env.ATHENA_GITHUB_TOKEN },
    };

    // Rajouter le token
    return this.http.post(GithubService.BASE_URL + GithubService.ATHENA + GithubService.ISSUE, issue, config);
  }

}
