import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { MetaMediaType } from './meta-media-type.enum';
import { ListMetaMedia } from '../list-meta-media/list-meta-media.entity';
import { Content } from '../content/content.entity';

@Entity()
export class MetaMedia {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  key: string;

  @Column({ length: 45 })
  url: string;

  @Column({ length: 45 })
  title: string;

  @Column({ length: 150 })
  logo: string;

  @Column({ nullable: true, length: 100 })
  donation: string;

  @Column('enum', { enum: MetaMediaType })
  type: MetaMediaType;

  @ManyToOne(type => ListMetaMedia, listMetaMedia => listMetaMedia.metaMedias)
  listMetaMedia: ListMetaMedia;

  @OneToMany(type => Content, content => content.metaMedia)
  contents: Content[];

}
