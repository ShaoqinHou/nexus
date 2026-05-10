# Workflow Duplicate-Agent Audit - 2026-05-11

## Purpose

This audit answers the user's request to inspect the Nexus Codex workflow itself, not only run the workflow's own self-checks.

The audit checks whether the workflow architecture and actual implementation still match the intended design after many repair cycles:

- one deterministic workflow route instead of many parallel closeout rituals,
- policy/profile-owned project facts instead of hardcoded project logic,
- append-only durable records as workflow truth,
- generated guide/dashboard/Zoo views as delete-safe presentation,
- hooks as thin triggers rather than judgment engines,
- explicit routing, review, verification, and audit evidence for LLM work,
- Work Intake records for solo-dev prompts and lead-interpreted work slices,
- reusable workflow-system boundaries separated from Nexus-specific policy data.

## Coverage Matrix

Each major workflow area is audited by at least two independent read-only agents plus lead inspection.

| Area | Scope | Independent auditors |
| --- | --- | --- |
| A | Deterministic kernel, command dispatch, root discovery, timeout behavior, workflow ladder | Volta, Leibniz, lead |
| B | Profile/policy/config/hooks/CI, including deprecated Codex config keys and hook thinness | Leibniz, Banach, lead |
| C | Record/evidence lifecycle, Work Intake, branch/worktree proof, stale-cache boundaries | Volta, Epicurus, lead |
| D | Model routing, subagent role use, skills, Spark/strong fallback evidence | Epicurus, Confucius, lead |
| E | Generated guide/dashboard/Zoo/Gym/deployment evidence and visual contracts | Banach, Darwin, lead |
| F | Docs/templates/archive/portability and separation of reusable system from Nexus data | Confucius, Darwin, lead |

## Execution Rules

- Agents are read-only against the repository.
- Agents may run read-only commands and temporary fixture tests in OS temp locations to explore behavior.
- Findings must cite concrete files, commands, records, or behavior.
- A workflow self-check can support evidence, but it is not enough by itself; findings must include direct code/path inspection or targeted execution.
- Lead fixes only root-cause workflow design or implementation gaps. Cosmetic churn and one-off patches are deferred.

## Live Notes

- Baseline `npm run workflow:status` on 2026-05-10T16:xxZ saw only the two new audit-intake records as untracked changes.
- Baseline timed `workflow:health` passed, with guide freshness marked stale because the new audit-intake records had not yet been rendered into the guide.

## Duplicate-Agent Findings

The six-agent wave produced overlapping findings instead of one-off opinions:

| Finding | Independent evidence | Lead decision |
| --- | --- | --- |
| Passing verify/audit/deployment records could cite mutable runtime/state artifacts or remote URLs without proof. | Volta, Banach, lead CLI probes. | Add artifact input validation, embed local artifact hashes/bytes in pass records, reject runtime/state paths, require command evidence for remote artifacts. |
| Deployment records could validate an older generated guide while the local guide changed afterward. | Banach, Volta. | Embed current guide artifact hash and guide file metadata in deployment records; deployed-gate now rejects stale guide deployment proof. |
| Public guide and Zoo deployment checks were too shallow and could pass fake image responses or stale guide shells. | Banach, Darwin. | Strengthen public deployed check to compare local/deployed guide meta, exact public manifest JSON, image MIME/signatures, and image SHA-256 values. |
| Visual Zoo/Gym manifest leaked local capture information and was stale-prone. | Darwin, Banach, lead inspection. | Generate a public-safe manifest without `baseUrl`, `sourceUrl`, localhost URLs, or repo-local asset paths; keep semantic source hashing so capture timestamps do not stale the guide. |
| Branch evidence hash changed when only the base ref label changed. | Volta, lead code review. | Remove the base label from the branch hash payload; keep merge-base/content/files as the proof inputs. |
| Model routing docs and executable routing logic diverged around hard-task signals and escalation route names. | Epicurus, Confucius. | Move valid routes, default workers, aliases, Spark positives, and strong signals into routing policy; use canonical `escalate` with `escalate-to-strong` only as an alias. |
| Delegated worker attribution could collapse to abstract route labels such as `spark`, weakening integrated-review proof. | Epicurus, lead CLI probe. | Reject abstract worker labels for delegated/review routes and default from policy to concrete agent IDs. |
| Spark fallback could be recorded as an unrelated strong route. | Epicurus, Confucius. | Strong takeover after active Spark routing requires `--from-routing` or active Spark state plus `--fallback-trigger`, and records the handoff metadata. |
| Stale blocked work slices were not treated like stale active slices. | Epicurus. | Add `blocked` to policy-owned active stale statuses and self-test the failure path. |
| Work Intake source types were introduced without a compatibility default for older records. | Lead self-test failure. | Normalize missing `sourceType` to `user-intent` during validation while rejecting explicit unsupported values. |
| Policy consumption still relied on shadow defaults and untested package/CI command bodies. | Leibniz. | Make critical policy fields required, pin package workflow scripts and CI workflow commands in gates policy, and add fixture tests proving bypasses are rejected. |
| Read-only audit skill examples encouraged agents to write passing records without proof. | Confucius, lead doc review. | Update skills/docs so read-only agents report findings and the lead records pass evidence only after command/artifact proof exists. |
| Templates looked like directly valid records even though script frontmatter is required for gates. | Darwin, Confucius. | Mark templates as body shapes; passing proof records should be created by workflow commands. |

