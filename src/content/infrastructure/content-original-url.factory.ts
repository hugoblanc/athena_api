import { Content } from '../domain/content.entity';
import { PostService } from '../../providers/post-service';
import { MetaMediaType } from '../../meta-media/meta-media-type.enum';
import { YoutubeVideoUrl } from '../domain/youtube-video-url.value-type';
import { lastValueFrom } from 'rxjs';
export class ContentOriginalUrlFactory {


  constructor(private readonly content: Content, private readonly postService?: PostService) {

  }


  async getOriginalUrl(): Promise<string> {
    if (this.content.isVideo) {
      const youtubeUrl = new YoutubeVideoUrl(this.content.contentId);
      return Promise.resolve(youtubeUrl.url);
    }

    const post = await lastValueFrom(this.postService.getPostByContent(this.content));
    return post.link;
  }


}
