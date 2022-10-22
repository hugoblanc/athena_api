import { TestingModule, Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { PubsubhubService } from '../../core/configuration/pubsubhub/pubsubhub.service';
export async function createModule() {

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PubsubhubService).useValue({})
    .compile();

  return moduleFixture;
}
