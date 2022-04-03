import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MetaMedia } from '../meta-media/meta-media.entity';
import { Image } from './image.entity';
import { MetaMediaType } from '../meta-media/meta-media-type.enum';

@Entity()
export class Content {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  contentId: string;

  @Column({ length: 200 })
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
    { eager: true, onDelete: 'CASCADE' },
  )
  metaMedia: MetaMedia;

  @OneToOne(type => Image, { cascade: true, nullable: true, eager: true })
  @JoinColumn()
  image: Image;
}
