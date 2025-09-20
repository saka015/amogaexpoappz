// /app/api/sendmail+api.ts
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('expo-api-handler');

export async function GET(request: Request) {
  // Debug: log current span and trace context
  const currentSpan = trace.getSpan(context.active());
  // console.log('Current span:', currentSpan);
  if (currentSpan) {
    console.log('Current traceId:', currentSpan.spanContext().traceId);
  }
  return tracer.startActiveSpan('sendmail-post-handler', async (span) => {
    try {
      console.log("triggered");

      // Add attributes to your span for more context
      span.setAttribute('http.method', 'POST');
      span.setAttribute('http.url', request.url);

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));

      span.addEvent('Work complete');

      return Response.json({ hello: 'world ' });
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
      }
      span.setStatus({ code: 2, message: 'Error' }); // 2 is the code for ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}