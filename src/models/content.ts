export class Content {
  public rendered: string;
  public protected?: boolean;

  constructor(input: any) {
    Object.assign(this, input);
  }
}
