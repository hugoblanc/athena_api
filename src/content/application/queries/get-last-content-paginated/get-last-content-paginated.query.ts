import { RequestedPageValueType } from '../../../../core/page-number.value-type';
import { MediaKeysValueType } from './media-keys.value-type';
import { SearchedContentTermValueType } from './searched-content-term.value-type';

export class GetLastContentPaginatedQuery {
  constructor(
    public readonly requestedPage: RequestedPageValueType,
    public readonly terms: SearchedContentTermValueType,
    public readonly mediaKeys: MediaKeysValueType,
  ) {}
}
