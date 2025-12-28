export class GetPodcastListQuery {
  constructor(
    public readonly page: number = 1,
    public readonly size: number = 10,
    public readonly terms?: string,
  ) {}
}
