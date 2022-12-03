import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class StorageService {
  abstract saveFile(filePath: string, destination: string): Promise<string>
}
