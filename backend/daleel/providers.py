import json
import math
import httpx
from pydantic import BaseModel
from opentelemetry import trace
from .errors import Problem

tracer = trace.get_tracer("daleel.ai")


class Models:
    def __init__(self, settings, budget):
        self.settings, self.budget = settings, budget

    @property
    def available(self):
        s = self.settings
        return bool((s.groq_api_key and s.groq_model) or (s.openrouter_api_key and s.openrouter_model))

    async def structured(self, wid, run_id, purpose, system, data, schema: type[BaseModel], max_tokens=1800):
        s = self.settings
        routes = [("groq", s.groq_api_key, s.groq_model, "https://api.groq.com/openai/v1/chat/completions"),
                  ("openrouter_free", s.openrouter_api_key, s.openrouter_model,
                   "https://openrouter.ai/api/v1/chat/completions")]
        payload_text = json.dumps(data, ensure_ascii=False)
        # Upper bound uses UTF-8 bytes (at least one token per byte) and output token ceiling.
        system_text = system + " Return only valid JSON matching this schema: " + json.dumps(schema.model_json_schema())
        input_bound = len((system_text + payload_text).encode("utf-8")) + 1000
        for name, key, model, url in routes:
            if not key or not model:
                continue
            price_in = 0 if name == "openrouter_free" else s.ai_input_usd_per_million
            price_out = 0 if name == "openrouter_free" else s.ai_output_usd_per_million
            estimate = (input_bound * price_in + max_tokens * price_out) / 1e6
            reservation = self.budget.reserve(wid, run_id, name, estimate, purpose)
            messages = [{"role": "system", "content": system_text}, {"role": "user", "content": payload_text}]
            body = {"model": model, "messages": messages, "temperature": 0, "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"}}
            if name == "openrouter_free":
                body["provider"] = {"allow_fallbacks": False, "data_collection": "deny"}
            try:
                with tracer.start_as_current_span("model." + purpose) as span:
                    span.set_attribute("provider", name)
                    span.set_attribute("run.id", run_id)
                    async with httpx.AsyncClient(timeout=45, trust_env=False) as client:
                        response = await client.post(url, headers={"Authorization": "Bearer " + key}, json=body)
                    if response.status_code in (400, 401, 403, 404, 429):
                        self.budget.settle(wid, reservation, 0, {"httpStatus": response.status_code}, rejected=True)
                        continue
                    response.raise_for_status()
                    result = response.json()
                    usage = result.get("usage", {})
                    if not {"prompt_tokens", "completion_tokens"}.issubset(usage):
                        self.budget.settle(wid, reservation, None, {"usageMissing": True})
                    else:
                        actual = (usage["prompt_tokens"] * price_in + usage["completion_tokens"] * price_out) / 1e6
                        reported = usage.get("cost")
                        if isinstance(reported, (int, float)) and math.isfinite(reported):
                            actual = max(actual, reported)
                        self.budget.settle(wid, reservation, actual, usage)
                    return schema.model_validate_json(result["choices"][0]["message"]["content"])
            except (httpx.HTTPError, ValueError, KeyError, IndexError):
                # Timeouts and ambiguous 5xx may be billed; hold the reservation rather than refund it.
                self.budget.settle(wid, reservation, None, {"providerOutcome": "uncertain"})
                continue
        raise Problem(503, "MODEL_UNAVAILABLE", "No configured model route returned a valid structured response", True)


class Search:
    def __init__(self, settings):
        self.settings = settings

    async def discover(self, query):
        if not self.settings.tavily_api_key:
            raise Problem(409, "SEARCH_UNAVAILABLE", "Add seed URLs or configure the search provider")
        async with httpx.AsyncClient(timeout=20, trust_env=False) as client:
            response = await client.post("https://api.tavily.com/search", json={
                "api_key": self.settings.tavily_api_key, "query": query,
                "max_results": 10, "search_depth": "basic", "include_raw_content": False})
        if response.status_code in (429, 432, 433):
            raise Problem(409, "SEARCH_QUOTA", "Search credits are exhausted")
        response.raise_for_status()
        return [x["url"] for x in response.json().get("results", [])]
