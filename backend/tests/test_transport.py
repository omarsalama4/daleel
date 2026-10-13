import httpx
import pytest
from daleel.config import Settings
from daleel.network import Fetcher


@pytest.mark.asyncio
async def test_dns_pinned_https_preserves_host_and_text_tls_name(monkeypatch):
    import daleel.network as network

    async def resolve(url, settings):
        assert url == "https://public.example/path"
        return ["93.184.216.34"]

    async def transport(request):
        assert request.url.host == "93.184.216.34"
        assert request.headers["host"] == "public.example"
        # httpcore forwards this directly to AnyIO's TLS hostname encoder.
        assert request.extensions["sni_hostname"] == "public.example"
        assert isinstance(request.extensions["sni_hostname"], str)
        assert request.headers["accept-encoding"] == "identity"
        return httpx.Response(200, headers={"Content-Type": "text/html"}, content=b"<h1>OK</h1>")

    monkeypatch.setattr(network, "resolve_public", resolve)
    fetcher = Fetcher(Settings(env="test", auth_mode="jwt"))
    await fetcher.client.aclose()
    fetcher.client = httpx.AsyncClient(transport=httpx.MockTransport(transport), trust_env=False)
    try:
        status, _, body = await fetcher.raw("https://public.example/path")
        assert status == 200 and body == b"<h1>OK</h1>"
    finally:
        await fetcher.close()
