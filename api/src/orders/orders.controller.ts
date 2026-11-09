import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { requireUsername } from '../users/username-header.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@ApiHeader({ name: 'X-Username', required: true, example: 'dana' })
@ApiUnauthorizedResponse({ description: 'No X-Username header' })
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('holds/:id/checkout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Buy the seats in a hold',
    description:
      'One order per hold: checking out again returns the same order.',
  })
  @ApiOkResponse({ description: 'The order, with its seats and total' })
  @ApiForbiddenResponse({ description: 'Not your hold' })
  @ApiNotFoundResponse({ description: 'No hold with this id' })
  @ApiConflictResponse({ description: 'The hold expired or was released' })
  checkout(
    @Param('id', ParseIntPipe) holdId: number,
    @Headers('x-username') username: string | undefined,
  ) {
    return this.ordersService.checkout(holdId, requireUsername(username));
  }

  @Get('me/orders')
  @ApiOperation({ summary: 'My tickets: all my orders, newest first' })
  @ApiOkResponse({ description: 'The orders, with their seats' })
  myOrders(@Headers('x-username') username: string | undefined) {
    return this.ordersService.myOrders(requireUsername(username));
  }
}
