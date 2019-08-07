import { Injectable } from '@nestjs/common';
import { XmlEntities } from 'html-entities';
import { parseString } from 'xml2js';
import { bindNodeCallback } from 'rxjs';

@Injectable()
export class FormatService {

  constructor() {
  }

  /**
   * Cette methode se charge de tranformé mes carachètre speciaux encodé d'html en texte lisible
   * @param htmlEncoded la chaine de charactère encodé en html
   */
  static decodeHTML(htmlEncoded: string): string {
    if (!htmlEncoded) {
      return '';
    }

    const entities = new XmlEntities();
    // On converties le text  en format text classique plutot que HTML
    let htmlDecoded = entities.decode(htmlEncoded);
    // Pour une raison qui m'échappe l'apostrophe ne fonctionne toujours pas
    htmlDecoded = htmlDecoded.replace('&rsquo;', '\'');

    return htmlDecoded;
  }

  static decodeXML(xmlString: string): any {
    const parseXML$ = bindNodeCallback(parseString);
    console.log('GOOOOOOOOOOOOOOO decode');

    parseXML$(xmlString).subscribe((data: any) => {
      console.log(data);
      console.log(JSON.stringify(data));
    }, (error) => {
      console.error(error);
    });
  }

}
