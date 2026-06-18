import { Module } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import { PushBroadcastListener } from './push-broadcast.listener';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  controllers: [PushController],
  providers: [PrismaService, PushService, PushBroadcastListener],
  exports: [PushService],
})
export class PushModule {}
