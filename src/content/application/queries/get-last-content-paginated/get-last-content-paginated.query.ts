import { RequestedPageValueType } from '../../../../core/page-number.value-type';
import { SearchedContentTermValueType } from './searched-content-term.value-type';

export class GetLastContentPaginatedQuery {
  constructor(
    public readonly requestedPage: RequestedPageValueType,
    public terms: SearchedContentTermValueType,
  ) {}
}
