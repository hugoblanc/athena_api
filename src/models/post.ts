import { Content } from './content';
import { Embedded } from './embedded';

export class Post {
  public author: number;
  public categories: number[];
  public commentStatus: string;
  public content: Content;
  public date: Date;
  public dateGmt: Date;
  public excerpt: Content;
  public featuredMedia: 25103;
  public format: string;
  public guid: Content;
  public id: number;
  public link: string;
  public meta: any[];
  public modified: Date;
  public modifiedGmt: Date;
  public pingStatus: string;
  public slug: string;
  public status: string;
  public sticky: boolean;
  public tags: number[];
  public template: string;
  public title: Content;
  public type: string;
  public embedded: Embedded;

  constructor(input: any) {
    Object.assign(this, input);
    this.content = new Content(input.content);
    this.date = new Date(input.date);
    this.commentStatus = input.comment_status;
    this.dateGmt = new Date(input.date_gmt);
    this.excerpt = new Content(input.excerpt);
    this.guid = new Content(input.guid);
    this.featuredMedia = input.featured_media;
    this.modified = new Date(input.modified);
    this.modifiedGmt = new Date(input.modified_gmt);
    this.pingStatus = input.ping_status;
    this.title = new Content(input.title);
    this.embedded = new Embedded(input._embedded);
  }

  public isIdEqual(id: number) {
    return (this.id === id);
  }
}
