import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventsService } from './events.service.js';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an event with its zones and seats (admin)' })
  @ApiCreatedResponse({ description: 'The event, its zones and its seats' })
  @ApiBadRequestResponse({ description: 'The event data is not valid' })
  createEvent(@Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all events, by drop time' })
  @ApiOkResponse({ description: 'The events, without their seats' })
  listEvents() {
    return this.eventsService.listEvents();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one event with its zones and seats' })
  @ApiHeader({
    name: 'X-Username',
    required: false,
    description: "Optional. If sent, the response includes this fan's holds",
  })
  @ApiOkResponse({
    description:
      "The event, zones, seats, the fan's active holds and the server time",
  })
  @ApiBadRequestResponse({ description: 'The id is not a number' })
  @ApiNotFoundResponse({ description: 'No event with this id' })
  getEvent(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-username') username: string | undefined,
  ) {
    return this.eventsService.getEvent(id, username);
  }
}
