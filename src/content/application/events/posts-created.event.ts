export class PostsCreatedEvent {
  static readonly eventName = 'posts.created';
  constructor(public readonly ids: number[]) {}
}
