import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Serves the interactive docs at /docs and the OpenAPI JSON at /docs-json.
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('SeatRush API')
    .setDescription('A ticket drop that never sells the same seat twice')
    .setVersion('1.0')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
