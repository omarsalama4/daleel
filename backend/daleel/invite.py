"""Bootstrap the first operator invitation from a trusted deployment terminal."""
import argparse
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from .config import get_settings
from .db import Database, Invitation, uid, now


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--email', required=True)
    args = parser.parse_args()
    settings = get_settings()
    email = args.email.strip().lower()
    if email not in {s.strip().lower() for s in settings.operator_emails.split(',')}:
        parser.error('Bootstrap invitations are limited to configured operator emails')
    database = Database(settings)
    database.init()
    token = secrets.token_urlsafe(32)
    with database.session() as db:
        db.add(Invitation(id=uid(), email=email, token_hash=hashlib.sha256(token.encode()).hexdigest(),
            data={'status': 'pending', 'createdAt': now(), 'deliveryState': 'queued',
                  'expiresAt': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(), 'note': 'Bootstrap operator'}))
    print(settings.frontend_url + '/invite/' + token)


if __name__ == '__main__':
    main()
