import * as process from 'process';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupTracer } from './intrumentation';

async function bootstrap() {
  // Setup OpenTelemetry tracing before creating the app
  setupTracer('payment-api-service');

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableShutdownHooks();
  app.enableCors();
  app.setGlobalPrefix('v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
