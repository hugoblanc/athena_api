import { MetaMedia } from '../meta-media/meta-media.entity';

export interface INotifiedObject {
  toNotification(metaMedia: MetaMedia): any[];
}
