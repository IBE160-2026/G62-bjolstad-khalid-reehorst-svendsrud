"""Command-line entry points: `python -m app.cli <command>`."""

import argparse
import logging
import sys

from pydantic import ValidationError

logger = logging.getLogger("app.cli")


def _load_settings():
    from app.core.settings import get_settings

    return get_settings()


def check_config() -> int:
    """Validate settings; exit non-zero with a clear message if unsafe (AD-16)."""
    try:
        settings = _load_settings()
    except ValidationError as exc:
        # Print only the messages, never the input values (they may hold secrets).
        for error in exc.errors():
            field = ".".join(str(part) for part in error["loc"]).upper()
            message = error["msg"].removeprefix("Value error, ")
            if field:
                logger.critical("Startup refused: %s: %s", field, message)
            else:
                logger.critical("Startup refused: %s", message)
        return 1
    logger.info("Configuration OK (APP_ENV=%s)", settings.app_env)
    return 0


def seed() -> int:
    from app.seed.seed import seed_if_empty

    seed_if_empty(_load_settings())
    return 0


COMMANDS = {"check-config": check_config, "seed": seed}


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    parser.add_argument("command", choices=sorted(COMMANDS))
    args = parser.parse_args(argv)
    return COMMANDS[args.command]()


if __name__ == "__main__":
    sys.exit(main())
