import { ApiProperty } from '@nestjs/swagger';

export class EventSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Summer Show' })
  name: string;

  @ApiProperty({ example: 'Tel Aviv Arena' })
  venue: string;

  @ApiProperty({ example: '2027-07-01T20:00:00.000Z' })
  startsAt: Date;

  @ApiProperty({ example: '2027-06-01T10:00:00.000Z' })
  dropAt: Date;

  @ApiProperty({ example: 8 })
  rowCount: number;

  @ApiProperty({ example: 10 })
  seatsPerRow: number;
}

export class ZoneDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Front' })
  name: string;

  @ApiProperty({ example: 'A' })
  fromRow: string;

  @ApiProperty({ example: 'C' })
  toRow: string;

  @ApiProperty({ example: 34935 })
  priceAgorot: number;
}

export class SeatDto {
  @ApiProperty({ example: 'B7' })
  label: string;

  @ApiProperty({ example: 'B' })
  rowLetter: string;

  @ApiProperty({ example: 7 })
  seatNumber: number;

  @ApiProperty({ example: 1 })
  zoneId: number;

  @ApiProperty({ enum: ['available', 'held', 'sold'], example: 'available' })
  status: 'available' | 'held' | 'sold';
}

export class EventDetailsDto extends EventSummaryDto {
  @ApiProperty({ type: [ZoneDto] })
  zones: ZoneDto[];

  @ApiProperty({ type: [SeatDto] })
  seats: SeatDto[];
}

export class ErrorDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Row C has no zone' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
