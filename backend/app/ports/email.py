"""E-mail port (AD-7): sends plain-text mail through an SMTP or a mock adapter.

`EMAIL_MODE=smtp` (default in Compose) sends to `SMTP_HOST:SMTP_PORT`; locally that is the
Mailpit mail catcher, which keeps every mail in its web inbox and never delivers it.
`EMAIL_MODE=mock` (always in tests) sends nothing and records the mails instead.
"""

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage as MimeMessage
from functools import lru_cache
from typing import Protocol

from app.core.settings import Settings, get_settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 10


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    body: str


class EmailPort(Protocol):
    def send(self, message: EmailMessage) -> None: ...


class SmtpEmailAdapter:
    """Sends over SMTP with the standard library; optional STARTTLS and login.

    A failed send is logged (without address or body, which may hold a reset link) and
    swallowed: the caller has already answered the visitor and must not reveal anything.
    """

    def __init__(
        self,
        host: str,
        port: int,
        sender: str,
        username: str = "",
        password: str = "",
        starttls: bool = False,
    ) -> None:
        self._host = host
        self._port = port
        self._sender = sender
        self._username = username
        self._password = password
        self._starttls = starttls

    def send(self, message: EmailMessage) -> None:
        mime = MimeMessage()
        mime["From"] = self._sender
        mime["To"] = message.to
        mime["Subject"] = message.subject
        mime.set_content(message.body)
        try:
            with smtplib.SMTP(self._host, self._port, timeout=TIMEOUT_SECONDS) as smtp:
                if self._starttls:
                    smtp.starttls(context=ssl.create_default_context())
                if self._username:
                    smtp.login(self._username, self._password)
                smtp.send_message(mime)
        except Exception as error:  # noqa: BLE001 - runs after the response; never leak details
            logger.error("E-mail could not be sent via SMTP: %s", type(error).__name__)


class MockEmailAdapter:
    """Records every mail in `sent`; never touches the network."""

    def __init__(self) -> None:
        self.sent: list[EmailMessage] = []

    def send(self, message: EmailMessage) -> None:
        self.sent.append(message)


def _smtp_adapter(settings: Settings) -> SmtpEmailAdapter:
    return SmtpEmailAdapter(
        host=settings.smtp_host,
        port=settings.smtp_port,
        sender=settings.email_from,
        username=settings.smtp_username,
        password=settings.smtp_password.get_secret_value(),
        starttls=settings.smtp_starttls,
    )


@lru_cache
def _mock_adapter() -> MockEmailAdapter:
    return MockEmailAdapter()


def get_email_port() -> EmailPort:
    """The adapter chosen by EMAIL_MODE; a FastAPI dependency, so tests can override it."""
    settings = get_settings()
    return _smtp_adapter(settings) if settings.email_mode == "smtp" else _mock_adapter()
