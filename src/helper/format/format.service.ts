import { Injectable } from '@nestjs/common';
import { AllHtmlEntities } from 'html-entities';
import { bindNodeCallback, Observable } from 'rxjs';
import { parseString } from 'xml2js';

@Injectable()
export class FormatService {
  /**
   * Cette methode se charge de tranformé mes carachètre speciaux encodé d'html en texte lisible
   * @param htmlEncoded la chaine de charactère encodé en html
   */
  static decodeHTML(htmlEncoded: string): string {
    if (!htmlEncoded) {
      return '';
    }

    // AllHtmlEntities décode toutes les entités HTML (&nbsp;, &rsquo;, &#8217;…),
    // pas seulement les 5 entités XML comme XmlEntities.
    const entities = new AllHtmlEntities();
    return entities.decode(htmlEncoded);
  }

  /**
   * Cette methode se charge de transformer les données au format XML en JSON
   * @param xmlString Une chaine de charactère au format xml
   */
  static decodeXML(xmlString: string): Observable<any> {
    const parseXML$ = bindNodeCallback(parseString);
    return parseXML$(xmlString, {});
  }
}
