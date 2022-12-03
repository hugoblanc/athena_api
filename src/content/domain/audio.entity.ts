import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Audio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 250 })
  url: string;

  constructor(input?: Partial<Audio>) {
    if (input) {
      Object.assign(this, input);
    }
  }
}
