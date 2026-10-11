#!/usr/bin/env python3
"""Add the deployed web origin to the existing client without replacing its settings."""

import json
import subprocess
import sys
import uuid
from urllib.parse import urlsplit


def web_patch(client, origin):
    url = urlsplit(origin)
    if (
        url.scheme not in ("http", "https")
        or not url.netloc
        or url.username
        or url.password
        or url.path
        or url.query
        or url.fragment
        or any(char.isspace() for char in origin)
    ):
        raise ValueError("WEB_PUBLIC_URL должен быть одним origin без пути и завершающего /.")
    # Preserve other deployed frontends and local development access.
    origins = ["http://localhost:5173", "http://localhost:3000", origin]
    patch = {}
    for field, values in (
        ("redirectUris", [value + "/*" for value in origins]),
        ("webOrigins", origins),
    ):
        existing = client.get(field, [])
        if not isinstance(existing, list) or not all(isinstance(value, str) for value in existing):
            raise ValueError("Некорректные настройки клиента fsp-web: " + field)
        patch[field] = list(dict.fromkeys(existing + values))
    return patch


def main():
    compose = ["docker", "compose", *sys.argv[1:], "exec", "-T", "keycloak"]
    config = "/tmp/fsp-web-admin-" + uuid.uuid4().hex

    def execute(args, **kwargs):
        return subprocess.run(
            compose + args, check=True, text=True, capture_output=True, **kwargs
        ).stdout

    def kcadm(*args, **kwargs):
        return execute(["/opt/keycloak/bin/kcadm.sh", *args, "--config", config], **kwargs)

    try:
        origin = execute(["printenv", "WEB_PUBLIC_URL"]).strip()
        # Validate before touching client settings or authenticating.
        web_patch({}, origin)
        execute([
            "/bin/bash", "-c",
            'umask 077; /opt/keycloak/bin/kcadm.sh config credentials --config "$1" '
            '--server http://localhost:8080 --realm master '
            '--user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"',
            "fsp-web-auth", config,
        ])
        clients = json.loads(kcadm("get", "clients", "-r", "fsp", "-q", "clientId=fsp-web"))
        clients = [client for client in clients if client.get("clientId") == "fsp-web"]
        if len(clients) != 1:
            raise ValueError("Ожидается один клиент fsp-web в realm fsp.")
        client = clients[0]
        patch = web_patch(client, origin)
        if any(client.get(field) != value for field, value in patch.items()):
            kcadm("update", "clients/" + client["id"], "-r", "fsp", "-f", "-",
                  input=json.dumps(patch))
        print("Адрес фронта разрешён в Keycloak: " + origin)
    finally:
        subprocess.run(compose + ["rm", "-f", config], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=False)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError:
        sys.exit("Не удалось настроить fsp-web: проверьте Keycloak и действующий пароль admin.")
    except (ValueError, KeyError, TypeError) as error:
        sys.exit(str(error))
