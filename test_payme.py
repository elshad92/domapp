"""
DomApp — Payme интеграция тест
Запуск: python test_payme.py
Требует: запущенный backend на localhost:8000
"""

import base64
import json
import os
import sys
import urllib.request
import urllib.error

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
PAYME_KEY = os.getenv("PAYME_KEY", "test_key")

# Payme webhook URL
WEBHOOK_URL = f"{BACKEND_URL}/api/v1/payments/webhook"

passed = 0
failed = 0


def call_payme(method: str, params: dict) -> dict:
    """Отправить JSON-RPC запрос на Payme webhook."""
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    }).encode("utf-8")

    # Basic Auth
    credentials = base64.b64encode(f"payme:{PAYME_KEY}".encode()).decode()
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {credentials}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode())
    except Exception as e:
        return {"error": str(e)}


def test(name: str, method: str, params: dict, expected_key: str = "result"):
    global passed, failed
    result = call_payme(method, params)
    if expected_key in result:
        print(f"  ✅ {name}")
        passed += 1
    else:
        error = result.get("error", result)
        print(f"  ❌ {name}: {error}")
        failed += 1


def main():
    global passed, failed
    print("=" * 50)
    print("DomApp — Payme Integration Test")
    print("=" * 50)
    print()

    # 1. CheckPerformTransaction — платёж не найден (неверный resident_id)
    print("1. CheckPerformTransaction:")
    test(
        "Платёж не найден (неверный account)",
        "CheckPerformTransaction",
        {"account": {"resident_id": 999, "period": "2025-01"}},
        expected_key="error",
    )

    # 2. CheckPerformTransaction — платёж существует (если есть тестовые данные)
    print("2. CheckPerformTransaction (если есть данные):")
    test(
        "Платёж существует",
        "CheckPerformTransaction",
        {"account": {"resident_id": 1, "period": "2025-01"}},
        expected_key="result",
    )

    # 3. CreateTransaction — неверная сумма
    print("3. CreateTransaction:")
    test(
        "Неверная сумма",
        "CreateTransaction",
        {
            "id": "test_tx_001",
            "amount": 100,  # 1 сум вместо 50000
            "account": {"resident_id": 1, "period": "2025-01"},
        },
        expected_key="error",
    )

    # 4. CreateTransaction — успешно
    print("4. CreateTransaction (успешно):")
    test(
        "Создание транзакции",
        "CreateTransaction",
        {
            "id": "test_tx_002",
            "amount": 5000000,  # 50000 сум = 5000000 тийин
            "account": {"resident_id": 1, "period": "2025-01"},
        },
        expected_key="result",
    )

    # 5. CheckTransaction — проверить созданную
    print("5. CheckTransaction:")
    test(
        "Проверка транзакции",
        "CheckTransaction",
        {"id": "test_tx_002"},
        expected_key="result",
    )

    # 6. PerformTransaction — выполнить
    print("6. PerformTransaction:")
    test(
        "Выполнение транзакции",
        "PerformTransaction",
        {"id": "test_tx_002"},
        expected_key="result",
    )

    # 7. CancelTransaction — отменить (создадим новую и отменим)
    print("7. CancelTransaction:")
    # Сначала создаём
    call_payme("CreateTransaction", {
        "id": "test_tx_003",
        "amount": 5000000,
        "account": {"resident_id": 1, "period": "2025-01"},
    })
    test(
        "Отмена транзакции",
        "CancelTransaction",
        {"id": "test_tx_003", "reason": 1},
        expected_key="result",
    )

    print()
    print("=" * 50)
    print(f"Результаты: ✅ {passed} passed, ❌ {failed} failed")
    print("=" * 50)

    if failed == 0:
        print("\n✅ Все тесты прошли!")
        return 0
    else:
        print(f"\n❌ {failed} тестов упало")
        return 1


if __name__ == "__main__":
    sys.exit(main())
