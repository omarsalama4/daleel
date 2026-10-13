"""JavaScript rendering uses the constrained research browser toolkit."""
from .browser_tools import browser_tools


async def render_page(fetcher, initial, domains, cookies=None, storage_state=None, steps=None, seconds=60, max_bytes=5_000_000):
    steps = steps or []
    search_selectors = [s["selector"] for s in steps if s["action"] in ("fill", "select")]
    click_selectors = [s["selector"] for s in steps if s["action"] == "click"]
    async with browser_tools(fetcher, domains, cookies=cookies, storage_state=storage_state,
                             seconds=seconds, max_bytes=max_bytes, search_selectors=search_selectors,
                             click_selectors=click_selectors) as tools:
        await tools.execute({"action": "navigate", "url": initial["url"]})
        for step in steps:
            await tools.execute(step)
        return {**initial, **await tools.snapshot()}
