import { Test, TestingModule } from '@nestjs/testing';
import { ExternalService } from './external-service';

describe('ExternalService', () => {
  let provider: ExternalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalService],
    }).compile();

    provider = module.get<ExternalService>(ExternalService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
