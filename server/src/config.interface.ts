export interface OtelConfig {
  collectorUrl: string;
}

export interface PaymentsConfig {
  apiUrl: string;
  apiKey: string;
  s2sToken: string;
  brandId: string;
  successRedirect: string;
  failureRedirect: string;
}
