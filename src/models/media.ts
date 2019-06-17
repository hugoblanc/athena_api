import { Content } from './content';

export class Media {
  public altText: string;
  public author: number;
  public caption: Content;
  public date: Date;
  public id: number;
  public link: string;
  public mediaDetails: any;
  public mediaType: string;
  public mimeType: string;
  public slug: string;
  public smush: any;
  public sourceUrl: string;
  public title: Content;
  public type: string;
  public links: any;

  constructor(input: any) {
    Object.assign(this, input);
    if (input != null) {
      this.altText = input.alt_text;
      this.caption = new Content(input.caption);
      this.date = new Date(input.date);
      this.mediaDetails = input.media_details;
      this.mediaType = input.media_type;
      this.mimeType = input.mime_type;
      this.sourceUrl = input.source_url;
      this.title = new Content(input.title);
      this.links = input._links;
    }
  }
}
