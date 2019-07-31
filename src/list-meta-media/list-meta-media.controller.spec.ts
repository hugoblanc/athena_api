import { Test, TestingModule } from '@nestjs/testing';
import { ListMetaMediaController } from './list-meta-media.controller';

describe('ListMetaMedia Controller', () => {
  let controller: ListMetaMediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListMetaMediaController],
    }).compile();

    controller = module.get<ListMetaMediaController>(ListMetaMediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
