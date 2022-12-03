import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Content } from '../../content/domain/content.entity';
import { Chance } from "chance";
import { MetaMediaType } from '../../meta-media/meta-media-type.enum';
import { MetaMedia } from '../../meta-media/meta-media.entity';
export class DbFixture {
  constructor(private app: INestApplication) { }

  async createContent(content: Partial<Content>) {
    const chance = new Chance();
    return this.app.get(DataSource).getRepository(Content).save({
      contentId: chance.string({ alpha: true }),
      title: chance.sentence(),
      publishedAt: chance.date({ year: 2000 }),
      contentType: MetaMediaType.WORDPRESS,
      metaMedia: new MetaMedia({ id: 4 }),
      ...content
    });
  }
}
