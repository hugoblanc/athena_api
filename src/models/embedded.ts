import { Media } from './media';

export class Embedded {

  public author: any[];
  public featuredmedia: Media[];
  public term: any[];

  constructor(input: any) {
    Object.assign(this, input);
    if (input != null) {
      this.featuredmedia = input['wp:featuredmedia'];
      this.term = input['wp:term'];
    }
  }
}
