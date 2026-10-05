"""Create ignored local environment files without printing the development credential."""
import secrets
from pathlib import Path
from cryptography.fernet import Fernet

root = Path(__file__).resolve().parents[2]
env = root / '.env'
if not env.exists():
    token = secrets.token_urlsafe(40)
    env.write_text('DALEEL_ENV=development\nDALEEL_AUTH_MODE=development\n'
                   f'DALEEL_DEV_TOKEN={token}\nDALEEL_DEV_EMAIL=owner@daleel.local\n'
                   'DALEEL_OPERATOR_EMAILS=owner@daleel.local\n'
                   f'DALEEL_SESSION_ENCRYPTION_KEY={Fernet.generate_key().decode()}\n', encoding='utf-8')
    frontend_env = root / 'frontend' / '.env.local'
    if not frontend_env.exists():
        frontend_env.write_text(f'VITE_AUTH_MODE=development\nVITE_DEV_TOKEN={token}\nVITE_DEMO_MODE=false\n', encoding='utf-8')
    print('Created local development configuration. Credentials are not printed.')
else:
    print('Existing local configuration preserved.')