## Behavior Probes

The lead ran executable probes in addition to static inspection:

- `npm run workflow:self-test` initially failed three Work Intake acceptance cases because missing `sourceType` was treated as invalid. The root cause was fixed by defaulting absent source type to `user-intent`; the next run passed `199` checks.
- After adding the public Zoo/Gym manifest guard, `npm run workflow:zoo-visual-guide-check` intentionally failed on the old manifest because it contained local capture data and a stale source hash. Regenerating with `npm run workflow:zoo-visual-guide` produced a sanitized manifest and the next check passed.
- Direct CLI failure probes all exited with the intended status and message in under about one second each:
  - retired `record-test`,
  - abstract Spark worker rejected,
  - `escalate-to-strong` alias reaches fallback validation rather than an unknown-route error,
  - mutable runtime artifact rejected,
  - remote deployment artifact rejected without command evidence.

## Root-Cause Fix Pattern

The fixes intentionally avoid adding another closeout checklist. The architecture remains one deterministic route:

`status -> health when diagnosing -> release-gate -> deployed-gate when deployment is in scope`

Supporting checks now feed that route:

- policy owns route names, worker defaults, strong/Spark routing signals, package script contracts, CI gate commands, source types, guide-public timeline filtering, deployment guide proof, hook runtime expectations, and active stale statuses;
- scripts enforce policy contracts and proof shape;
- hooks remain thin triggers and do not perform review/verify/audit judgment;
- generated guide/dashboard/Zoo artifacts are delete-safe presentation and must be regenerated from records/policy;
- records remain append-only durable evidence, while runtime/state telemetry remains mutable cache.

## Post-Fix Audit Wave

A second read-only agent wave audited the patched workflow. It found additional architecture-level gaps that were addressed before release:

| Post-fix finding | Resolution |
| --- | --- |
| Verification/audit/deployment records proved that a command passed, but not that it was the right command for the claim. | Added policy-owned command classes and evidence rules in `.codex/workflow/policy/gates.json`. `record-verify`, `record-audit`, branch evidence, and deployment checks now require matching command classes for changed files or deployment targets. |
| Remote artifact URLs could be paired with unrelated command evidence. | Remote artifacts now require embedded command evidence whose command line references the cited URL. |
| Deployment guide artifact metadata embedded per-file data but did not revalidate each file. | `deployment-check` compares each deployed guide artifact metadata entry against the current local generated guide artifact metadata. |
| CI command validation was a raw text search and could be fooled by comments. | CI validation now extracts actual one-line `run:` commands and ignores comments. |
| Manual guide-browser records had a separate path validation path. | Guide-browser screenshot and summary evidence now reuse the same artifact input guard used by verify/audit/deployment records. |
| Zoo/Gym visual contract was split across capture script, workflow kernel, and deployed checker. | Capture contexts, foundations, interactions, minimum deployed image count, and source paths are now policy-owned under `.codex/workflow/policy/design.json`, and both capture/deployed-check scripts consume that policy. |
| Worker identity defaults still leaked out of routing policy. | Lead and escalation worker defaults now come from `.codex/workflow/policy/routing.json`; docs use `<lead-worker>` placeholders for portable examples. |

