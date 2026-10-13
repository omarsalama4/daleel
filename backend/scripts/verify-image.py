"""Isolated image check: no live accounts, credentials, model calls or external pages."""
import asyncio
import os
import time
from fastapi.testclient import TestClient
from playwright.async_api import async_playwright, expect
from daleel.app import make_app
from daleel.config import Settings

settings = Settings(_env_file=None, env="test", auth_mode="development",
    dev_token="image-verification-token-only-12345", worker_mode="external",
    database_url="sqlite:///./data/image-check.db")
with TestClient(make_app(settings)) as client:
    assert client.get("/ready").status_code == 200
    assert '<div id="root">' in client.get("/sign-in").text
    assert client.get("/api/v1/me").status_code == 401
    assert client.get("/api/v1/missing").status_code == 404

async def browser_check():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_content("<html><body><h1>Daleel image check</h1></body></html>")
            assert await page.locator("h1").inner_text() == "Daleel image check"
            screenshot = await page.screenshot()
            # Exercise the real viewer HTML and CSP in Chromium. Header-only
            # checks cannot prove that browser-generated blob images render.
            os.environ["DALEEL_SESSION_BROKER_AUTH_MODE"] = "token"
            os.environ["DALEEL_SESSION_BROKER_TOKEN"] = "image-check-token-only-" + "x" * 32
            os.environ["DALEEL_BROKER_PUBLIC_URL"] = "https://broker.example.org"
            from daleel import broker
            broker.connections["image-check"] = {"cap": "synthetic-image-check", "expires": time.time() + 60}
            response = TestClient(broker.app).get("/viewer/synthetic-image-check")
            assert response.status_code == 200

            async def serve_viewer(route):
                if route.request.url == "https://broker.example.org/viewer/synthetic-image-check":
                    await route.fulfill(status=200, headers=dict(response.headers), body=response.content)
                elif route.request.url == "https://broker.example.org/viewer/synthetic-image-check/screen":
                    await route.fulfill(status=200, content_type="image/png", body=screenshot)
                else:
                    await route.abort()

            await page.route("**/*", serve_viewer)
            await page.goto("https://broker.example.org/viewer/synthetic-image-check")
            # Locator assertions poll in Playwright's utility world without string
            # evaluation in the protected page. Keep unsafe-eval forbidden.
            await expect(page.locator("#screen")).to_have_js_property("naturalWidth", 1280)
            assert await page.locator("#status").inner_text() == ""
        finally:
            await browser.close()

asyncio.run(browser_check())
print("Image frontend/API/Chromium smoke checks passed")
