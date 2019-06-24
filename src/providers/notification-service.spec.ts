import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification-service';

describe('NotificationService', () => {
  let provider: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    provider = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
