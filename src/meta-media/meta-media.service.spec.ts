import { Test, TestingModule } from '@nestjs/testing';
import { MetaMediaService } from './meta-media.service';

describe('MetaMediaService', () => {
  let service: MetaMediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetaMediaService],
    }).compile();

    service = module.get<MetaMediaService>(MetaMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
