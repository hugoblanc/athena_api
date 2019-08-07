import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MetaMedia } from '../meta-media/meta-media.entity';
import { Image } from './image.entity';

@Entity()
export class Content {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  contentId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({type: 'timestamp'})
  date: Date;

  @ManyToOne(type => MetaMedia, metaMedia => metaMedia.contents, {eager: true})
  metaMedia: MetaMedia;

  @OneToOne(type => Image, {cascade: true, nullable: true, eager: true})
  @JoinColumn()
  image: Image;

}
