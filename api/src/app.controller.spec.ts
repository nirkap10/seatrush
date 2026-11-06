import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHealth: () =>
              Promise.resolve({ status: 'ok', database: 'connected' }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns what the service reports', async () => {
    await expect(appController.getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
    });
  });
});
