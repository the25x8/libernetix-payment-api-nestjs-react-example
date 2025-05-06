import { Body, Controller, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { IPaymentIntentResponse } from './interfaces/payment-intent-response.interface';
import { Process3dsRedirectDto } from './dto/process-3ds-redirect.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(201)
  async createPaymentIntent(
    @Req() req: Request,
    @Ip() ip: string,
    @Body() params: CreatePaymentIntentDto,
  ): Promise<IPaymentIntentResponse> {
    params.remoteIp = ip || req.headers['x-forwarded-for'];
    params.userAgent = req.headers['user-agent'];
    params.acceptHeader = req.headers['accept'];
    params.language = req.headers['accept-language'];

    try {
      return await this.paymentsService.paymentIntent(params);
    } catch (error) {
      throw error;
    }
  }

  @Post('webhook')
  @HttpCode(204)
  async handleWebhook(@Body() purchase: WebhookEventDto): Promise<void> {
    try {
      return await this.paymentsService.processPayment(
        purchase.event_type,
        purchase,
      );
    } catch (error) {
      throw error;
    }
  }

  @Post('3ds/redirect')
  @HttpCode(204)
  async handleTermUrlRedirect(
    @Body() params: Process3dsRedirectDto,
  ): Promise<void> {
    try {
      return await this.paymentsService.process3DsRedirect(
        params.MD,
        params.PaRes,
      );
    } catch (error) {
      throw error;
    }
  }
}
