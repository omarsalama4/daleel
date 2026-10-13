"""Execute reviewed declarative extraction recipes, never exported source code."""
import copy
from bs4 import BeautifulSoup
from .errors import Problem


def browser_code(site, url, steps, selector):
    """Export declarative tool calls, never code generated from untrusted page text."""
    import json
    inputs = [s["selector"] for s in steps if s["action"] in ("fill", "select")]
    clicks = [s["selector"] for s in steps if s["action"] == "click"]
    return ("# Read-only browser recipe; use Daleel's policy-enforced Fetcher.\n"
        "from daleel.browser_tools import browser_tools\n"
        f"async with browser_tools(fetcher, {repr([site])}, search_selectors={repr(inputs)}, click_selectors={repr(clicks)}) as tools:\n"
        f"    await tools.execute({repr({'action': 'navigate', 'url': url})})\n" +
        "".join(f"    await tools.execute({repr(json.loads(json.dumps(s)))})\n" for s in steps) +
        f"    result = await tools.execute({repr({'action': 'extract', 'selector': selector})})\n")


def apply_recipe(recipe, page):
    selectors = [a["target"] for a in recipe["actions"] if a["type"] == "extract"]
    soup = BeautifulSoup(page["html"], "html.parser")
    if not selectors:
        raise Problem(409, "RECIPE_DRIFT", "Recipe has no approved extraction selector")
    for selector in selectors:
        try:
            matches = soup.select(selector)
        except Exception:
            raise Problem(409, "RECIPE_DRIFT", "Approved extraction selector is invalid") from None
        if not matches or not any(m.get_text(strip=True) for m in matches):
            raise Problem(409, "RECIPE_DRIFT", "Approved extraction target is absent or empty")
    result = copy.deepcopy(page)
    # Keep the full document available for evidence validation and detail link discovery.
    result["recipeId"] = recipe["id"]
    result["recipeText"] = " ".join(m.get_text(" ", strip=True) for s in selectors for m in soup.select(s))[:80000]
    return result
