import * as process from 'process';

export default () => ({
  otel: {
    collectorUrl: process.env.OTEL_COLLECTOR_URL,
  },
  payments: {
    apiUrl: process.env.LIBERNETIX_API_URL,
    apiKey: process.env.LIBERNETIX_API_KEY,
    s2sToken: process.env.LIBERNETIX_S2S_TOKEN,
    brandId: process.env.LIBERNETIX_BRAND_ID,
    successRedirect: process.env.PAYMENTS_SUCCESS_REDIRECT,
    failureRedirect: process.env.PAYMENTS_FAILURE_REDIRECT,
  },
});
