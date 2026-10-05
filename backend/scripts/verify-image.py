"""Isolated image check: no live accounts, credentials, model calls or external pages."""
import asyncio
from fastapi.testclient import TestClient
from playwright.async_api import async_playwright
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
        finally:
            await browser.close()

asyncio.run(browser_check())
print("Image frontend/API/Chromium smoke checks passed")
