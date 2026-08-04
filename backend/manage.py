#!/usr/bin/env python
import os
import subprocess
import sys
from pathlib import Path


def _project_venv_python():
    backend_dir = Path(__file__).resolve().parent
    repo_root = backend_dir.parent
    candidate = repo_root / ".venv" / "Scripts" / "python.exe"
    if candidate.exists():
        return candidate
    return None


def _ensure_project_python():
    venv_python = _project_venv_python()
    if not venv_python:
        return

    current_python = Path(sys.executable).resolve()
    if current_python == venv_python.resolve():
        return

    if os.environ.get("ACADEMIC_PERFORMANCE_VENV_BOOTSTRAPPED") == "1":
        return

    env = os.environ.copy()
    env["ACADEMIC_PERFORMANCE_VENV_BOOTSTRAPPED"] = "1"
    raise SystemExit(subprocess.call([str(venv_python), *sys.argv], env=env))


def main():
    _ensure_project_python()
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "academic_predictor.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and available on your "
            "PYTHONPATH environment variable? Did you forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
