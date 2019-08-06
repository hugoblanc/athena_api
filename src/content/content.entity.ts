import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { MetaMedia } from '../meta-media/meta-media.entity';

@Entity()
export class Content {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 200})
  image: string;

  @Column({type: 'timestamp'})
  date: Date;

  @ManyToOne(type => MetaMedia, metaMedia => metaMedia.contents)
  metaMedia: MetaMedia;
}