The strengthened self-test rose from `200` to `210` checks and now covers these failure paths directly.

## Third Audit Wave

After the second hardening pass, four more read-only auditors inspected the current implementation from architecture, gate behavior, deployment proof, and portability angles. They found several real design gaps, so this pass changed the kernel again instead of only closing records.

| Finding | Resolution |
| --- | --- |
| Command evidence classes could be spoofed by putting `workflow:self-test` in a command id or inert command text. | Command classes now match exact npm script names from the embedded command array. The gates policy uses `npmScripts`, and self-tests reject id spoofing plus `echo workflow:self-test`. |
| Branch-scope verification and audit records could narrow `--files` away from the real branch diff. | Branch-scope `record-verify` and `record-audit` now derive files from branch evidence and reject `--files`; branch evidence validates command relevance against the actual branch files. |
| Deployment proof could be pointed at a non-policy URL while still satisfying the deployed-check command class. | `check-public-guide-images.mjs` rejects URL/env overrides for release evidence unless explicitly allowed, and guide deployment records must target the configured public workflow guide URL. |
| Public Zoo/Gym HTML contained a localhost URL and checks only scanned the manifest. | The generated public Zoo/Gym page now refers to the local `/design` route without a localhost URL. Local and deployed checks reject localhost/private strings in public guide HTML, Zoo HTML, and the manifest. |
| `workflow:guide-browser-finalize` could write a final-looking pass record before review, verification, and audit evidence were current. | The command now fails closed when substantive changes exist and closeout evidence is stale, unless explicitly run with `--allow-precloseout` for exploratory screenshots. |
| Work Intake inbox could keep already-sliced intents visible as untriaged work. | The guide model now excludes intents that already have work-slice records from the inbox. Append-only intent records remain durable history. |
| The second-project bootstrap template did not give enough executable setup detail. | The template now lists the reusable loader/dispatcher, wrapper copy/rename step, package scripts, CI skeleton, project config/profile/policy files, and the explicit no-Zoo policy decision for projects without a design demo surface. |
| Record templates still looked manually fillable. | Every record template now states that it is body reference only and that durable records must be created through workflow commands so frontmatter and evidence hashes are generated. |

Behavior probes for these fixes:

- `record-verify --scope branch --files ...` exits with a deterministic error instead of allowing branch evidence narrowing.
- `record-deployment` with an allowed but non-guide target exits with a deterministic target-proof error.
- `NEXUS_PUBLIC_WORKFLOW_URL=http://localhost:1/workflow/ npm run workflow:public-guide-deployed-check` exits before network access because release evidence must use the configured policy URL.
- A final release-readiness auditor found that a generic URL override flag still weakened deployment proof and that trace health hid the concrete warned/timed-out commands. The override escape hatch was removed, trace output now lists recent warned/timed-out command ids, and strict trace diagnostics are covered by self-test.
- Repo-local self-test artifact fixtures are wrapped in `try/finally` cleanup so interrupted tests are the remaining risk, not normal pass/fail cleanup.
- `npm run workflow:self-test` now passes `223` checks, including the new spoofing, path traversal, retired-command, branch-diff, deployment-target, and trace-strict failure cases.

## Fourth Audit Wave

After the user explicitly allowed executable/temp-test auditing, three more read-only agents audited the workflow code and proof route from kernel, policy-pattern, and verification/deployment angles. They found real architecture drift that was fixed before branch closeout:

