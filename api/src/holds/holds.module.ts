import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { HoldsController } from './holds.controller.js';
import { HoldsService } from './holds.service.js';

@Module({
  imports: [UsersModule],
  controllers: [HoldsController],
  providers: [HoldsService],
})
export class HoldsModule {}
