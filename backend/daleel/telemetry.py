import base64
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace import SpanProcessor
from urllib.parse import urlsplit, urlunsplit
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter


class RedactURLs(SpanProcessor):
    def on_start(self, span, parent_context=None):
        for name in ('http.url', 'url.full', 'http.target'):
            value = span.attributes.get(name)
            if isinstance(value, str):
                parsed = urlsplit(value)
                span.set_attribute(name, urlunsplit((parsed.scheme, parsed.netloc, parsed.path, '', '')))

    def on_end(self, span):
        pass


def configure(settings):
    if not settings.otlp_endpoint and not settings.langfuse_public_key:
        return
    provider = TracerProvider(resource=Resource.create({"service.name": "daleel", "deployment.environment": settings.env}))
    provider.add_span_processor(RedactURLs())
    if settings.otlp_endpoint:
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otlp_endpoint)))
    if settings.langfuse_public_key and settings.langfuse_secret_key:
        auth = base64.b64encode(f"{settings.langfuse_public_key}:{settings.langfuse_secret_key}".encode()).decode()
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
            endpoint=settings.langfuse_endpoint.rstrip("/") + "/api/public/otel/v1/traces",
            headers={"Authorization": "Basic " + auth})))
    trace.set_tracer_provider(provider)
