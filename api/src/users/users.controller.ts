import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Find or create a fan by username' })
  @ApiOkResponse({ description: 'The fan' })
  @ApiBadRequestResponse({ description: 'The username is not valid' })
  login(@Body() dto: LoginDto) {
    return this.usersService.findOrCreate(dto.username);
  }
}
