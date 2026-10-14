"""Real Chromium with deterministic model replies; no provider credentials."""
from types import SimpleNamespace

import pytest

from daleel.browser import render_page
from daleel.browser_planner import BrowserPlanner, BrowserReview
from daleel.browser_tools import browser_tools
from daleel.errors import Problem
from test_browser_tools import Transport


RUN = {"id": "synthetic-run", "query": "Find AI Engineer", "plan": {"fields": []}}


class Models:
    available = True

    def __init__(self, *decisions):
        self.decisions, self.calls = iter(decisions), []

    async def structured(self, wid, rid, purpose, system, data, schema, **kwargs):
        self.calls.append((wid, rid, purpose, data))
        return schema.model_validate(next(self.decisions))


@pytest.mark.asyncio
async def test_model_browser_stops_and_keeps_scope_and_budget_context():
    models = Models({"action": "scroll", "pixels": 300}, {"action": "done"})
    checks = []
    result = await render_page(Transport(), {"url": "https://research.example/"}, ["research.example"],
        planner=(models, "workspace", RUN, lambda: checks.append(True)))
    assert result["rendered"] and len(checks) == 4
    assert 'AI Engineer in Cairo' not in result['visibleText']
    assert [r["action"] for r in result["browserTrace"]] == ["navigate", "scroll"]
    assert all(c[:3] == ("workspace", RUN["id"], "browser_planning") for c in models.calls)
    assert "cookies" not in str(models.calls) and "storage_state" not in str(models.calls)


@pytest.mark.asyncio
async def test_model_cannot_grant_click_permission_and_proposes_stable_review_step():
    async with browser_tools(Transport(), ["research.example"]) as tools:
        observation = await tools.execute({"action": "navigate", "url": "https://research.example/"})
        expand = next(e for e in observation["elements"] if e["selector"] == "#expand")
        planner = BrowserPlanner(Models({"action": "click", "ref": expand["ref"]}), "workspace", RUN, tools)
        with pytest.raises(BrowserReview) as error:
            await planner.decide(observation, None)
        assert error.value.steps[-1]["selector"] == "#expand"
        assert "ref" not in error.value.steps[-1]
        assert not await tools.page.locator("#details").is_visible()
        assert not tools.click_selectors


@pytest.mark.asyncio
async def test_model_navigation_stays_on_durable_frontier_and_hallucinated_refs_fail():
    async with browser_tools(Transport(), ["research.example"]) as tools:
        observation = await tools.execute({"action": "navigate", "url": "https://research.example/"})
        link = next(e for e in observation["elements"] if e["href"])
        models = Models({"action": "click", "ref": link["ref"]}, {"action": "fill", "ref": "invented", "text": "oops"})
        planner = BrowserPlanner(models, "workspace", RUN, tools)
        assert await planner.decide(observation, None) is None
        with pytest.raises(Problem) as error:
            await planner.decide(observation, None)
        assert error.value.code == "BROWSER_DECISION"
        assert tools.page.url == "https://research.example/"


@pytest.mark.asyncio
async def test_model_call_count_and_repeated_actions_are_bounded():
    tools = SimpleNamespace(replay_steps=[])
    observation = {"url": "https://research.example/", "title": "Title", "text": "Text", "elements": []}
    models = Models(*[{"action": "scroll", "pixels": i} for i in range(5)])
    planner = BrowserPlanner(models, "workspace", RUN, tools)
    for _ in range(4):
        assert await planner.decide(observation, None)
    assert await planner.decide(observation, None) is None
    assert len(models.calls) == 4
    planner = BrowserPlanner(Models(*[{"action": "scroll"}] * 2), "workspace", RUN, tools)
    assert await planner.decide(observation, None)
    assert await planner.decide(observation, None) is None


@pytest.mark.asyncio
async def test_model_respects_cancellation_and_provider_budget_errors():
    def cancelled():
        raise Problem(409, "RUN_INTERRUPTED", "Run paused")
    models = Models({"action": "done"})
    planner = BrowserPlanner(models, "workspace", RUN, None, cancelled)
    with pytest.raises(Problem) as error:
        await planner.decide({}, None)
    assert error.value.code == "RUN_INTERRUPTED" and not models.calls

    class Exhausted:
        async def structured(self, *args, **kwargs):
            raise Problem(409, "AI_CAP_REACHED", "Budget exhausted")
    planner = BrowserPlanner(Exhausted(), "workspace", RUN, None)
    with pytest.raises(Problem) as error:
        await planner.decide({"url": "https://research.example/", "title": "", "text": "", "elements": []}, None)
    assert error.value.code == "AI_CAP_REACHED"


@pytest.mark.asyncio
async def test_barriers_prevent_model_disclosure():
    models = Models({"action": "done"})
    with pytest.raises(Problem) as error:
        await render_page(Transport(), {"url": "https://research.example/challenge"}, ["research.example"],
            planner=(models, "workspace", RUN, None))
    assert error.value.code == "ACCESS_BARRIER" and not models.calls


@pytest.mark.asyncio
@pytest.mark.parametrize("markup,action,code", [
    ('<input id="otp" autocomplete="off">', 'fill', 'ACCESS_BARRIER'),
    ('<button id="delete">Delete account</button>', 'click', 'BROWSER_WRITE_BLOCKED'),
])
async def test_unsafe_controls_cannot_be_proposed(markup, action, code):
    async with browser_tools(Transport(), ["research.example"]) as tools:
        await tools.execute({"action": "navigate", "url": "https://research.example/"})
        await tools.page.locator("body").evaluate("(body, markup) => body.innerHTML = markup", markup)
        observation = await tools.observe()
        planner = BrowserPlanner(Models({"action": action, "ref": observation["elements"][0]["ref"], "text": "query"}),
                                 "workspace", RUN, tools)
        with pytest.raises(Problem) as error:
            await planner.decide(observation, None)
        assert error.value.code == code
