import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post-service';

describe('PostService', () => {
  let provider: PostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostService],
    }).compile();

    provider = module.get<PostService>(PostService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
