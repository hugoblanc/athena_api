import { RequestedPageValueType } from '../../../../core/page-number.value-type';

export class GetLastContentPaginatedQuery {
  constructor(public readonly requestedPage: RequestedPageValueType) {
  }
}
