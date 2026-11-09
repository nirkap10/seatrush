import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

// Also used for the X-Username header, which can only carry plain English characters.
export const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;
export const USERNAME_RULE =
  'username must be 1 to 30 English letters, numbers, _ or -';

export class LoginDto {
  @ApiProperty({ example: 'dana' })
  @Matches(USERNAME_PATTERN, { message: USERNAME_RULE })
  username: string;
}
