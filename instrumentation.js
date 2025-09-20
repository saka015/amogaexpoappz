// register.js
console.log("🔧 register.js loaded - starting OpenTelemetry setup...");

// Set OpenTelemetry log level to debug for troubleshooting
// process.env.OTEL_LOG_LEVEL = 'debug';

try {
	// Import packages one by one to see which one fails
	console.log("📦 Loading NodeSDK...");
	const { NodeSDK } = require("@opentelemetry/sdk-node");

	console.log("📦 Loading OTLP exporter...");
	const {
		OTLPTraceExporter,
	} = require("@opentelemetry/exporter-trace-otlp-http");

	console.log("📦 Loading HTTP instrumentation...");
	const {
		HttpInstrumentation,
	} = require("@opentelemetry/instrumentation-http");

	console.log("📦 Loading Resource...");
	const resourceModule = require("@opentelemetry/resources");
	const { resourceFromAttributes } = resourceModule;
	console.log("Resource module keys:", Object.keys(resourceModule));

	console.log("📦 Loading semantic conventions...");
	const {
		SEMRESATTRS_SERVICE_NAME,
		SEMRESATTRS_SERVICE_VERSION,
		SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
	} = require("@opentelemetry/semantic-conventions");

	const { ParentBasedSampler, AlwaysOnSampler } = require('@opentelemetry/sdk-trace-base');

	// Use resourceFromAttributes to create the resource
	let resource;
	try {
		if (typeof resourceFromAttributes === "function") {
			resource = resourceFromAttributes(
				{
					[SEMRESATTRS_SERVICE_NAME]: "expo-storchat-app",
					[SEMRESATTRS_SERVICE_VERSION]: "1.0.0",
					[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
				}
			);
		} else {
			throw new Error("resourceFromAttributes is not a function. Actual keys: " + Object.keys(resourceModule));
		}
	} catch (e) {
		console.error("❌ Failed to create Resource:", e.message);
		throw e;
	}

	console.log("📦 All packages loaded successfully");
	console.log("🚀 Initializing OpenTelemetry...");

	const traceExporter = new OTLPTraceExporter({
		url: "http://219.93.129.146:4318/v1/traces",
		headers: {},
	});
	console.log("OTLPTraceExporter initialized with URL http://219.93.129.146:4318/v1/traces");

	const sdk = new NodeSDK({
		resource,
		traceExporter,
		instrumentations: [
			new HttpInstrumentation({
				requestHook: (span, request) => {
					span.setAttribute("custom.request_id", Date.now().toString());
				},
			}),
		],
		sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }),
	});

	sdk.start();
	console.log("✅ OpenTelemetry SDK started successfully with Resource!");

	// Manual test span to verify export
	// const { trace } = require('@opentelemetry/api');
	// const tracer = trace.getTracer('manual-test');
	// const span = tracer.startSpan('manual-span');
	// span.end();

	// Global error handlers for debugging exporter issues
	process.on('unhandledRejection', (reason, promise) => {
		console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	});
	process.on('uncaughtException', (err) => {
		console.error('Uncaught Exception thrown:', err);
	});

	
	// Graceful shutdown 
	process.on("SIGTERM", () => {
		sdk
			.shutdown()
			.then(() => console.log("OpenTelemetry tracing terminated"))
			.catch((error) => console.log("Error terminating OpenTelemetry:", error))
			.finally(() => process.exit(0));
	});
} catch (error) {
	console.error("❌ Failed to initialize OpenTelemetry:", error.message);
	console.error("Stack trace:", error.stack);
	console.log("Continuing without OpenTelemetry...");
}
