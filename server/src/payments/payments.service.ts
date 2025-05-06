import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LibernetixApi from 'libernetix_sdk';
import { PaymentsConfig } from '../config.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { HttpService } from '@nestjs/axios';
import {
  IDirectPostRequest,
  IDirectPostResponse,
} from './interfaces/direct-post-request.interface';
import { catchError, firstValueFrom, Observable, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { IPaymentIntentResponse } from './interfaces/payment-intent-response.interface';
import {
  IPaymentBankAcs,
  IPaymentTx,
  PaymentTxStatus,
} from './interfaces/payment-tx.interface';
import { LibernetixWebhookEventType } from './types/libernetix-webhook-event.type';
import { IUpdatePaymentTxParams } from './interfaces/update-payment-params.interface';
import * as qs from 'querystring';
import { IPayment3dsCallbackResponse } from './interfaces/payment-3ds-callback-response.interface';

const PRODUCT_NAME = 'VIP Membership Gift Card';
const PRODUCT_PRICE = 399;

@Injectable()
export class PaymentsService {
  private payments: IPaymentTx[] = [];
  private paymentApi: LibernetixApi.PaymentApi;

  private readonly config: PaymentsConfig;
  private readonly logger = new Logger(PaymentsService.name, {
    timestamp: true,
  });

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const paymentsConfig = configService.getOrThrow<PaymentsConfig>('payments');

    LibernetixApi.ApiClient.instance.basePath = `${paymentsConfig.apiUrl}/v1`;
    LibernetixApi.ApiClient.instance.token = paymentsConfig.apiKey;

    this.config = paymentsConfig;
    this.paymentApi = new LibernetixApi.PaymentApi();
    this.logger.log('Payments service initialized');
  }

  paymentIntent(
    params: CreatePaymentIntentDto,
  ): Promise<IPaymentIntentResponse> {
    // Here I use promise only because the library is not async/await compatible
    // and uses callbacks instead. Will use async/await for the rest of the code.
    return new Promise<IPaymentIntentResponse>((resolve, reject) => {
      // Create a new purchase
      const purchase = this.buildPurchase(params);
      this.paymentApi.purchasesCreate(purchase, async (error, purchase, _) => {
        if (error) {
          this.logger.error('Error creating purchase', error);
          reject(
            new InternalServerErrorException('Error creating purchase', {
              cause: error,
              description: 'Error creating purchase',
            }),
          );
        }

        // Pass card details to direct_post_url via POST request
        const cardDetails: IDirectPostRequest = {
          card_number: params.cardNumber,
          cardholder_name: params.cardholderName,
          expires: params.expires,
          cvc: params.cvv,
          remember_card: params.rememberCard,
          remote_ip: params.remoteIp,
          user_agent: params.userAgent,
          accept_header: params.acceptHeader,
          language: params.language,
          java_enabled: params.javaEnabled,
          javascript_enabled: params.javascriptEnabled,
          color_depth: params.colorDepth,
          utc_offset: params.utcOffset,
          screen_width: params.screenWidth,
          screen_height: params.screenHeight,
        };

        // Send card details to the direct post URL
        try {
          const directPostUrl = `${purchase.direct_post_url}?s2s=true`;
          const { data: directPostData } = await firstValueFrom(
            this.httpService
              .post<IDirectPostResponse, IDirectPostRequest>(
                directPostUrl,
                cardDetails,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.s2sToken}`,
                  },
                },
              )
              .pipe(catchError(this.handleDirectPostError)),
          );

          // Handle direct post response
          const result = await this.handleDirectPostResponse(
            purchase.id,
            directPostData,
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async processPayment(
    eventType: LibernetixWebhookEventType,
    purchaseSnapshot: LibernetixApi.Purchase,
  ) {
    const tx = this.getPaymentTx(purchaseSnapshot.id);

    // Log the event and payment transaction
    this.logger.log('Event type:', eventType);
    this.logger.log('Payment transaction:', tx);

    // Handle payments based on the event type
    let status: PaymentTxStatus;
    switch (eventType) {
      case 'purchase.created':
        // Do nothing, just log the event
        return;
      case 'purchase.paid':
        this.logger.log('Purchase paid', purchaseSnapshot.id);
        status = 'completed';
        break;
      case 'purchase.cancelled':
        this.logger.log('Purchase cancelled', purchaseSnapshot.id);
        status = 'cancelled';
        break;
      case 'purchase.payment_failure':
        this.logger.log('Purchase payment failure', purchaseSnapshot.id);
        status = 'failed';
        break;
      default:
        this.logger.error(`Unknown event type: ${eventType}`);
        throw new InternalServerErrorException('Unknown event type', {
          description: 'Unknown event type',
        });
    }

    // Update the payment transaction status after processing the event
    this.updatePaymentTx(purchaseSnapshot.id, {
      status,
    });
    this.logger.log('Payment transaction updated', tx);
  }

  async process3DsRedirect(md: string, paReq: string): Promise<void> {
    const paymentTx = this.getPaymentTxByMDAndPaReq(md, paReq);

    // Check can tx be processed
    if (paymentTx.status !== 'pending') {
      this.logger.warn('Payment tx is not pending');
      return;
    }
    if (!paymentTx.bankAcs) {
      this.logger.warn('Payment tx does not have bankAcs data');
      return;
    }

    this.logger.log('Processing 3DS redirect', {
      purchaseId: paymentTx.purchaseId,
      md,
      paReq,
    });

    // Call the payment API to process the 3DS authentication
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post<IPayment3dsCallbackResponse, string>(
            paymentTx.bankAcs.callback_url,
            qs.stringify({
              PaRes: paReq,
              MD: md,
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          )
          .pipe(
            catchError((error) =>
              throwError(() => {
                if (error.status === HttpStatus.BAD_REQUEST) {
                  throw new BadRequestException('Payment callback invalid', {
                    description: 'Payment callback invalid',
                  });
                }

                // Otherwise process the internal server error
                this.logger.error(
                  'Failed to authorize 3DS payment for purchase',
                  paymentTx.purchaseId,
                );

                throw new InternalServerErrorException(
                  'Failed to authorize 3DS payment',
                  {
                    cause: error.cause,
                    description: 'Failed to authorize 3DS payment',
                  },
                );
              }),
            ),
          ),
      );

      // It's possible to receive a response code 400 to this request - e.g. in
      // case the acquirer wasn't able to finalize the payment status yet.
      // So we don't need to do anything here.
      this.logger.log('3DS callback response', data);
    } catch (e) {
      this.logger.error(
        'Failed to authorize 3DS payment for purchase',
        paymentTx.purchaseId,
      );
      throw new InternalServerErrorException(
        'Failed to authorize 3DS payment',
        {
          cause: e,
          description: 'Failed to authorize 3DS payment',
        },
      );
    }

    // TODO Probably we need to remove the bankAcs details after 3DS authentication
    const updatedTx = this.updatePaymentTx(paymentTx.purchaseId, {
      status: 'completed',
      bankAcs: undefined,
    });

    if (!updatedTx) {
      this.logger.warn(
        `Payment transaction not found for purchase ID ${paymentTx.purchaseId}`,
      );
    }
  }

  private async handleDirectPostResponse(
    purchaseId: string,
    data: IDirectPostResponse,
  ): Promise<IPaymentIntentResponse> {
    const result: IPaymentIntentResponse = { status: data.status };
    let status: PaymentTxStatus;
    let bankAcs: IPaymentBankAcs | undefined;

    // Check the payment status
    switch (data.status) {
      case 'executed':
        this.logger.log('Payment executed successfully');
        status = 'completed';
        break;

      // 3DS authentication required
      case '3DS_required':
        this.logger.log('Payment requires 3DS authentication');
        status = 'pending';

        // Capture ACS details for 3DS authentication redirection
        bankAcs = data;

        // Set the bankAcs details for the client
        result.bankAcs = {
          Method: data.Method,
          PaReq: data.PaReq,
          MD: data.MD,
          URL: data.URL,
        };
        break;

      // Payment is pending and should be processed by webhook later
      case 'pending':
        this.logger.log('Payment is pending');
        status = 'pending';
        break;

      // Omit authorized case for test task
      // case 'authorized':

      default:
        this.logger.error('Invalid payment status: ', data.status);
        throw new InternalServerErrorException('Invalid payment status', {
          description: 'Invalid payment status',
        });
    }

    // Handle successfully processed payment
    this.logger.log('Payment processed successfully', data);

    // Update "database"
    this.payments.push({
      purchaseId,
      bankAcs,
      status,
    });

    return result;
  }

  private buildPurchase(
    params: CreatePaymentIntentDto,
  ): LibernetixApi.Purchase {
    // Build client details
    const client = new LibernetixApi.ClientDetails(params.email);
    client.country = params.country;
    client.zip_code = params.zipCode;

    // Build product details
    const product = new LibernetixApi.Product(PRODUCT_NAME, PRODUCT_PRICE);
    const details = new LibernetixApi.PurchaseDetails([product]);

    // Create the purchase
    const purchase = new LibernetixApi.Purchase();
    purchase.client = client;
    purchase.purchase = details;
    purchase.brand_id = this.config.brandId;
    purchase.success_redirect = this.config.successRedirect;
    purchase.failure_redirect = this.config.failureRedirect;

    return purchase;
  }

  private handleDirectPostError(error: AxiosError): Observable<never> {
    return throwError(() => {
      // Handle bad request error
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw new BadRequestException('Invalid payment details', {
          cause: error.cause,
          description: 'Invalid payment details',
        });
      }

      // Otherwise process the internal server error
      this.logger.error(
        'Unable to process payment',
        JSON.stringify(error.response?.data),
      );

      throw new InternalServerErrorException('Unable to process payment', {
        cause: error.cause,
        description: 'Unable to process payment',
      });
    });
  }

  private getPaymentTx(purchaseId: string): IPaymentTx {
    const tx = this.payments.find(
      (payment) => payment.purchaseId === purchaseId,
    );
    if (!tx) {
      throw new NotFoundException(
        `Payment transaction not found for purchase ID ${purchaseId}`,
        {
          description: 'Payment transaction not found',
        },
      );
    }

    return tx;
  }

  private getPaymentTxByMDAndPaReq(md: string, paReq: string): IPaymentTx {
    const tx = this.payments.find(
      (payment) =>
        payment.bankAcs?.MD === md && payment.bankAcs?.PaReq === paReq,
    );
    if (!tx) {
      throw new NotFoundException(
        `Payment transaction not found for the provided MD and PaReq`,
        {
          description: 'Payment transaction not found',
        },
      );
    }

    return tx;
  }

  private updatePaymentTx(
    purchaseId: string,
    params: IUpdatePaymentTxParams,
  ): IPaymentTx | undefined {
    const payment = this.getPaymentTx(purchaseId);

    // Update payment properties
    payment.status = params.status;
    payment.bankAcs = params.bankAcs;

    // Update payment transaction in the "database"
    const index = this.payments.findIndex((p) => p.purchaseId === purchaseId);
    if (index === -1) {
      // Cannot be undefined, but just in case
      this.logger.warn(
        `Payment transaction not found for purchase ID ${purchaseId}`,
      );
      return;
    }

    this.logger.log('Payment transaction updated', payment);
    return payment;
  }
}
