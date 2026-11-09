import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class BestAvailableDto {
  @ApiProperty({ example: 2, minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  count: number;

  @ApiPropertyOptional({
    example: 25000,
    description: 'Highest price per seat, in agorot',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPriceAgorot?: number;

  @ApiPropertyOptional({ example: 'Front', description: 'Zone name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  zone?: string;
}
