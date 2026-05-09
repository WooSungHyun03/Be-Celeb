# apps/api/app/api/routes/__init__.py
from .analysis import router as analysis
from .health import router as health
from .recommendations import router as recommendations
from .trends import router as trends
from .main import router as main