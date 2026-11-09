import {
  Body,
  Controller,
  Delete,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { requireUsername } from '../users/username-header.js';
import { CreateHoldDto } from './dto/create-hold.dto.js';
import { HoldsService } from './holds.service.js';

@ApiTags('holds')
@ApiHeader({ name: 'X-Username', required: true, example: 'dana' })
@ApiUnauthorizedResponse({ description: 'No X-Username header' })
@Controller()
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post('events/:id/holds')
  @ApiOperation({ summary: 'Hold 1 to 4 seats, all or nothing' })
  @ApiCreatedResponse({ description: 'The hold, its seats and expiry time' })
  @ApiBadRequestResponse({ description: 'Bad request, or a seat not found' })
  @ApiForbiddenResponse({ description: 'Tickets are not on sale yet' })
  @ApiNotFoundResponse({ description: 'No event with this id' })
  @ApiConflictResponse({ description: 'A seat is taken, or over the limit' })
  createHold(
    @Param('id', ParseIntPipe) eventId: number,
    @Headers('x-username') username: string | undefined,
    @Body() dto: CreateHoldDto,
  ) {
    return this.holdsService.createHold(
      eventId,
      requireUsername(username),
      dto.seats,
    );
  }

  @Delete('holds/:id')
  @ApiOperation({ summary: 'Release a hold early (owner only)' })
  @ApiOkResponse({ description: 'The hold was released' })
  @ApiForbiddenResponse({ description: 'Not your hold' })
  @ApiNotFoundResponse({ description: 'No hold with this id' })
  @ApiConflictResponse({ description: 'Already released, bought or expired' })
  releaseHold(
    @Param('id', ParseIntPipe) holdId: number,
    @Headers('x-username') username: string | undefined,
  ) {
    return this.holdsService.releaseHold(holdId, requireUsername(username));
  }
}
