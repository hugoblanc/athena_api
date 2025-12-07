export class MediaKeysValueType {
  get isDefined(): boolean {
    return this.keys !== undefined && this.keys !== null && this.keys !== '';
  }

  get values(): string[] {
    if (!this.isDefined) {
      return [];
    }
    return this.keys
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key !== '');
  }

  constructor(private readonly keys?: string) {}
}
