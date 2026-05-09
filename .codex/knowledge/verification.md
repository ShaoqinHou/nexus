# Verification Evidence

Verification records must separate machine-checkable proof from human-inspection artifacts.

## Screenshot Evidence

Screenshots are supporting evidence, not the gate by themselves. A screenshot record should answer:

- what claim was verified,
- which target was opened, such as a file URL, localhost URL, or public URL,
- which commit, worktree hash, generated artifact hash, and deployment target were involved,
- which viewport, theme, route, and role were used,
- what deterministic checks passed, such as HTTP status, page title, image count, broken image count, console errors, or app-specific assertions,
- where the human-readable screenshot previews live.

Use screenshots for human inspection and communication. Use scripts, summaries, and workflow records for pass/fail decisions.

## Format Choice

- Use compressed JPEG previews for broad rendered-page evidence where the deterministic checks prove the key claim and the screenshot is only for human inspection.
- Use PNG or another lossless artifact for pixel comparison, visual regression baselines, exact color/token debugging, small UI crops, or accessibility/contrast investigations where compression artifacts could hide the issue.
- Do not commit large full-page screenshots unless the full-page layout itself is the claim. Prefer viewport screenshots plus a `summary.json` that records the complete machine-checkable result.
- For the Design Zoo/Gym, the deployed visual guide already carries full route screenshots. Browser-validation evidence should only prove the guide and key viewports render; it should not duplicate the whole Zoo/Gym gallery as another evidence set.

## Storage

Store bounded evidence under `.codex/workflow/artifacts/` and link it from a durable record under `.codex/workflow/records/`.

For guide-browser evidence, include:

- a `summary.json` with target URLs, viewport sizes, titles, image counts, and broken image counts,
- representative desktop/mobile screenshot previews,
- the local internal dashboard artifact, the public guide artifact, and the visual Zoo/Gym artifact,
- a `GUIDE-BROWSER-*` record tied to the current guide artifact hash,
- separate deployment records for public/server validation.

Use `npm run workflow:guide-browser-finalize` instead of manually sequencing guide generation and screenshot capture. The command regenerates guide artifacts first, captures deterministic browser evidence, then records the guide-browser pass last so the hash-bound evidence does not immediately stale itself.

If evidence files become large or repetitive, keep the record and summary in git and move bulky raw artifacts to a deliberate artifact store. Do not let screenshot folders become an unbounded transcript substitute.
