"""Execute reviewed declarative extraction recipes, never exported source code."""
import copy
from bs4 import BeautifulSoup
from .errors import Problem


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
