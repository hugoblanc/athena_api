export interface IYoutubeFeed {
  feed: Feed;
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
