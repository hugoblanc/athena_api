
export class YoutubeFeed {
  id: string;
  metaMediaId: string;
  feed: Feed;

  constructor(input?: YoutubeFeed) {
   if (input != null) {
     Object.assign(this, input);
     try {
       this.id = this.feed.entry[0]['yt:videoId'][0];
       this.metaMediaId = this.feed.entry[0]['yt:channelId'][0];
     } catch (error) {
      console.error(error);
     }
   }
  }
}

export interface Feed {
  link: Link[];
  title: string[];
  updated: string[];
  entry: Entry[];
}

export interface Entry {
  id: string[];
  'yt:videoId': string[];
  'yt:channelId': string[];
  title: string[];
  link: Link[];
  author: Author[];
  published: string[];
  updated: string[];
}

export interface Author {
  name: string[];
  uri: string[];
}

export interface Link {
  $: Empty;
}

export interface Empty {
  rel: string;
  href: string;
}
