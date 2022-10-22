export class YoutubeVideoUrl {
  private youtubeBaseUrl = "https://www.youtube.com/watch?v=";

  get url() {
    return this.youtubeBaseUrl + this.contentId;
  }

  constructor(private readonly contentId: string) {

  }
}
