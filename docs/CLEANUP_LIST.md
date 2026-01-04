# Files Recommended for Cleanup

> **Review this list and confirm which files to delete.**
> Run `npm run build` after changes to ensure nothing breaks.

---

## Frontend Markdown Files (REDUNDANT)

These have been consolidated into `FRONTEND_DOCS.md`:

| File | Status | Reason |
|------|--------|--------|
| `frontend/UI_ARCHITECTURE.md` | **DELETE** | Old v1 architecture doc, superseded by v2 |
| `frontend/UI_ARCHITECTURE_V2.md` | **DELETE** | Consolidated into FRONTEND_DOCS.md |
| `frontend/UI_PROGRESS.md` | **DELETE** | Progress tracker - work is complete |
| `frontend/INTEGRATION_GUIDE.md` | **DELETE** | Consolidated into FRONTEND_DOCS.md |
| `frontend/INTEGRATION_STATUS.md` | **DELETE** | Status tracker - work is complete |

---

## Root-Level Markdown Files (REVIEW)

| File | Recommendation | Reason |
|------|----------------|--------|
| `README.md` | **KEEP** | Main project README - essential |
| `AI_FEATURES_README.md` | **DELETE** | Old hackathon quick-start guide, info now outdated |
| `HACKATHON_LLM_PLAN.md` | **DELETE** | Hackathon plan from Nov - completed |
| `IMPLEMENTATION_SUMMARY.md` | **DELETE** | Duplicates AI_FEATURES_README info |
| `INSTALLATION_GUIDE.md` | **DELETE** | Installation info in README and FRONTEND_DOCS |
| `SCHEMA_MIGRATION_PLAN.md` | **KEEP/ARCHIVE** | May still be useful for backend team |
| `ER_Model.md` | **KEEP** | Database design reference |
| `backend-todo.md` | **KEEP** | Active backend todo list |

---

## Backend Markdown Files (REVIEW)

| File | Recommendation | Reason |
|------|----------------|--------|
| `backend/README.md` | **KEEP** | Main backend documentation |
| `backend/GET_STARTED.md` | **DELETE** | Info duplicated in README |
| `backend/ATLAS_SETUP.md` | **DELETE** | Info duplicated in MONGODB_SETUP |
| `backend/MONGODB_SETUP.md` | **KEEP** | Detailed MongoDB guide |
| `backend/MIGRATION_SUMMARY.md` | **DELETE** | One-time migration complete |
| `backend/SEEDING_SUMMARY.md` | **DELETE** | Seeding is documented in README |

---

## Potentially Redundant Code Files (REVIEW)

| File | Status | Reason |
|------|--------|--------|
| `frontend/src/components/AttendanceTableExample.jsx` | **DELETE** | Example file, not used in routes |
| `frontend/src/components/ChatBox.jsx` | **MAYBE DELETE** | Old ChatBox, check if still imported |
| `frontend/src/components/GlobalAssistant.jsx` | **MAYBE DELETE** | Check if still used |
| `frontend/src/components/MicInput.jsx` | **MAYBE DELETE** | May be superseded by AI voice components |
| `frontend/src/components/UI.jsx` | **REVIEW** | Check if still used |
| `frontend/src/pages/AITest.jsx` | **KEEP** | Test page, useful for development |
| `frontend/public/index.html` | **DELETE** | Duplicate of root index.html |

---

## Summary by Action

### Definite Deletes (Frontend Docs)
```
frontend/UI_ARCHITECTURE.md
frontend/UI_ARCHITECTURE_V2.md
frontend/UI_PROGRESS.md
frontend/INTEGRATION_GUIDE.md
frontend/INTEGRATION_STATUS.md
```

### Definite Deletes (Root)
```
AI_FEATURES_README.md
HACKATHON_LLM_PLAN.md
IMPLEMENTATION_SUMMARY.md
INSTALLATION_GUIDE.md
```

### Definite Deletes (Backend)
```
backend/GET_STARTED.md
backend/ATLAS_SETUP.md
backend/MIGRATION_SUMMARY.md
backend/SEEDING_SUMMARY.md
```

### Optional Deletes (Code)
```
frontend/src/components/AttendanceTableExample.jsx
frontend/public/index.html
```

### Keep
```
README.md
ER_Model.md
backend-todo.md
SCHEMA_MIGRATION_PLAN.md (or archive)
backend/README.md
backend/MONGODB_SETUP.md
frontend/FRONTEND_DOCS.md (NEW - consolidated)
```

---

## PowerShell Commands to Delete

Once you confirm, run these commands:

```powershell
# Frontend docs cleanup
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend\UI_ARCHITECTURE.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend\UI_ARCHITECTURE_V2.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend\UI_PROGRESS.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend\INTEGRATION_GUIDE.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend\INTEGRATION_STATUS.md"

# Root docs cleanup
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\AI_FEATURES_README.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\HACKATHON_LLM_PLAN.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\IMPLEMENTATION_SUMMARY.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\INSTALLATION_GUIDE.md"

# Backend docs cleanup
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\backend\GET_STARTED.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\backend\ATLAS_SETUP.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\backend\MIGRATION_SUMMARY.md"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\backend\SEEDING_SUMMARY.md"

# Optional code cleanup
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend\src\components\AttendanceTableExample.jsx"
Remove-Item "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend\public\index.html"
```

---

## After Cleanup

Verify build still works:
```powershell
cd "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend"
npm run build
```

---

**Total files to delete:** 14-16 files
**Documentation reduced from:** 20 markdown files → 7 markdown files
