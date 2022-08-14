import { RequestedPageValueType } from './page-number.value-type';

export class Page<T> {
  public count: number;
  public next: number | undefined;
  public page: number;
  constructor(requestedPage: RequestedPageValueType, public objects: T[], public totalCount: number) {
    this.count = objects.length;
    this.page = requestedPage.page;

    const isThereNextPage = totalCount > requestedPage.nextPageFirstElement;
    if (isThereNextPage) {
      this.next = requestedPage.page + 1;
    }
  }
}
