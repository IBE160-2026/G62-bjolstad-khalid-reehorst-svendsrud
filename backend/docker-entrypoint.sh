#!/bin/sh
# Refuse to start anything on unsafe configuration (AD-16), then run the command.
set -e
python -m app.cli check-config
exec "$@"
