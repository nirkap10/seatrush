import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // Safe when two requests create the same new username at once:
  // the second insert is skipped instead of failing on the unique rule.
  async findOrCreate(username: string): Promise<User> {
    await this.users
      .createQueryBuilder()
      .insert()
      .values({ username })
      .orIgnore()
      .execute();

    return this.users.findOneByOrFail({ username });
  }

  // For viewing only: doesn't create a fan who doesn't exist yet.
  find(username: string): Promise<User | null> {
    return this.users.findOneBy({ username });
  }
}
