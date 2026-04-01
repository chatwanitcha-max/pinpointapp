# Text Encoding Root Cause

## Exact root causes found

1. Some Thai strings were written into config-like files through tooling that did not preserve UTF-8 cleanly.
   - This produced literal question-mark corruption in files such as `operations/follow-up-playbook.json`.
2. Runtime code previously trusted environment text directly.
   - If a setting such as `LINE_AUTO_REPLY_TEXT` was corrupted, customers saw the corrupted text immediately.
3. The repository had no shared encoding policy file.
   - Editors and scripts were free to save text with inconsistent behavior.

## Permanent protections added

1. `.editorconfig`
   - Forces UTF-8 for source, content, and config files.
2. `scripts/check-text-integrity.mjs`
   - Scans the repository for common corruption markers such as:
     - repeated question-mark corruption
     - replacement characters
     - common mojibake patterns
3. LINE reply fallback hardening
   - `api/line-webhook.js` now ignores corrupted `LINE_AUTO_REPLY_TEXT` values and falls back to safe in-code text.
4. Follow-up queue guard
   - `skills/pinpoint-agency-os/scripts/generate-followup-queue.mjs` now fails fast if the follow-up playbook is corrupted.

## Recommended maintenance step

Run this before major content releases:

```powershell
node scripts/check-text-integrity.mjs
```
