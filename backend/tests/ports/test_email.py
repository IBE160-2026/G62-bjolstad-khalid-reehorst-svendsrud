"""E-mail port (story 1.7): the SMTP adapter with a stubbed smtplib (no network) and the mock."""

import smtplib
import ssl
from typing import Any

import pytest

from app.core.settings import get_settings
from app.ports import email as email_port
from app.ports.email import (
    EmailMessage,
    MockEmailAdapter,
    SmtpEmailAdapter,
    get_email_port,
)

MESSAGE = EmailMessage(to="ola@eksempel.no", subject="Nytt passord til Prompt Force", body="Hei")


class FakeSmtp:
    instances: list["FakeSmtp"] = []
    fail_with: Exception | None = None

    def __init__(self, host: str, port: int, timeout: float) -> None:
        if FakeSmtp.fail_with is not None:
            raise FakeSmtp.fail_with
        self.host, self.port, self.timeout = host, port, timeout
        self.calls: list[tuple[str, Any]] = []
        FakeSmtp.instances.append(self)

    def __enter__(self) -> "FakeSmtp":
        return self

    def __exit__(self, *_: object) -> None:
        self.calls.append(("quit", None))

    def starttls(self, context: ssl.SSLContext | None = None) -> None:
        self.calls.append(("starttls", context))

    def login(self, username: str, password: str) -> None:
        self.calls.append(("login", (username, password)))

    def send_message(self, message: Any) -> None:
        self.calls.append(("send", message))


@pytest.fixture(autouse=True)
def fake_smtp(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeSmtp.instances = []
    FakeSmtp.fail_with = None
    monkeypatch.setattr(smtplib, "SMTP", FakeSmtp)


def test_smtp_adapter_sends_a_plain_text_mail() -> None:
    SmtpEmailAdapter("mailpit", 1025, "Prompt Force <ikke-svar@promptforce.local>").send(MESSAGE)

    (smtp,) = FakeSmtp.instances
    assert (smtp.host, smtp.port) == ("mailpit", 1025)
    assert [name for name, _ in smtp.calls] == ["send", "quit"]
    sent = smtp.calls[0][1]
    assert sent["To"] == "ola@eksempel.no"
    assert sent["Subject"] == "Nytt passord til Prompt Force"
    assert sent["From"] == "Prompt Force <ikke-svar@promptforce.local>"
    assert sent.get_content().strip() == "Hei"


def test_smtp_adapter_uses_starttls_and_login_when_configured() -> None:
    SmtpEmailAdapter("smtp.eksempel.no", 587, "a@b.no", "bruker", "hemmelig", True).send(MESSAGE)

    (smtp,) = FakeSmtp.instances
    assert [name for name, _ in smtp.calls] == ["starttls", "login", "send", "quit"]
    assert smtp.calls[1][1] == ("bruker", "hemmelig")
    # The server certificate and host name are verified.
    context = smtp.calls[0][1]
    assert isinstance(context, ssl.SSLContext)
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True


@pytest.mark.parametrize(
    "error",
    [
        ConnectionRefusedError(),
        smtplib.SMTPException("nei"),
        TimeoutError(),
        ValueError("ola@eksempel.no"),
        UnicodeError("ola@eksempel.no"),
    ],
)
def test_smtp_failure_is_logged_without_details_and_not_raised(
    error: Exception, caplog: pytest.LogCaptureFixture
) -> None:
    FakeSmtp.fail_with = error

    SmtpEmailAdapter("mailpit", 1025, "a@b.no").send(MESSAGE)

    assert "could not be sent" in caplog.text
    assert "ola@eksempel.no" not in caplog.text
    assert "Hei" not in caplog.text


def test_mock_adapter_records_and_sends_nothing() -> None:
    adapter = MockEmailAdapter()

    adapter.send(MESSAGE)

    assert adapter.sent == [MESSAGE]
    assert FakeSmtp.instances == []


def test_port_follows_email_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_MODE", "mock")
    get_settings.cache_clear()
    try:
        assert isinstance(get_email_port(), MockEmailAdapter)
        assert get_email_port() is email_port._mock_adapter()
        monkeypatch.setenv("EMAIL_MODE", "smtp")
        get_settings.cache_clear()
        assert isinstance(get_email_port(), SmtpEmailAdapter)
    finally:
        get_settings.cache_clear()
