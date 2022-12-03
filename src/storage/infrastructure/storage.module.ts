import { Module } from '@nestjs/common';
import { StorageService } from '../application/storage.service';
import { GCPBucketStorageService } from './gcpbucketstorage.service';

@Module({
  imports: [],
  controllers: [],
  providers: [{
    provide: StorageService,
    useClass: GCPBucketStorageService
  }],
  exports: [StorageService]
})
export class StorageModule { }
