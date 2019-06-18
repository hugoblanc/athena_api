import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron-service';

describe('CronService', () => {
  let provider: CronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CronService],
    }).compile();

    provider = module.get<CronService>(CronService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
