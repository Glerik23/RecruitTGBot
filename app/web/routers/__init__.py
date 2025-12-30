from .candidate import router as candidate_router
from .hr import router as hr_router
from .analyst import router as analyst_router
from .director import router as director_router
from .interviewer import router as interviewer_router

__all__ = ["candidate_router", "hr_router", "analyst_router", "director_router", "interviewer_router"]
