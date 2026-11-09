import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  Matches,
} from 'class-validator';

export class CreateHoldDto {
  @ApiProperty({
    example: ['B7', 'B8'],
    description: 'Seat labels to hold, 1 to 4',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique({ message: 'Each seat can only be asked for once' })
  @Matches(/^[A-Z][0-9]{1,3}$/, {
    each: true,
    message: 'Each seat must be a row letter and a number, such as B7',
  })
  seats: string[];
}
