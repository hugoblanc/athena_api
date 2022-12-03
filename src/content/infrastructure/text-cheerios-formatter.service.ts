import { TextFormatter } from '../application/providers/text-formatter.service';
import { load } from 'cheerio';
export class TextCheeriosFormatter extends TextFormatter {

  htmlToText(html: string): string {
    const cheeriosDocument = load(html, null, false);
    return cheeriosDocument.text();
  }
}
