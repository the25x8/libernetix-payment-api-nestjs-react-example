import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  BatchSpanProcessor,
  NodeTracerProvider,
} from '@opentelemetry/sdk-trace-node';
import { AlwaysOnSampler } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { Logger, ShutdownSignal } from '@nestjs/common';
import * as process from 'process';

export const setupTracer = (serviceName: string) => {
  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_COLLECTOR_URL,
  });

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
    sampler: new AlwaysOnSampler(),
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      // Express instrumentation expects HTTP layer to be instrumented
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
    ],
  });

  // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
  provider.register();
  Logger.log('OpenTelemetry tracing initialized', serviceName);

  // gracefully shut down the SDK on process exit
  [ShutdownSignal.SIGINT, ShutdownSignal.SIGTERM].forEach((signal) => {
    process.on(signal, () => {
      provider
        .shutdown()
        .then(
          () => console.log('Tracer provider shut down successfully'),
          (err) => console.log('Error shutting down tracer provider', err),
        )
        .finally(() => process.exit(0));
    });
  });
};
