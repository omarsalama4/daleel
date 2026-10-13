from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlalchemy.exc import OperationalError

from daleel.db import Database


def database(monkeypatch, failure, failures):
    result = object.__new__(Database)
    result.settings = SimpleNamespace(env="production")
    result.engine = Mock()
    result.verify_production_boundary = Mock(side_effect=[failure] * failures + [None])
    sleep = Mock()
    monkeypatch.setattr("daleel.db.time.sleep", sleep)
    return result, sleep


def test_database_admin_shutdown_retries_fresh_read_only_startup(monkeypatch):
    failure = OperationalError("startup check", {}, SimpleNamespace(sqlstate="57P01"))
    result, sleep = database(monkeypatch, failure, 2)
    result.init()
    assert result.verify_production_boundary.call_count == 3
    assert result.engine.dispose.call_count == 2
    assert [c.args[0] for c in sleep.call_args_list] == [1, 2]


def test_database_startup_retry_is_bounded(monkeypatch):
    failure = OperationalError("startup check", {}, SimpleNamespace(sqlstate="57P01"))
    result, sleep = database(monkeypatch, failure, 3)
    with pytest.raises(OperationalError):
        result.init()
    assert result.verify_production_boundary.call_count == 3
    assert sleep.call_count == 2


@pytest.mark.parametrize("failure", [
    RuntimeError("Workspace RLS migration is required"),
    OperationalError("startup check", {}, SimpleNamespace(sqlstate="28P01")),
])
def test_security_and_authentication_failures_are_not_retried(monkeypatch, failure):
    result, sleep = database(monkeypatch, failure, 1)
    with pytest.raises(type(failure)):
        result.init()
    assert result.verify_production_boundary.call_count == 1
    sleep.assert_not_called()
