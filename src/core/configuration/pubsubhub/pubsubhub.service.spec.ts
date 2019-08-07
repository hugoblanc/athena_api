import { Test, TestingModule } from '@nestjs/testing';
import { PubsubhubService } from './pubsubhub.service';

describe('PubsubhubService', () => {
  let service: PubsubhubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PubsubhubService],
    }).compile();

    service = module.get<PubsubhubService>(PubsubhubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
