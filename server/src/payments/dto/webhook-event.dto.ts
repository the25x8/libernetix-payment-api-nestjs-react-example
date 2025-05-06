import LibernetixApi from 'libernetix_sdk';
import { LibernetixWebhookEventType } from '../types/libernetix-webhook-event.type';

export class WebhookEventDto extends LibernetixApi.Purchase {
  event_type: LibernetixWebhookEventType;
}
