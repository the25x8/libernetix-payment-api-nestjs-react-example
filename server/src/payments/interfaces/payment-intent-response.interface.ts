import { DirectPostStatus } from '../types/direct-post-status.type';

export interface IPaymentIntentResponse {
  status: DirectPostStatus;
  bankAcs?: {
    Method: 'POST' | 'GET';
    PaReq: string;
    MD: string;
    URL: string;
  };
}
