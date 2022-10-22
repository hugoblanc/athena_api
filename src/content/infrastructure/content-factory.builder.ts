import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PostService } from '../../providers/post-service';
import { Content } from '../domain/content.entity';
import { ContentOriginalUrlFactory } from './content-original-url.factory';

@Injectable()
export class ContentFactoryBuilder {
  constructor(private readonly postService: PostService) { }

  createOriginalUrlFactory(content: Content) {
    return new ContentOriginalUrlFactory(content, this.postService);
  }

}
