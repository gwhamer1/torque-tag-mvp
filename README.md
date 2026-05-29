# Torque Documentation MVP

Lean field workflow for Reed Energy Group torque tag documentation:

1. Upload or capture a completed torque tag photo.
2. Extract handwritten fields with a vision model.
3. Review and correct every extracted field.
4. Generate the exact DS 2.12 Word report from the supplied `.docx` template.
5. Store the original photo, generated report, and optional PDF wrench certificates locally.

Phase 1 intentionally does not implement engineered torque lookup, K-factor calculation, supervisor approval, digital signatures, multi-job admin, or PDF conversion.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` to enable live AI extraction. Without a key, the sample `filled-torque-tag.jpeg` uses a local demo extraction so the report workflow can still be tested.

## Useful Commands

```bash
npm run lint
npm run build
```

Generated field files are stored under `storage/` and are intentionally ignored by Git.
