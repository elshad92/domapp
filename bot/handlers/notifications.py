"""
Compatibility wrapper for notification helpers shared with the backend.
"""

from backend.services.telegram_notifications import notify_new_announcement, notify_request_status

__all__ = ["notify_new_announcement", "notify_request_status"]
