import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class TextFormatter {
  abstract htmlToText(html: string): string;
}
