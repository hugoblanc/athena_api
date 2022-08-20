export class SearchedContentTermValueType {
  get isDefined(): boolean {
    return this.terms !== undefined && this.terms !== null && this.terms !== '';
  }

  get value(): string | undefined {
    if (!this.isDefined) {
      return undefined;
    }
    return this.terms.trim();
  }

  constructor(private readonly terms?: string) {}
}
