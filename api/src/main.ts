import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupSwagger } from './swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Let the web app (a different address) call the API from the browser.
  app.enableCors({ origin: 'http://localhost:5173' });
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
