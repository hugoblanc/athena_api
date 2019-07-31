import { Test, TestingModule } from '@nestjs/testing';
import { MetaMediaController } from './meta-media.controller';

describe('MetaMedia Controller', () => {
  let controller: MetaMediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetaMediaController],
    }).compile();

    controller = module.get<MetaMediaController>(MetaMediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
