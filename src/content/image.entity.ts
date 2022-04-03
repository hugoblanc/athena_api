import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Image {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 250 })
  url: string;

  @Column()
  width: number;

  @Column()
  height: number;
}
