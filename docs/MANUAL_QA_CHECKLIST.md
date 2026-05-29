# Manual QA Checklist

Use this checklist before a production-facing demo or after changing extraction/report generation.

## Environment

- Confirm `.env.local` exists and is not committed.
- Set `OPENAI_API_KEY` when testing live AI extraction.
- Run `npm install`.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.

## Browser Flow

1. Start the app with `npm run dev`.
2. Open `http://127.0.0.1:3000`.
3. Confirm the MVP warning banner is visible:
   `MVP documentation tool only. Confirm torque values against approved torque package before use.`
4. Open `/submit`.
5. Upload `public/examples/filled-torque-tag.jpeg`.
6. Confirm extraction completes and the review form appears.
7. Confirm these required fields are populated or manually fill them:
   - Tag #
   - Torque applied ft/lbs
   - Torqued by
8. Enter an expected torque that does not match the applied torque and confirm the warning appears.
9. Correct the expected torque or applied torque.
10. Check the worker review confirmation box.
11. Generate the DS 2.12 Word report.
12. Download the generated `.docx`.
13. Open the `.docx` in Word and confirm:
   - The DS 2.12 layout is preserved.
   - Page 2 contains the original torque tag photo in the Diagram/Remarks area.
   - Step torque values match 30%, 60%, 100%, 100%, 100%.
14. Open `/reports` and confirm the generated report and photo links appear.
15. Open `/certs`.
16. Upload a PDF certificate and confirm it appears in the certificate list.

## Guardrails

- Clear Tag # and confirm report generation is blocked with a friendly error.
- Clear Torque applied ft/lbs and confirm report generation is blocked with a friendly error.
- Clear Torqued by and confirm report generation is blocked with a friendly error.
- Try uploading a non-PDF certificate and confirm the upload is rejected.
