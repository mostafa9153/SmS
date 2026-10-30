import os
import re
import time
import math
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal, Any
from ortools.sat.python import cp_model
from concurrent.futures import ThreadPoolExecutor

from routine_models import *  # noqa: F401,F403
from routine_plan import *  # noqa: F401,F403
from routine_phase import *  # noqa: F401,F403
from routine_diagnostics import *  # noqa: F401,F403
from routine_schedule import *  # noqa: F401,F403
from routine_diagnostics import _sec_norm  # noqa: F401
from routine_models import _day_name  # noqa: F401

app = FastAPI(title="Routine Forge Pro - Python Backend")

# The browser never calls this server directly (the Next.js API route proxies it), so CORS stays narrow.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ROUTINE_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

@app.post("/diagnose")
def diagnose(request: GenerateRoutineRequest):
    """Fast counting checks (no solving): which strict rules are provably impossible, and what the engine adapts."""
    try:
        return generate_schedule(request, diagnose_only=True)
    except Exception as e:
        return {"success": False, "reasons": [], "adjustments": [], "error": f"Backend Error: {str(e)}"}


@app.post("/generate-routine")
def generate_routine(request: GenerateRoutineRequest):
    try:
        result = generate_schedule(request)
        return result
    except Exception as e:
        return {
            "success": False,
            "diagnostics": [f"Backend Error: {str(e)}"]
        }
