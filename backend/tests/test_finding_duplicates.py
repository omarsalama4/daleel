from copy import deepcopy

from daleel.agents import same_finding


def finding(**fields):
    return {"status": "relevant", "sourceUrl": "https://example.org/jobs/1",
            "values": {k: {"value": v, "evidenceState": "verified"} for k, v in fields.items()}}


def test_opportunity_identity_normalizes_tracking_and_keeps_distinct_jobs():
    a = finding(title="AI Engineer", employer="Example", location="Cairo",
                applicationUrl="https://example.org/apply?id=1&utm_source=board")
    b = deepcopy(a)
    b["sourceUrl"] = "https://board.example.org/123"
    b["values"]["applicationUrl"]["value"] = "https://example.org/apply?id=1#apply"
    assert same_finding(a, b)
    b["values"]["applicationUrl"]["value"] = "https://example.org/apply?id=2"
    assert not same_finding(a, b)
    b["values"]["applicationUrl"]["value"] = "https://example.org/apply?id=1"
    b["values"]["employer"]["evidenceState"] = "unknown"
    assert not same_finding(a, b)


def test_generic_same_source_duplicates_require_identical_supported_fields():
    a = finding(title="Scholarship", description="Full tuition")
    b = deepcopy(a)
    b["sourceUrl"] += "?utm_campaign=source"
    assert same_finding(a, b)
    b["values"]["description"]["value"] = "Half tuition"
    assert not same_finding(a, b)
    assert not same_finding(finding(), finding())


def test_duplicate_records_never_become_group_roots():
    a = finding(title="AI Engineer", employer="Example", location="Cairo", description="Build models")
    b = deepcopy(a)
    a["status"] = "duplicate"
    assert not same_finding(a, b)
