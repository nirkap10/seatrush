import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional({
    example: 'SAVE10',
    description: 'SAVE10 (10% off) or WELCOME20 (20.00 off, once per fan)',
  })
  @IsOptional()
  @IsString()
  promoCode?: string;
}
