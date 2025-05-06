import { Logger, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { PaymentsModule } from './payments/payments.module';
import configuration from '../config/configuration';
import { APP_PIPE } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    PaymentsModule,
  ],
  providers: [AppService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name, { timestamp: true });

  constructor() {}
}
