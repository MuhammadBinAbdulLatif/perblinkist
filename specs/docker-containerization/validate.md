# Validation Checklist: Docker Containerization

## Verification Matrix

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **Standalone Next.js Config** | `output: 'standalone'` enabled and builds without error. | [ ] |
| **Multi-Stage Dockerfile** | Clean syntax, non-root user, multi-stage layering. | [ ] |
| **Docker Compose Config** | `docker-compose.yml` mounts `/media:ro` and `/config:rw`. | [ ] |
| **Auto-Migration Entrypoint** | Initializes SQLite schema on fresh `/config` volume mount. | [ ] |
| **Compose Lint / Validate** | `docker compose config` evaluates without syntax errors. | [ ] |

---

## Test Execution Command
```powershell
docker compose config
```
