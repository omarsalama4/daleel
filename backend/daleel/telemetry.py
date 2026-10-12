"""Export operational traces without page content, credentials or capability URLs."""
import base64
import re
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, ReadableSpan
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter
from opentelemetry.trace import Status, SpanContext
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter


def safe_span(span):
    # Instrumentation can add fields after on_start. Filter at export time instead.
    attrs = {}
    for key in ("http.method", "http.request.method"):
        value = span.attributes.get(key)
        if value in ("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"):
            attrs[key] = value
    for key in ("http.status_code", "http.response.status_code"):
        value = span.attributes.get(key)
        if isinstance(value, int) and 100 <= value <= 599:
            attrs[key] = value
    if span.attributes.get("provider") in ("groq", "openrouter_free"):
        attrs["provider"] = span.attributes["provider"]
    run_id = span.attributes.get("run.id", "")
    if isinstance(run_id, str) and re.fullmatch(r"[0-9a-f-]{36}", run_id):
        attrs["run.id"] = run_id
    name = span.name if span.name in ("crawl.page", "model.planning", "model.extraction") else "http.request"
    # Drop events, links, status descriptions and arbitrary resource attributes:
    # exception messages and URL paths can contain authentication capabilities.
    resource = Resource({key: value for key, value in span.resource.attributes.items()
                         if key in ("service.name", "deployment.environment", "gcp.project_id")})
    context = SpanContext(trace_id=span.context.trace_id, span_id=span.context.span_id,
                          is_remote=span.context.is_remote, trace_flags=span.context.trace_flags)
    return ReadableSpan(name=name, context=context, parent=span.parent, resource=resource,
                        attributes=attrs, kind=span.kind, status=Status(span.status.status_code),
                        start_time=span.start_time, end_time=span.end_time,
                        instrumentation_scope=span.instrumentation_scope)


class PrivateExporter(SpanExporter):
    def __init__(self, exporter):
        self.exporter = exporter

    def export(self, spans):
        return self.exporter.export([safe_span(span) for span in spans])

    def shutdown(self):
        self.exporter.shutdown()

    def force_flush(self, timeout_millis=30000):
        return self.exporter.force_flush(timeout_millis)


def configure(settings):
    if not any((settings.otlp_endpoint, settings.langfuse_public_key, settings.google_trace_project)):
        return
    attributes = {"service.name": "daleel", "deployment.environment": settings.env}
    if settings.google_trace_project:
        attributes["gcp.project_id"] = settings.google_trace_project
    provider = TracerProvider(resource=Resource(attributes))

    def add(exporter):
        provider.add_span_processor(BatchSpanProcessor(PrivateExporter(exporter)))

    if settings.google_trace_project:
        import google.auth
        from google.auth.transport.requests import AuthorizedSession
        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"],
                                              quota_project_id=settings.google_trace_project)
        add(OTLPSpanExporter(endpoint="https://telemetry.googleapis.com/v1/traces",
                            session=AuthorizedSession(credentials),
                            headers={"x-goog-user-project": settings.google_trace_project}))
    if settings.otlp_endpoint:
        add(OTLPSpanExporter(endpoint=settings.otlp_endpoint))
    if settings.langfuse_public_key and settings.langfuse_secret_key:
        auth = base64.b64encode(f"{settings.langfuse_public_key}:{settings.langfuse_secret_key}".encode()).decode()
        add(OTLPSpanExporter(endpoint=settings.langfuse_endpoint.rstrip("/") + "/api/public/otel/v1/traces",
                            headers={"Authorization": "Basic " + auth}))
    trace.set_tracer_provider(provider)
