import { Test, TestingModule } from '@nestjs/testing';
import { ListMetaMediaService } from './list-meta-media.service';

describe('ListMetaMediaService', () => {
  let service: ListMetaMediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListMetaMediaService],
    }).compile();

    service = module.get<ListMetaMediaService>(ListMetaMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
