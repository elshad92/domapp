"""
DomApp - small Supabase REST client used by the backend.

The app intentionally talks to Supabase through PostgREST because supabase-py
was problematic on the original Windows/Python setup. Keep this wrapper aligned
with the subset of the supabase-py query API used in routers.
"""

from __future__ import annotations

import logging
import os
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


@dataclass
class QueryResult:
    data: Any

    def __getitem__(self, key: str) -> Any:
        if key == "data":
            return self.data
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        return self.data if key == "data" else default


def _headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    if extra:
        headers.update(extra)
    return headers


def _table_url(table: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{table}"


def _csv(values: list[Any]) -> str:
    return ",".join(str(v) for v in values)


class SupabaseClient:
    def __init__(self) -> None:
        self._http = httpx.Client(timeout=15)

    def table(self, name: str) -> "_TableQuery":
        return _TableQuery(self._http, name)


class _TableQuery:
    def __init__(self, http: httpx.Client, table: str) -> None:
        self._http = http
        self._table = table
        self._filters: list[tuple[str, str]] = []
        self._select_query = "*"
        self._order_col: str | None = None
        self._order_desc = False
        self._limit_val: int | None = None
        self._single = False
        self._mode = "select"
        self._payload: dict[str, Any] | list[dict[str, Any]] | None = None

    def select(self, query: str = "*") -> "_TableQuery":
        self._select_query = query
        self._mode = "select"
        return self

    def maybe_single(self) -> "_TableQuery":
        self._single = True
        self._limit_val = 1
        return self

    def single(self) -> "_TableQuery":
        return self.maybe_single()

    def insert(self, data: dict[str, Any] | list[dict[str, Any]]) -> "_TableQuery":
        self._mode = "insert"
        self._payload = data
        return self

    def update(self, data: dict[str, Any]) -> "_TableQuery":
        self._mode = "update"
        self._payload = data
        return self

    def delete(self) -> "_TableQuery":
        self._mode = "delete"
        return self

    def eq(self, column: str, value: Any) -> "_TableQuery":
        self._filters.append((column, f"eq.{value}"))
        return self

    def in_(self, column: str, values: list[Any]) -> "_TableQuery":
        self._filters.append((column, f"in.({_csv(values)})"))
        return self

    def gte(self, column: str, value: Any) -> "_TableQuery":
        self._filters.append((column, f"gte.{value}"))
        return self

    def lte(self, column: str, value: Any) -> "_TableQuery":
        self._filters.append((column, f"lte.{value}"))
        return self

    def order(self, column: str, desc: bool = False) -> "_TableQuery":
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "_TableQuery":
        self._limit_val = n
        return self

    def _params(self) -> dict[str, str]:
        params = {"select": self._select_query}
        for column, condition in self._filters:
            params[column] = condition
        if self._order_col:
            params["order"] = f"{self._order_col}.desc" if self._order_desc else self._order_col
        if self._limit_val is not None:
            params["limit"] = str(self._limit_val)
        return params

    def execute(self) -> QueryResult:
        url = _table_url(self._table)
        params = self._params()

        try:
            if self._mode == "insert":
                resp = self._http.post(
                    url,
                    headers=_headers(),
                    params={"select": self._select_query},
                    json=self._payload,
                )
            elif self._mode == "update":
                resp = self._http.patch(url, headers=_headers(), params=params, json=self._payload)
            elif self._mode == "delete":
                resp = self._http.delete(url, headers=_headers(), params=params)
            else:
                resp = self._http.get(url, headers=_headers(), params=params)

            resp.raise_for_status()
            data = [] if self._mode == "delete" or not resp.content else resp.json()
            if self._single:
                data = data[0] if data else None
            return QueryResult(data=data)
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            if status == 404:
                logger.warning("Supabase table '%s' not found (404) at %s — table may not exist yet", self._table, url)
            elif status == 406:
                logger.warning("Supabase table '%s' returned 406 at %s — column may not exist", self._table, url)
            else:
                logger.error(
                    "Supabase %s %s (table=%s): %s %s",
                    self._mode,
                    url,
                    self._table,
                    status,
                    exc.response.text,
                )
            return QueryResult(data=[])
        except httpx.RequestError as exc:
            logger.error("Supabase request failed: %s", exc)
            return QueryResult(data=[])


_client: SupabaseClient | None = None


def get_supabase() -> SupabaseClient:
    global _client
    if _client is None:
        if (
            not SUPABASE_URL
            or not SUPABASE_SERVICE_KEY
            or "CHANGE_ME_" in SUPABASE_URL
            or SUPABASE_SERVICE_KEY.startswith("CHANGE_ME_")
        ):
            logger.warning("Supabase not configured — using mock client for development")
            return _MockSupabaseClient()
        _client = SupabaseClient()
        logger.info("Supabase REST client initialized")
    return _client


class _MockSupabaseClient:
    """Mock client that returns empty data for all operations (development only)."""

    def table(self, name: str) -> "_MockTableQuery":
        return _MockTableQuery()


class _MockTableQuery:
    def select(self, query: str = "*") -> "_MockTableQuery":
        return self
    def maybe_single(self) -> "_MockTableQuery":
        return self
    def single(self) -> "_MockTableQuery":
        return self
    def insert(self, data: Any) -> "_MockTableQuery":
        return self
    def update(self, data: Any) -> "_MockTableQuery":
        return self
    def delete(self) -> "_MockTableQuery":
        return self
    def eq(self, column: str, value: Any) -> "_MockTableQuery":
        return self
    def in_(self, column: str, values: list[Any]) -> "_MockTableQuery":
        return self
    def gte(self, column: str, value: Any) -> "_MockTableQuery":
        return self
    def lte(self, column: str, value: Any) -> "_MockTableQuery":
        return self
    def order(self, column: str, desc: bool = False) -> "_MockTableQuery":
        return self
    def limit(self, n: int) -> "_MockTableQuery":
        return self
    def execute(self) -> QueryResult:
        return QueryResult(data=[])
