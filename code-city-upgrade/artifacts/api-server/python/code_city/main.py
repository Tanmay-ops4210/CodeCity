from __future__ import annotations

import re

from fastapi import APIRouter, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .analyzer import build_demo_analysis
from .archive import MAX_ARCHIVE_BYTES, ArchiveValidationError, analyze_zip_bytes
from .models import ErrorMessage, HealthStatus, ProjectAnalysis

MAX_MULTIPART_BYTES = MAX_ARCHIVE_BYTES + 1024 * 1024


class UploadSizeLimitMiddleware:
    """Bounds the full multipart body before Starlette parses or spools it."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or scope["method"] != "POST"
            or scope["path"] != "/api/analyze"
        ):
            await self.app(scope, receive, send)
            return

        content_length = next(
            (
                value.decode("latin-1")
                for key, value in scope.get("headers", [])
                if key.lower() == b"content-length"
            ),
            None,
        )
        try:
            if content_length is not None and int(content_length) > MAX_MULTIPART_BYTES:
                await self._too_large(scope, receive, send)
                return
        except ValueError:
            await self._bad_request(scope, receive, send)
            return

        body = bytearray()
        more_body = True
        while more_body:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            if len(body) + len(chunk) > MAX_MULTIPART_BYTES:
                await self._too_large(scope, receive, send)
                return
            body.extend(chunk)
            more_body = message.get("more_body", False)

        sent = False

        async def replay_body() -> Message:
            nonlocal sent
            if sent:
                return {"type": "http.disconnect"}
            sent = True
            return {"type": "http.request", "body": bytes(body), "more_body": False}

        await self.app(scope, replay_body, send)

    async def _too_large(self, scope: Scope, receive: Receive, send: Send) -> None:
        response = JSONResponse(
            status_code=413,
            content={"detail": "Upload exceeds the 20 MiB ZIP archive limit."},
        )
        await response(scope, receive, send)

    async def _bad_request(self, scope: Scope, receive: Receive, send: Send) -> None:
        response = JSONResponse(
            status_code=400,
            content={"detail": "Invalid Content-Length header."},
        )
        await response(scope, receive, send)


app = FastAPI(
    title="Code City Analyzer API",
    description=(
        "Safe multi-language source metrics for ZIP archives. Python uses ast and "
        "tokenize; JavaScript, TypeScript, Java, C and C++ use Tree-sitter syntax "
        "parsers; other registered languages receive lexical line metrics. "
        "Uploaded code is never imported, executed, compiled or used to install dependencies."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthStatus)
@router.get("/healthz", response_model=HealthStatus)
async def health_check() -> HealthStatus:
    return HealthStatus(status="ok")


@router.get("/demo", response_model=ProjectAnalysis)
async def get_demo() -> ProjectAnalysis:
    return build_demo_analysis()


import logging

logger = logging.getLogger("code_city.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@router.post(
    "/analyze",
    response_model=ProjectAnalysis,
    responses={
        400: {"model": ErrorMessage, "description": "Invalid or unsafe archive."},
        413: {"model": ErrorMessage, "description": "Upload exceeds a configured safety limit."},
    },
)
async def analyze_upload(file: UploadFile = File(...)) -> ProjectAnalysis:
    logger.info("Incoming upload request for: %s (content_type=%s)", file.filename, file.content_type)
    if not file.filename or not file.filename.casefold().endswith(".zip"):
        await file.close()
        logger.warning("Rejected non-ZIP filename: %s", file.filename)
        raise HTTPException(status_code=400, detail="Upload a ZIP archive with a .zip filename.")

    try:
        archive_bytes = await file.read(MAX_ARCHIVE_BYTES + 1)
        if len(archive_bytes) > MAX_ARCHIVE_BYTES:
            logger.warning("File '%s' exceeds 20,000 KB limit (%d bytes)", file.filename, len(archive_bytes))
            raise HTTPException(
                status_code=413,
                detail="The ZIP archive exceeds the configured 20,000 KB upload limit.",
            )
        project_name = _project_name(file.filename)
        logger.info("Analyzing archive '%s' (%d bytes, project name: '%s')", file.filename, len(archive_bytes), project_name)
        result = analyze_zip_bytes(archive_bytes, project_name)
        logger.info("Successfully analyzed '%s': %d files, %d functions", project_name, len(result.get("files", [])), len(result.get("functions", [])))
        return result
    except ArchiveValidationError as error:
        logger.warning("Archive validation error on '%s': %s", file.filename, str(error))
        raise HTTPException(status_code=400, detail=str(error)) from None
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Analysis failure on '%s': %s", file.filename, str(exc), exc_info=True)
        raise HTTPException(status_code=400, detail=f"Analysis error: {str(exc)}") from None
    finally:
        await file.close()


def _project_name(filename: str) -> str:
    # Keep only a display-safe basename; never use uploaded paths as storage paths.
    basename = filename.replace("\\", "/").rsplit("/", 1)[-1]
    name = re.sub(r"[\x00-\x1f\x7f]", "", basename)
    if name.casefold().endswith(".zip"):
        name = name[:-4]
    return (name.strip()[:120] or "Uploaded project")


app.include_router(router)
