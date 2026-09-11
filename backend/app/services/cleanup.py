from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
import shutil
import tempfile
import threading
import time
from typing import Dict, List, Optional

from app import store
from app.core.config import SESSION_CLEANUP_INTERVAL_MINUTES
from app.services import vector_store

# Directories managed by OmniVise temporary processing
TEMP_BASE = Path(tempfile.gettempdir())
OMNIVISE_TEMP_DIRS = [
    TEMP_BASE / "omnivise_temp_evidence",
    TEMP_BASE / "omnivise_frames",
    TEMP_BASE / "omnivise_artifacts",
    TEMP_BASE / "omnivise_intermediate",
]

_cleanup_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()


def ensure_temp_directories() -> None:
    """Ensure standard temporary directories exist."""
    for d in OMNIVISE_TEMP_DIRS:
        d.mkdir(parents=True, exist_ok=True)


def purge_filesystem_artifacts(max_age_seconds: Optional[int] = None) -> Dict[str, int]:
    """Delete temporary files, intermediate extraction artifacts, and screen-capture frames.

    If max_age_seconds is specified, only files older than that threshold are deleted.
    Otherwise, all temporary session files are purged.
    """
    deleted_files = 0
    deleted_dirs = 0
    now = time.time()

    # 1. Search specific omnivise directories
    for target_dir in OMNIVISE_TEMP_DIRS:
        if not target_dir.exists():
            continue

        try:
            for item in target_dir.iterdir():
                try:
                    if max_age_seconds is not None:
                        # Check mtime
                        file_age = now - item.stat().st_mtime
                        if file_age < max_age_seconds:
                            continue

                    if item.is_file() or item.is_symlink():
                        item.unlink(missing_ok=True)
                        deleted_files += 1
                    elif item.is_dir():
                        shutil.rmtree(item, ignore_errors=True)
                        deleted_dirs += 1
                except Exception as file_err:
                    print(f"Warning deleting {item}: {file_err}")
        except Exception as dir_err:
            print(f"Warning reading directory {target_dir}: {dir_err}")

    # 2. Search for any other omnivise_temp_* directories in temp base
    try:
        for p in TEMP_BASE.glob("omnivise_temp_*"):
            if p.is_dir() and p not in OMNIVISE_TEMP_DIRS:
                try:
                    for f in p.iterdir():
                        if max_age_seconds is None or (now - f.stat().st_mtime >= max_age_seconds):
                            if f.is_file():
                                f.unlink(missing_ok=True)
                                deleted_files += 1
                            elif f.is_dir():
                                shutil.rmtree(f, ignore_errors=True)
                                deleted_dirs += 1
                except Exception:
                    pass
    except Exception:
        pass

    return {
        "deleted_files": deleted_files,
        "deleted_directories": deleted_dirs,
    }


def purge_session_data(session_id: Optional[str] = None) -> Dict[str, object]:
    """Complete session purge:

    1. Deletes temporary files, intermediate artifacts, and cached screen frames.
    2. Purges ephemeral vector embeddings from Qdrant.
    3. Resets in-memory audit store back to clean seeded baseline.
    """
    fs_summary = purge_filesystem_artifacts(max_age_seconds=None)
    purged_embeddings = vector_store.purge_ephemeral_embeddings()
    store_summary = store.purge_session_store()

    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "deleted_files_count": fs_summary["deleted_files"],
        "deleted_directories_count": fs_summary["deleted_directories"],
        "embeddings_purged": purged_embeddings,
        "store": store_summary,
        "message": "Temporary session files, extraction artifacts, embeddings, and frames purged successfully.",
    }


def _background_worker() -> None:
    """Background worker thread periodically cleaning up orphaned temp files older than 30 minutes."""
    interval_seconds = max(60, SESSION_CLEANUP_INTERVAL_MINUTES * 60)
    print(f"OmniVise background cleanup daemon started (interval: {SESSION_CLEANUP_INTERVAL_MINUTES}m).")

    while not _stop_event.is_set():
        # Clean files older than 30 minutes
        try:
            purge_filesystem_artifacts(max_age_seconds=1800)
        except Exception as exc:
            print(f"Error in background cleanup run: {exc}")

        # Sleep in short increments to allow graceful shutdown
        for _ in range(int(interval_seconds)):
            if _stop_event.is_set():
                break
            time.sleep(1)


def start_cleanup_scheduler() -> None:
    """Start background cleanup daemon thread."""
    global _cleanup_thread
    if _cleanup_thread and _cleanup_thread.is_alive():
        return
    _stop_event.clear()
    _cleanup_thread = threading.Thread(target=_background_worker, daemon=True, name="OmniViseCleanupDaemon")
    _cleanup_thread.start()


def stop_cleanup_scheduler() -> None:
    """Stop background cleanup daemon gracefully."""
    _stop_event.set()
