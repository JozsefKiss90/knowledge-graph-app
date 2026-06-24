# 13a — Secrets removal runbook (root `.env`)

Companion to `CORDIS_PLANS/13` Phase 1. **Verified with `git ls-files` on the `cordis` branch.**

## Scope — good news, it's small

The **only** secret-bearing file tracked in git is the **root `.env`**. It contains:

| Key | What it is | Action |
|---|---|---|
| `CORDIS_API_KEY` | Live CORDIS DET API key (used by `cordis_client.py`) | Rotate + move to env vars |
| `AURA_DB_PASSWORD` | An Aura password — **not read by any code** (verified by repo grep); backend auths via `NEO4J_PASSWORD` | Rotate the Aura account password; drop from `.env` |

**Not tracked (no action needed, keep ignored):** `backend/.env`, `backend/.env.backend.production`, `backend/.env.backend.development`, `frontend/.env.frontend.production`, `frontend/.env.frontend.development`. These live on disk for local Docker/dev but are correctly excluded by `.gitignore` (`.env` / `.env.*`).

> The root `.env` is *also* matched by `.gitignore`, so it was either force-added (`git add -f`) or committed before the ignore rule. Ignore rules do **not** untrack an already-tracked file — that's what step 2 below is for.

## Why untracking is not enough

**⚠️ Verified 2026-06-24: the GitHub repo `JozsefKiss90/knowledge-graph-app` is PUBLIC** — both secrets are in public history, so assume they are already compromised/scraped. **Rotating them (step 3) is mandatory and urgent;** untracking and history rewrite cannot un-publish what was already public.

Both values are already in the repo's **history**, so anyone with repo access (or a clone/fork) can recover them. **Untracking stops future leakage but does not remediate the past** — rotation (step 3) is the only real fix. History rewrite (step 4) reduces exposure but can't recall what's already been cloned.

---

## Steps

### 1. Put the values where they're actually consumed (so nothing breaks)
- **`CORDIS_API_KEY`** is read from the environment by the CORDIS client. Set it as a **Railway backend service variable** (and keep it in the untracked local `backend/.env` for dev). Do this *before* untracking so ingestion keeps working.
- **`AURA_DB_PASSWORD`** in root `.env` is **not read by any backend code** — verified by repo grep; the only `AURA_*` var any code reads is `AURA_BACKEND_URL` (in `upload_to_aura.py`, for the populate orchestrator), and the driver auths with `NEO4J_PASSWORD`. Safe to drop from `.env` after rotating the Aura **account** password.

### 2. Untrack `.env` (safe, local, reversible — keeps the file on disk)
```bash
git rm --cached .env
git commit -m "Stop tracking root .env (secrets); keep ignored"
```
`.gitignore` already lists `.env`, so it won't be re-added. The working-tree file is untouched, so local dev/compose keep reading it.

### 3. Rotate the exposed secrets (the actual remediation — do regardless of step 4)
- **CORDIS_API_KEY:** request/regenerate a new key in the CORDIS portal; update the Railway backend var + local `backend/.env`; revoke the old key.
- **Aura password:** rotate it in the Aura console. Since this whole migration retires Aura (plan Phase 7), you can rotate now and update wherever it's referenced, or simply ensure the retired instance's old password is dead before decommission.

### 4. (Optional, recommended) Purge `.env` from history, then force-push
History rewrite — **coordinate with anyone who has a clone** (everyone must re-clone or hard-reset afterward).
```bash
# Preferred: git-filter-repo (install separately)
git filter-repo --path .env --invert-paths

# Alternative: BFG
#   bfg --delete-files .env && git reflog expire --expire=now --all && git gc --prune=now --aggressive

git push --force --all
git push --force --tags
```
Then have collaborators re-clone. **Note:** if the repo is public or was ever cloned/forked, treat both secrets as permanently compromised regardless — rotation (step 3) is what protects you.

### 5. Verify
```bash
git ls-files -- ".env"          # -> (empty): no longer tracked
git ls-files | grep -i '\.env'  # -> only non-secret matches, if any
```

---

## Checklist
- [ ] `CORDIS_API_KEY` set as Railway backend var + local `backend/.env`; old key revoked.
- [ ] `AURA_DB_PASSWORD` verified unused by code; removed from `.env`.
- [ ] `git rm --cached .env` committed; working file still present.
- [ ] Aura password rotated (or instance scheduled for decommission with dead creds).
- [ ] (Optional) `.env` purged from history; collaborators re-cloned.
- [ ] `git ls-files -- ".env"` returns empty.
