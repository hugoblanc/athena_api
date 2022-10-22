export interface ShareableContentResponse {
  image: ShareableContentImage;
  title: string;
  originalUrl: string;
}

interface ShareableContentImage {
  url: string;
  width: number;
  height: number;
}
