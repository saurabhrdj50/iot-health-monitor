"""Backend package bootstrap for optional workspace-managed runtime deps."""

from __future__ import annotations

import sys
from pathlib import Path


def _inject_local_dependency_path() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    workspace_deps = repo_root / ".runtime_deps"
    if workspace_deps.exists():
        workspace_path = str(workspace_deps)
        if workspace_path not in sys.path:
            sys.path.insert(0, workspace_path)


_inject_local_dependency_path()
