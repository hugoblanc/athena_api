import { Injectable, HttpService, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class ExternalService {
  constructor(private httpService: HttpService, private logger: Logger) {

  }

  get(url): Observable<any> {
    this.logger.log('GET  : ' + url);
    return this.httpService.get(url)
      .pipe(map((data) => data.data));
  }

  post(url: string, body: any, config?: AxiosRequestConfig): Observable<any> {
    this.logger.log('POST  : ' + url);
    this.logger.log('Body: ' + JSON.stringify(body));
    return this.httpService.post(url, body, config)
      .pipe(map((data) => data.data));
  }
}
