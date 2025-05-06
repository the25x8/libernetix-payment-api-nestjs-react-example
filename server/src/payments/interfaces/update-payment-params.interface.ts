import { IPaymentBankAcs, PaymentTxStatus } from './payment-tx.interface';

export interface IUpdatePaymentTxParams {
  status: PaymentTxStatus;
  bankAcs?: IPaymentBankAcs;
}
