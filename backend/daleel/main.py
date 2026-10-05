from .config import get_settings
from .telemetry import configure
from .app import make_app

configure(get_settings())
app = make_app()
