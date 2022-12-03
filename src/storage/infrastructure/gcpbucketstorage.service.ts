import { Injectable } from '@nestjs/common';
import { StorageService } from '../application/storage.service';
import { Storage } from '@google-cloud/storage';
@Injectable()
export class GCPBucketStorageService extends StorageService {
  private bucketName: string;
  private readonly storage: Storage;

  constructor() {
    super();
    this.bucketName = process.env.GCP_BUCKET_NAME;
    this.storage = new Storage({
      projectId: process.env.ATHENA_PROJECT_ID,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
      credentials: {
        client_email: process.env.ATHENA_CLIENT_EMAIL,
        private_key: process.env.ATHENA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }
    });
  }

  async saveFile(filePath: string, destination: string): Promise<string> {
    await this.storage.bucket(this.bucketName).upload(filePath, { destination });
    const bucketBaseUrl = process.env.GCP_BUCKET_BASE_URL;
    const fileUrl = bucketBaseUrl + destination;
    return fileUrl;
  }
}
