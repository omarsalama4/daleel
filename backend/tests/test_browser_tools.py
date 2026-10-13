"""Real Chromium tests with a synthetic, intercepted transport; no external accounts."""
from types import SimpleNamespace
import httpx
import pytest
from daleel.browser_tools import browser_tools, BrowserToolkit
from daleel.errors import Problem


HTML = '''<html><title>Research catalog</title><body>
<label for="q">Search</label><input id="q" type="search"><select id="filter"><option value="all">All</option><option value="ai">AI</option></select>
<button id="expand" onclick="document.querySelector('#details').hidden=false">Show details</button>
<section id="details" hidden>AI Engineer in Cairo</section><a id="next" href="/next">Next page</a>
<button id="write" onclick="fetch('/save',{method:'POST',body:'blocked'})">Save</button>
</body></html>'''


class Transport:
    settings = SimpleNamespace(max_page_bytes=1_000_000)

    def __init__(self):
        self.requests = []

    async def permitted(self, url):
        return not url.endswith('/blocked')

    async def raw(self, url, **kwargs):
        self.requests.append((url, kwargs.get('method', 'GET')))
        if url.endswith('/challenge'):
            body = '<html><input type="password"><h1>Sign in</h1></html>'
        elif url.endswith('/next'):
            body = '<html><title>Next</title><body>Next opportunity</body></html>'
        else:
            body = HTML
        return 200, httpx.Headers({'Content-Type': 'text/html'}), body.encode()


@pytest.mark.asyncio
async def test_real_browser_observe_search_expand_extract_and_navigation():
    transport = Transport()
    async with browser_tools(transport, ['research.example'], search_selectors=['#q', '#filter'], click_selectors=['#expand']) as tools:
        observed = await tools.execute({'action': 'navigate', 'url': 'https://research.example/'})
        assert observed['title'] == 'Research catalog'
        assert any(e['name'] == 'Show details' for e in observed['elements'])
        await tools.execute({'action': 'fill', 'selector': '#q', 'text': 'AI jobs'})
        await tools.execute({'action': 'select', 'selector': '#filter', 'text': 'ai'})
        observed = await tools.execute({'action': 'observe'})
        ref = next(e['ref'] for e in observed['elements'] if e['name'] == 'Show details')
        await tools.execute({'action': 'click', 'ref': ref, 'selector': '#expand'})
        await tools.execute({'action': 'wait', 'selector': '#details'})
        assert 'AI Engineer' in (await tools.execute({'action': 'extract', 'selector': '#details'}))['text']
        await tools.execute({'action': 'scroll', 'pixels': -300})
        await tools.execute({'action': 'click', 'selector': '#next'})
        assert (await tools.execute({'action': 'observe'}))['title'] == 'Next'
        await tools.execute({'action': 'back'})
        assert 'AI jobs' not in str(tools.records)
        assert all(method == 'GET' for _, method in transport.requests)


@pytest.mark.asyncio
@pytest.mark.parametrize('action,code', [
    ({'action': 'navigate', 'url': 'https://outside.example/'}, 'REDIRECT_SCOPE'),
    ({'action': 'navigate', 'url': 'https://research.example/blocked'}, 'ROBOTS_DISALLOWED'),
    ({'action': 'navigate', 'url': 'https://research.example/challenge'}, 'ACCESS_BARRIER'),
    ({'action': 'fill', 'selector': '#q', 'text': 'never logged'}, 'BROWSER_INPUT_APPROVAL'),
    ({'action': 'screenshot'}, 'BROWSER_VISION_CONSENT'),
])
async def test_browser_policy_failures_are_structured(action, code):
    async with browser_tools(Transport(), ['research.example']) as tools:
        await tools.execute({'action': 'navigate', 'url': 'https://research.example/'})
        result = await tools.call(action)
        assert not result['ok'] and result['error']['code'] == code
        assert 'never logged' not in str(tools.records)


@pytest.mark.asyncio
async def test_browser_blocks_post_and_budget_and_never_executes_source_code():
    transport = Transport()
    async with browser_tools(transport, ['research.example'], click_selectors=['#write']) as tools:
        await tools.execute({'action': 'navigate', 'url': 'https://research.example/'})
        result = await tools.call({'action': 'click', 'selector': '#write'})
        assert not result['ok'] and result['error']['code'] == 'BROWSER_WRITE_BLOCKED'
        assert not any(url.endswith('/save') for url, _ in transport.requests)
        assert not (await tools.call({'action': 'evaluate', 'text': 'arbitrary source'}))['ok']
    async with browser_tools(transport, ['research.example'], max_actions=1) as tools:
        await tools.execute({'action': 'navigate', 'url': 'https://research.example/'})
        with pytest.raises(Problem, match='allowance'):
            await tools.execute({'action': 'observe'})
    assert BrowserToolkit.tool_definition()['parameters']['properties']['action']


def test_recipe_requires_stable_targets_and_rejects_unknown_actions():
    from pydantic import ValidationError
    from daleel.schemas import RecipePatch
    payload = {'sampleUrl': 'https://research.example/', 'selector': '#details', 'changeSummary': 'Read details'}
    assert RecipePatch(**payload, browserSteps=[{'action': 'click', 'selector': '#expand'}]).browserSteps
    for step in [{'action': 'click', 'ref': 'e1'}, {'action': 'evaluate'}, {'action': 'screenshot'}]:
        with pytest.raises(ValidationError):
            RecipePatch(**payload, browserSteps=[step])


@pytest.mark.asyncio
async def test_planner_adapter_records_replayable_steps_and_rejects_reference_spoofing():
    async with browser_tools(Transport(), ['research.example'], click_selectors=['#expand']) as tools:
        decisions = iter([{'action': 'click', 'selector': '#expand'}, {'action': 'wait', 'selector': '#details'}, None])

        async def decide(observation, last_result):
            assert observation['url'].startswith('https://research.example')
            return next(decisions)

        result = await tools.run('https://research.example/', decide)
        assert len(result['proposedSteps']) == 2
        assert all('text' not in s for s in result['proposedSteps'])
        observation = await tools.execute({'action': 'observe'})
        ref = next(e['ref'] for e in observation['elements'] if e['selector'] == '#write')
        rejected = await tools.call({'action': 'click', 'ref': ref, 'selector': '#expand'})
        assert rejected['error']['code'] == 'BROWSER_STALE_REF'


@pytest.mark.asyncio
async def test_browser_enforces_transfer_time_and_transient_screenshot_limits():
    async with browser_tools(Transport(), ['research.example'], max_bytes=10) as tools:
        rejected = await tools.call({'action': 'navigate', 'url': 'https://research.example/'})
        assert rejected['error']['code'] == 'DOWNLOAD_CAP'
    async with browser_tools(Transport(), ['research.example'], seconds=0) as tools:
        assert (await tools.call({'action': 'observe'}))['error']['code'] == 'BROWSER_LIMIT'
    async with browser_tools(Transport(), ['research.example'], allow_screenshots=True) as tools:
        await tools.execute({'action': 'navigate', 'url': 'https://research.example/'})
        screenshot = await tools.execute({'action': 'screenshot'})
        assert screenshot['mimeType'] == 'image/jpeg' and screenshot['base64']
        assert 'base64' not in str(tools.records)
