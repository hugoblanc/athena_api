import { Injectable } from '@nestjs/common';
import { ExternalService } from '../providers/external-service';
import { Issue } from './issue';

@Injectable()
export class GithubService {

  private static BASE_URL = 'https://api.github.com/repos/hugoblanc/Athena/';
  private static ATHENA = 'hugoblanc/Athena/';
  private static ISSUE = 'issues';

  constructor(private http: ExternalService) { }

  postIssue(issue: Issue) {
    const config = {
      headers: { Authorization: 'Token ' + process.env.ATHENA_GITHUB_TOKEN},
    };

    // Rajouter le token
    return this.http.post(GithubService.BASE_URL + GithubService.ATHENA + GithubService.ISSUE, issue, config);
  }

}
