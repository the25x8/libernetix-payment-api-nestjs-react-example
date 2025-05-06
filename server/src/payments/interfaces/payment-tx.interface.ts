export type PaymentTxStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface IPaymentBankAcs {
  Method: 'POST' | 'GET';
  PaReq: string;
  MD: string;
  URL: string;
  callback_url: string;
}

export interface IPaymentTx {
  purchaseId: string;
  status: PaymentTxStatus;
  bankAcs?: IPaymentBankAcs;
}
