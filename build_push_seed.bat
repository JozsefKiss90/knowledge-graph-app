@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==========================================
REM Neo4j SEED image build + push to Docker Hub
REM   Dumps the local dev DB (work programmes + CORDIS), bakes it into an
REM   image that auto-loads on first boot, and pushes it for Railway.
REM   See CORDIS_PLANS/13 + 13b and neo4j-seed/README.md.
REM   NOTE: the dump briefly STOPS the local dev Neo4j container.
REM ==========================================

REM ---- Edit these if needed ----
set DOCKERHUB_USER=jozsefkiss90
set NEO4J_TAG=2026.02.2
set SEED_IMAGE=%DOCKERHUB_USER%/knowledge-graph-neo4j-seed
set DEV_CONTAINER=kg-dev-neo4j-1
set DEV_VOLUME=kg-dev_neo4j_data
set SEED_DIR=%~dp0neo4j-seed

echo.
echo [SEED] Checking Docker login...
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo [SEED] ERROR: Docker is not running or not reachable.
  exit /b 1
)

echo.
echo [SEED] Stopping local Neo4j (%DEV_CONTAINER%) for an offline dump...
docker stop %DEV_CONTAINER%
IF %ERRORLEVEL% NEQ 0 (
  echo [SEED] ERROR: could not stop %DEV_CONTAINER% ^(is the dev stack running?^).
  exit /b %ERRORLEVEL%
)

echo.
echo [SEED] Removing any previous dump...
if exist "%SEED_DIR%\neo4j.dump" del /q "%SEED_DIR%\neo4j.dump"

echo.
echo [SEED] Dumping 'neo4j' database -^> %SEED_DIR%\neo4j.dump ...
docker run --rm ^
  -v %DEV_VOLUME%:/data ^
  -v "%SEED_DIR%":/backups ^
  neo4j:%NEO4J_TAG% ^
  neo4j-admin database dump neo4j --to-path=/backups
set DUMP_RC=%ERRORLEVEL%

echo.
echo [SEED] Restarting local Neo4j (%DEV_CONTAINER%) ...
docker start %DEV_CONTAINER%

IF NOT "%DUMP_RC%"=="0" (
  echo [SEED] ERROR: dump failed ^(code %DUMP_RC%^). Skipping build/push.
  exit /b %DUMP_RC%
)

echo.
echo [SEED] Building %SEED_IMAGE%:%NEO4J_TAG% ...
docker build ^
  --build-arg NEO4J_TAG=%NEO4J_TAG% ^
  -t %SEED_IMAGE%:%NEO4J_TAG% ^
  "%SEED_DIR%"
IF %ERRORLEVEL% NEQ 0 (
  echo [SEED] ERROR: build failed.
  exit /b %ERRORLEVEL%
)

echo.
echo [SEED] Pushing %SEED_IMAGE%:%NEO4J_TAG% ...
docker push %SEED_IMAGE%:%NEO4J_TAG%
IF %ERRORLEVEL% NEQ 0 (
  echo [SEED] ERROR: push failed ^(docker login? is the repo created/private?^).
  exit /b %ERRORLEVEL%
)

echo.
echo [SEED] Done.
echo [SEED] Seed image: %SEED_IMAGE%:%NEO4J_TAG%
echo [SEED] Dump file:  %SEED_DIR%\neo4j.dump
echo [SEED] Next: redeploy the Railway Neo4j service to pull the new image.
echo.
endlocal