| Finding | Resolution |
| --- | --- |
| Untracked evidence records could be missed in a bootstrap/second-project case when Git reports an entirely untracked record-kind directory such as `?? .codex/workflow/records/tests/` instead of individual files. | `recordIntegrityProblems` now merges porcelain status with `git ls-files --others --exclude-standard` so untracked evidence markdown is rejected even when Git collapses the directory. Self-test covers the collapsed-directory case. |
| Deployment app proof still hardcoded the Nexus host and `/nexus/assets/` base-path expectation in the probe script. | `check-production-app.mjs` now fails closed from deployment policy and checks `publicAssetPrefix` from `.codex/workflow/policy/deployment.json`. |
| Design Zoo validation and visual capture helper scripts still had Nexus fallback defaults for env names, local URL, `/design`, `sichuan`, and guide paths. | `workflow-engine.mjs` now exposes reusable required profile/policy helpers. `validate-design-zoo.mjs` and `capture-design-zoo-visuals.mjs` require profile env names and design policy fields instead of falling back to script literals. |
| Public-safe string checks were duplicated between policy and scripts. | `workflow-engine.mjs` now owns public sanitizer helper functions, and both the workflow wrapper and deployed-guide checker consume `.codex/workflow/policy/guide.json` sanitizer data. |
| Dashboard/session-start/resume/branch-closeout guide copy still embedded some workflow facts directly in the wrapper. | Guide policy now owns dashboard knowledge sections, ladder mention files, session-start docs/status command, resume docs, permission guidance, and branch-closeout command examples. The wrapper renders those policy-owned contracts. |

Fresh behavior evidence after these fixes:

- `final14-policy-check-20260511`: `workflow:policy-check` passed.
- `final14b-self-test-20260511`: `workflow:self-test` passed `233` checks, including the new collapsed untracked evidence directory guard.
- Manual Node probe confirmed `record-patch --help` is non-mutating, branch-scope patch/review `--files` are rejected, retired `record-test` stays rejected, and repo status stayed unchanged.
- `final14-design-zoo-20260511`: live Playwright Zoo validation passed against `http://localhost:5173`, including warning toast, dark Sichuan theme/body mirroring, dialog portal contrast `14.24`, and tour portal contrast `14.24`.
- `final14-zoo-visual-capture-20260511`: recaptured the full visual Zoo/Gym from live `/design` routes after the capture script was made fail-closed.
- `final14b-zoo-visual-guide-check-20260511`: regenerated visual guide passed freshness/content checks.

## Deployment-Gate Self-Reference Follow-Up

During final hosted validation, the first successful deployment record exposed an architecture bug: `workflow:deployed-gate` failed because the generated guide Work Intake trace expected to show the deployment record that itself embeds deployed guide artifact metadata. Regenerating the guide after that record would change the artifact the record claims to prove, creating a self-staling loop.

Resolution:

- Work Intake still records and validates deployment evidence as first-class gate truth.
- `.codex/workflow/policy/intake.json` now owns `evidenceKinds`, guide-specific `selfReferentialEvidenceKinds`, and `traceEvidenceKinds`.
- The guide trace omits deployment proof through policy; deployment proof remains in append-only deployment records and `workflow:deployed-gate`, and deployment counts are labeled as display-only guide data.
- `.codex/README.md` and `.codex/knowledge/verification.md` document that future agents must not force current deployment records into the guide artifact being validated.
- Fresh self-test evidence includes the helper-level omission check and an integration-style guide-check fixture that simulates adding a deployment record after guide generation without self-staling the guide contract.

Final reviewer follow-up:

- `guideTraceEvidenceKinds()` now excludes `guide.selfReferentialEvidenceKinds` even when `guide.traceEvidenceKinds` is missing or empty, so policy drift fails closed instead of reintroducing deployments into guide traces.
- Display-only record labeling is handled through a generic helper, not a deployment-specific dashboard branch.
- Work Intake feature rows now label partial counts as `trace evidence` because deployment proof is intentionally omitted from guide traces.
- `final22-self-test-20260511` passed `238` checks after these changes.
