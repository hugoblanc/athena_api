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
   * Retire d'éventuelles balises HTML d'un texte (titres WordPress qui
   * contiennent parfois <em>/<i>…). Préserve les espaces (dont l'insécable
   * U+00A0 issu de &nbsp;), n'altère que les balises.
   */
  static stripTags(text: string): string {
    if (!text) {
      return '';
    }
    return text.replace(/<\/?[a-z][^>]*>/gi, '').trim();
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
