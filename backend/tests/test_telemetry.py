import json
from types import SimpleNamespace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, SpanExporter, SpanExportResult
from opentelemetry.trace import Status, StatusCode, SpanContext, TraceState, TraceFlags, NonRecordingSpan, set_span_in_context
from daleel.telemetry import PrivateExporter, configure


class Capture(SpanExporter):
    def __init__(self):
        self.spans = []
        self.closed = False

    def export(self, spans):
        self.spans.extend(spans)
        return SpanExportResult.SUCCESS

    def shutdown(self):
        self.closed = True

    def force_flush(self, timeout_millis=30000):
        return timeout_millis == 1234


def test_export_drops_late_urls_capabilities_exceptions_and_resource_secrets():
    capture = Capture()
    exporter = PrivateExporter(capture)
    provider = TracerProvider(resource=Resource({"service.name": "daleel", "secret": "private-canary"}))
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    parent = SpanContext(trace_id=1, span_id=2, is_remote=True, trace_flags=TraceFlags(TraceFlags.SAMPLED),
                         trace_state=TraceState([("secret", "private-canary")]))
    context = set_span_in_context(NonRecordingSpan(parent))
    with provider.get_tracer("test").start_as_current_span("GET /invite/private-canary", context=context) as span:
        span.set_attribute("http.url", "https://example.com/invite/private-canary?token=private-canary")
        span.set_attribute("http.request.header.authorization", "private-canary")
        span.set_attribute("http.method", "GET")
        span.set_attribute("http.status_code", 401)
        span.set_attribute("prompt", "private-canary")
        span.add_event("exception", {"exception.message": "private-canary"})
        span.set_status(Status(StatusCode.ERROR, "private-canary"))
    result = capture.spans[0]
    assert "private-canary" not in result.to_json()
    assert result.name == "http.request"
    assert result.attributes == {"http.method": "GET", "http.status_code": 401}
    assert not result.events and not result.links
    assert result.status.status_code == StatusCode.ERROR
    assert exporter.force_flush(1234)
    provider.shutdown()
    assert capture.closed


def test_export_preserves_agent_stage_and_operational_identifiers():
    capture = Capture()
    provider = TracerProvider(resource=Resource({"service.name": "daleel"}))
    provider.add_span_processor(SimpleSpanProcessor(PrivateExporter(capture)))
    with provider.get_tracer("test").start_as_current_span("model.extraction") as span:
        span.set_attribute("provider", "groq")
        span.set_attribute("run.id", "11111111-1111-1111-1111-111111111111")
    assert capture.spans[0].name == "model.extraction"
    assert capture.spans[0].attributes["provider"] == "groq"
    assert capture.spans[0].context.trace_id
    provider.shutdown()


def test_browser_trace_keeps_action_but_never_search_values_or_targets():
    capture = Capture()
    provider = TracerProvider(resource=Resource({"service.name": "daleel"}))
    provider.add_span_processor(SimpleSpanProcessor(PrivateExporter(capture)))
    with provider.get_tracer("test").start_as_current_span("browser.action") as span:
        span.set_attribute("browser.action", "fill")
        span.set_attribute("browser.text", "private-canary")
        span.set_attribute("browser.selector", "private-canary")
    assert capture.spans[0].name == "browser.action"
    assert capture.spans[0].attributes == {"browser.action": "fill"}
    assert "private-canary" not in capture.spans[0].to_json()
    provider.shutdown()


def test_google_export_uses_workload_credentials_and_project(monkeypatch):
    import google.auth
    import google.auth.transport.requests
    import daleel.telemetry as telemetry
    credentials = object()
    called = {}
    capture = Capture()

    def default(**kwargs):
        called["credentials"] = kwargs
        return credentials, "project"

    def session(value):
        assert value is credentials
        return "authorized-session"

    def exporter(**kwargs):
        called["exporter"] = kwargs
        return capture

    monkeypatch.setattr(google.auth, "default", default)
    monkeypatch.setattr(google.auth.transport.requests, "AuthorizedSession", session)
    monkeypatch.setattr(telemetry, "OTLPSpanExporter", exporter)
    monkeypatch.setattr(telemetry.trace, "set_tracer_provider", lambda provider: called.update(provider=provider))
    configure(SimpleNamespace(google_trace_project="daleel-project", env="production", otlp_endpoint="",
                              langfuse_public_key="", langfuse_secret_key=""))
    assert called["credentials"]["quota_project_id"] == "daleel-project"
    assert called["exporter"]["session"] == "authorized-session"
    assert called["exporter"]["endpoint"] == "https://telemetry.googleapis.com/v1/traces"
    assert called["exporter"]["headers"] == {"x-goog-user-project": "daleel-project"}
    assert json.dumps(dict(called["provider"].resource.attributes))
    called["provider"].shutdown()
