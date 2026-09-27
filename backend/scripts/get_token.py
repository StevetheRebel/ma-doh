"""Sign in directly with Supabase; print only the access token to stdout.

Run: uv run python scripts/get_token.py --email you@example.com
Create the user in your Supabase dashboard first (or use your frontend signup).
The password is prompted privately and is sent only to Supabase Auth.
"""

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402

from app.config import settings  # noqa: E402


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    args = parser.parse_args()
    config = settings()
    if not config.supabase_url or not config.supabase_publishable_key:
        parser.error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env first.")
    password = getpass.getpass("Supabase account password: ")
    try:
        response = httpx.post(
            f"{config.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password",
            headers={"apikey": config.supabase_publishable_key},
            json={"email": args.email, "password": password},
            timeout=20,
        )
        if response.status_code != 200:
            parser.exit(
                1, "Sign-in failed. Check the credentials and email confirmation in Supabase.\n"
            )
        data = response.json()
        print(f"Signed in. Token expires in {data['expires_in']} seconds.", file=sys.stderr)
        print(data["access_token"])
    except (httpx.HTTPError, KeyError, ValueError):
        parser.exit(
            1, "Could not sign in with Supabase. Check the project configuration and network.\n"
        )


if __name__ == "__main__":
    main()
