"""
DomApp — Push Notification Service
Поддержка FCM (Firebase Cloud Messaging) и Expo Push Notifications

Для FCM: требуется firebase-admin SDK и serviceAccountKey.json
Для Expo: используется Expo Push API (не требует нативного SDK)
"""

import os
import json
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# === Expo Push ===
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_expo_push(
    push_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """
    Отправить push-уведомление через Expo Push API.
    push_token — Expo Push Token (ExponentPushToken[xxxxxxxxxx]).
    """
    if not push_token or not push_token.startswith("ExponentPushToken"):
        logger.warning("Invalid Expo push token: %s", push_token)
        return False

    payload = {
        "to": push_token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
    }
    if data:
        payload["data"] = data

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                logger.info("Expo push sent to %s: %s", push_token[:20], title)
                return True
            else:
                logger.error("Expo push error: %s %s", resp.status_code, resp.text)
                return False
    except Exception as e:
        logger.error("Expo push exception: %s", e)
        return False


# === FCM (Firebase Cloud Messaging) ===

FCM_ENABLED = False
_fcm_app = None


def init_fcm() -> bool:
    """
    Инициализировать Firebase Admin SDK.
    Требует переменную окружения FCM_SERVICE_ACCOUNT_JSON (путь к JSON-файлу).
    """
    global FCM_ENABLED, _fcm_app
    try:
        import firebase_admin
        from firebase_admin import credentials

        service_account_path = os.getenv("FCM_SERVICE_ACCOUNT_JSON", "")
        if not service_account_path or not os.path.exists(service_account_path):
            logger.warning("FCM_SERVICE_ACCOUNT_JSON not configured — FCM disabled")
            FCM_ENABLED = False
            return False

        cred = credentials.Certificate(service_account_path)
        _fcm_app = firebase_admin.initialize_app(cred)
        FCM_ENABLED = True
        logger.info("Firebase Admin SDK initialized")
        return True
    except ImportError:
        logger.warning("firebase-admin not installed — FCM disabled")
        FCM_ENABLED = False
        return False
    except Exception as e:
        logger.error("FCM init error: %s", e)
        FCM_ENABLED = False
        return False


async def send_fcm_push(
    fcm_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """
    Отправить push-уведомление через Firebase Cloud Messaging.
    fcm_token — FCM registration token (с устройства).
    """
    if not FCM_ENABLED:
        logger.warning("FCM not initialized — cannot send push")
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=fcm_token,
            data={k: str(v) for k, v in (data or {}).items()},
        )
        response = messaging.send(message)
        logger.info("FCM push sent: %s", response)
        return True
    except Exception as e:
        logger.error("FCM push error: %s", e)
        return False


# === Универсальная отправка ===


async def send_push(
    push_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """
    Универсальная отправка push-уведомления.
    Автоматически определяет тип токена (Expo или FCM).
    """
    if push_token.startswith("ExponentPushToken"):
        return await send_expo_push(push_token, title, body, data)
    else:
        return await send_fcm_push(push_token, title, body, data)


# === Push-уведомления для событий ===


async def notify_request_status_change(
    push_token: str,
    request_id: int,
    category: str,
    new_status: str,
    comment: Optional[str] = None,
):
    """Уведомить жильца об изменении статуса заявки."""
    status_names = {
        "new": "Новая",
        "in_progress": "В работе",
        "done": "Выполнена",
        "cancelled": "Отменена",
    }
    name = status_names.get(new_status, new_status)
    title = f"Заявка #{request_id}"
    body = f"Статус изменён на «{name}»"
    if comment:
        body += f"\n💬 {comment}"

    data = {
        "type": "request_status",
        "request_id": str(request_id),
        "status": new_status,
    }
    await send_push(push_token, title, body, data)


async def notify_new_announcement(
    push_token: str,
    building_address: str,
    announcement_text: str,
):
    """Уведомить жильца о новом объявлении."""
    title = f"📢 Новое объявление — {building_address}"
    body = announcement_text[:150] + ("..." if len(announcement_text) > 150 else "")
    data = {"type": "announcement"}
    await send_push(push_token, title, body, data)


async def notify_payment_reminder(
    push_token: str,
    amount: float,
    period: str,
):
    """Напомнить жильцу о платеже."""
    title = "💳 Напоминание об оплате"
    body = f"Задолженность за {period}: {amount:,.0f} сум"
    data = {"type": "payment_reminder", "period": period}
    await send_push(push_token, title, body, data)
