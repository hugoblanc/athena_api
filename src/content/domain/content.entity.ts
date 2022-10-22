import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { MetaMedia } from '../../meta-media/meta-media.entity';
import { Image } from './image.entity';
import { MetaMediaType } from '../../meta-media/meta-media-type.enum';

@Entity()
export class Content {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  contentId: string;

  @Column({ length: 200 })
  @Index('content-title-idx')
  title: string;

  @Column('enum', { enum: MetaMediaType })
  contentType: MetaMediaType;

  @Column({ type: 'longtext' })
  description: string;

  @Column({ type: 'timestamp' })
  publishedAt: Date;

  @ManyToOne(
    type => MetaMedia,
    metaMedia => metaMedia.contents,
    { onDelete: 'CASCADE' },
  )
  metaMedia: MetaMedia;

  @OneToOne(type => Image, { cascade: true, nullable: true })
  @JoinColumn()
  image: Image;

  get isVideo() {
    return this.contentType && this.contentType === MetaMediaType.YOUTUBE;
  }

  constructor(input?: Partial<Content>) {
    if (input) {
      Object.assign(this, input);
    }
  }
}
