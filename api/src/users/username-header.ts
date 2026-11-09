import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { USERNAME_PATTERN, USERNAME_RULE } from './dto/login.dto.js';

// Checks the X-Username header on requests that need a fan.
export function requireUsername(header: string | undefined): string {
  if (!header) {
    throw new UnauthorizedException(
      'Send your username in the X-Username header',
    );
  }
  if (!USERNAME_PATTERN.test(header)) {
    throw new BadRequestException(USERNAME_RULE);
  }
  return header;
}
