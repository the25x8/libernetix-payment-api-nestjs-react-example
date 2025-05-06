import { DirectPostStatus } from '../types/direct-post-status.type';

export interface IDirectPostRequest {
  cardholder_name: string;
  card_number: string;
  expires: string;
  cvc: string;
  remember_card: string;
  remote_ip: string;
  user_agent: string;
  accept_header: string;
  language: string;
  java_enabled: boolean;
  javascript_enabled: boolean;
  color_depth: number;
  utc_offset: number;
  screen_width: number;
  screen_height: number;
}

export interface IDirectPostResponse {
  status: DirectPostStatus;
  Method: 'POST' | 'GET';
  PaReq: string;
  MD: string;
  URL: string;
  callback_url: string;
}
