import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MetaMedia } from '../meta-media/meta-media.entity';

@Entity()
export class ListMetaMedia {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 45 })
  title: string;

  @OneToMany(type => MetaMedia, metaMedia => metaMedia.listMetaMedia, {
    eager: true,
})
  metaMedias: MetaMedia[];

}
