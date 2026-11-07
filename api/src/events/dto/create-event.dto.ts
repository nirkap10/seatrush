import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const POSTGRES_MAX_INT = 2_147_483_647;

export class CreateZoneDto {
  @ApiProperty({ example: 'Front' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A', description: 'First row of the zone' })
  @Matches(/^[A-Z]$/, { message: 'fromRow must be one capital letter, A to Z' })
  fromRow: string;

  @ApiProperty({ example: 'C', description: 'Last row of the zone' })
  @Matches(/^[A-Z]$/, { message: 'toRow must be one capital letter, A to Z' })
  toRow: string;

  @ApiProperty({ example: 34935, description: 'Price per seat, in agorot' })
  @IsInt()
  @Min(0)
  @Max(POSTGRES_MAX_INT)
  priceAgorot: number;
}

export class CreateEventDto {
  @ApiProperty({ example: 'Summer Show' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Tel Aviv Arena' })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiProperty({
    example: '2027-07-01T20:00:00Z',
    description: 'When the show starts',
  })
  @IsISO8601({ strict: true })
  startsAt: string;

  @ApiProperty({
    example: '2027-06-01T10:00:00Z',
    description: 'When tickets go on sale. Cannot be after startsAt',
  })
  @IsISO8601({ strict: true })
  dropAt: string;

  @ApiProperty({ example: 8, minimum: 1, maximum: 26 })
  @IsInt()
  @Min(1)
  @Max(26)
  rowCount: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  seatsPerRow: number;

  @ApiProperty({
    type: [CreateZoneDto],
    description: 'Must cover every row exactly once',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateZoneDto)
  zones: CreateZoneDto[];
}
