import {
  IsISO31661Alpha2,
  IsEmail,
  IsNotEmpty,
  IsPostalCode,
  Length,
  Matches,
} from 'class-validator';
import { Exclude } from 'class-transformer';

export class CreatePaymentIntentDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsPostalCode('any')
  zipCode: string;

  @IsNotEmpty()
  cardholderName: string;

  // @IsCreditCard() disabled for testing purposes
  @IsNotEmpty()
  cardNumber: string;

  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
  @IsNotEmpty()
  expires: string;

  @Length(3)
  @IsNotEmpty()
  cvv: string;

  @IsISO31661Alpha2()
  @IsNotEmpty()
  country: string;

  @IsNotEmpty()
  rememberCard: 'on' | 'off';

  @Exclude()
  remoteIp: string;

  @Exclude()
  userAgent: string;

  @Exclude()
  acceptHeader: string;

  @Exclude()
  language: string;

  @IsNotEmpty()
  javaEnabled: boolean;

  @IsNotEmpty()
  javascriptEnabled: boolean;

  @IsNotEmpty()
  colorDepth: number;

  @IsNotEmpty()
  utcOffset: number;

  @IsNotEmpty()
  screenWidth: number;

  @IsNotEmpty()
  screenHeight: number;
}
