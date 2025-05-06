export type CreatePaymentIntentRequest = {
  // Form fields
  email: string;
  cardholderName: string;
  cardNumber: string;
  expires: string;
  cvv: string;
  country: string;
  zipCode: string;
  rememberCard: 'on' | 'off';

  // Additional fields
  javaEnabled: boolean;
  javascriptEnabled: boolean;
  colorDepth: number;
  utcOffset: number;
  screenWidth: number;
  screenHeight: number;
};

export interface IPaymentBankAcs {
  Method: 'POST' | 'GET';
  PaReq: string;
  MD: string;
  URL: string;
}

export interface IPaymentIntentResponse {
  status: string;
  bankAcs?: IPaymentBankAcs;
}
