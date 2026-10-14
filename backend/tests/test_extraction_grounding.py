import pytest

from daleel.agents import Extracted, extract_page


@pytest.mark.asyncio
async def test_detail_extraction_requests_literal_values_and_retains_source_paragraph():
    paragraph = "Build reliable AI services. Work with the platform team in Cairo."

    class Models:
        available = True

        async def structured(self, wid, rid, purpose, system, data, schema, **kwargs):
            assert "one contiguous substring" in system
            assert "Do not paraphrase" in system
            assert "informative source paragraph verbatim" in system
            return Extracted(fields={"description": {"value": paragraph, "excerpt": paragraph}},
                             relevance="strong", reason="The source describes the requested engineering work.")

    page = {"title": "AI Engineer", "text": paragraph, "structured": [],
            "url": "https://example.org/jobs/1", "language": "en", "direction": "ltr"}
    run = {"id": "run", "query": "Find AI Engineer opportunities", "aiUsageCapUsd": .25,
           "relevance": "balanced", "plan": {"fields": [
               {"key": "description", "required": True}]}}
    result = await extract_page(Models(), "workspace", run, page)
    assert result["status"] == "relevant"
    assert result["values"]["description"]["value"] == paragraph
    assert result["values"]["description"]["evidenceState"] == "verified"
    assert result["evidence"][0]["excerpt"] == paragraph


@pytest.mark.asyncio
async def test_worker_recipe_reuse_fails_closed_on_missing_required_evidence():
    from types import SimpleNamespace
    from daleel.errors import Problem
    run = {"id": "run", "query": "AI Engineer", "aiUsageCapUsd": 0, "relevance": "balanced",
           "plan": {"fields": [{"key": "employer", "required": True}]}}
    page = {"recipeId": "recipe", "title": "AI Engineer", "text": "AI Engineer", "structured": [],
            "url": "https://example.org/jobs/1", "language": "en", "direction": "ltr"}
    with pytest.raises(Problem) as error:
        await extract_page(SimpleNamespace(available=False), "workspace", run, page)
    assert error.value.code == "RECIPE_DRIFT"
