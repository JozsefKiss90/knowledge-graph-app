"""Client for the CORDIS Data-Extraction (DET) API.

Asynchronous flow (see CORDIS_PLANS/00-data-backbone.md §1):
    create extraction -> poll status until Finished -> download result ZIP -> unzip (yields json.zip).

The API key is read from the environment variable ``CORDIS_API_KEY`` and is NEVER logged (redacted in
every error message). HTTP goes through ``requests`` with a timeout and bounded retries. No key is
committed anywhere.
"""
import os
import time
import zipfile
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

import requests

BASE_URL = "https://cordis.europa.eu/api/dataextractions"
CORDIS_HOST = "https://cordis.europa.eu"


class CordisError(RuntimeError):
    pass


def _ensure_key_loaded() -> None:
    """Make CORDIS_API_KEY available regardless of the backend's working directory by walking up
    from this module to find a .env / .env.development that defines it (without overriding a value
    already in the environment)."""
    if os.getenv("CORDIS_API_KEY"):
        return
    try:
        from dotenv import load_dotenv
    except Exception:
        return
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        for env_name in (".env", ".env.development"):
            env_file = parent / env_name
            if env_file.is_file():
                load_dotenv(env_file, override=False)
                if os.getenv("CORDIS_API_KEY"):
                    return


def _get_api_key() -> str:
    _ensure_key_loaded()
    key = (os.getenv("CORDIS_API_KEY") or "").strip()
    if not key:
        raise CordisError(
            "CORDIS_API_KEY is not set. Add it to the backend environment (.env) to fetch from the CORDIS API."
        )
    return key


def _redact(text: str, key: str) -> str:
    return text.replace(key, "***REDACTED***") if key else text


class CordisClient:
    def __init__(self, base_url: str = BASE_URL, timeout: int = 60):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._key = _get_api_key()  # raises CordisError if missing

    # --- low-level -----------------------------------------------------------
    def _request(self, method: str, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/{endpoint}"
        params = {**params, "key": self._key}
        last_err = "unknown error"
        for attempt in range(3):
            try:
                resp = requests.request(method, url, params=params, timeout=self.timeout)
                if resp.status_code >= 500:
                    last_err = f"HTTP {resp.status_code}"
                    time.sleep(2 ** attempt)
                    continue
                if resp.status_code != 200:
                    raise CordisError(_redact(
                        f"CORDIS {endpoint} failed: HTTP {resp.status_code} {resp.text[:200]}", self._key))
                data = resp.json()
                if not data.get("status"):
                    raise CordisError(_redact(
                        f"CORDIS {endpoint} returned status=false: {str(data)[:200]}", self._key))
                return data.get("payload") or {}
            except requests.RequestException as e:
                last_err = str(e)
                time.sleep(2 ** attempt)
        raise CordisError(_redact(f"CORDIS {endpoint} failed after retries: {last_err}", self._key))

    @staticmethod
    def _task_id(payload: Dict[str, Any]) -> str:
        # Response field is `taskID` (uppercase); the request param is `taskId` (lowercase d).
        for k in ("taskID", "taskId"):
            if payload.get(k):
                return str(payload[k])
        raise CordisError("No taskID in CORDIS response.")

    # --- high-level ----------------------------------------------------------
    def create_extraction(self, query: str, output_format: str = "json", archived: bool = False) -> str:
        payload = self._request("GET", "getExtraction", {
            "query": query,
            "outputFormat": output_format,
            "archived": "true" if archived else "false",
        })
        return self._task_id(payload)

    def get_status(self, task_id: str) -> Dict[str, Any]:
        return self._request("GET", "getExtractionStatus", {"taskId": task_id})

    def delete_extraction(self, task_id: str) -> Dict[str, Any]:
        """Free the server-side extraction slot (CORDIS caps stored extractions). Best-effort."""
        try:
            return self._request("DELETE", "deleteExtraction", {"taskId": task_id})
        except CordisError:
            return {}

    def poll_until_done(self, task_id: str, timeout_s: int = 1800, interval_s: int = 10) -> Dict[str, Any]:
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            st = self.get_status(task_id)
            if str(st.get("progress") or "").lower() == "finished" and st.get("destinationFileUri"):
                return st
            time.sleep(interval_s)
        raise CordisError(f"CORDIS extraction {task_id} timed out after {timeout_s}s.")

    def download_and_unzip(self, uri: str, dest_dir: str) -> str:
        """Download the result ZIP and unzip once into ``dest_dir``; return the nested json.zip path."""
        Path(dest_dir).mkdir(parents=True, exist_ok=True)
        zip_path = os.path.join(dest_dir, "extraction.zip")
        full = uri if uri.startswith("http") else f"{CORDIS_HOST}{uri}"
        ok = False
        for params in ({}, {"key": self._key}):  # retry once with key as query param
            r = requests.get(full, params=params, stream=True, timeout=self.timeout)
            if r.status_code == 200:
                with open(zip_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 16):
                        if chunk:
                            f.write(chunk)
                ok = True
                break
        if not ok:
            raise CordisError("Failed to download CORDIS extraction ZIP.")
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(dest_dir)
        json_zip = os.path.join(dest_dir, "json.zip")
        if not os.path.isfile(json_zip):
            raise CordisError(f"No json.zip found in the downloaded extraction at {dest_dir}.")
        return json_zip

    def run_extraction(self, query: str, dest_dir: Optional[str] = None) -> str:
        """Full flow: create -> poll -> download -> unzip; then free the server-side slot.
        Returns the path to json.zip."""
        dest_dir = dest_dir or tempfile.mkdtemp(prefix="cordis_")
        task_id = self.create_extraction(query)
        try:
            status = self.poll_until_done(task_id)
            return self.download_and_unzip(status["destinationFileUri"], dest_dir)
        finally:
            self.delete_extraction(task_id)  # respect the stored-extraction cap
