import { Media } from './media';

export class Embedded {

  public author: any[];
  public featuredmedia: Media[];
  public term: any[];

  constructor(input: any) {
    if (input != null) {
      Object.assign(this, input);
      this.term = input['wp:term'];
      this.featuredmedia = input['wp:featuredmedia'];
      if (input['wp:featuredmedia']) {
        this.featuredmedia = input['wp:featuredmedia'].map((media) => new Media(media));
      }
    }
  }
}
