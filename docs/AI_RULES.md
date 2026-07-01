# Mandatory AI Development Rules

These rules apply to every AI-assisted change in Zerei Rotas. They are mandatory unless the user explicitly approves an exception for the current task.

## Core Rules

1. **Never modify unrelated files.** Limit edits to the smallest set required by the request.
2. **Prefer minimal changes.** Fix the confirmed failure without opportunistic refactoring or redesign.
3. **Preserve RouteContext unless explicitly requested.** RouteContext is the runtime source of truth for current route and history.
4. **Preserve persistence compatibility.** Existing `zerei_current_route` and `zerei_route_history` data must remain readable unless a reviewed migration is included.
5. **Never change navigation architecture without approval.** File-system routes, navigator ownership, and lifecycle placement require explicit authorization.
6. **Run `npm run typecheck` after every change.** Do not report success if typechecking was not run or did not pass.
7. **Run tests after every change.** Use `npm test` unless the task explicitly defines an additional or different command.
8. **Add regression tests for every bug fix.** The test must reproduce the broken behavior and prove the corrected behavior.
9. **Explain root cause before implementing fixes.** Trace the real execution path and identify the first broken step; do not patch based only on symptoms.
10. **Keep commits atomic.** One commit should represent one coherent behavior or documentation change.
11. **Update `docs/CHANGELOG.md` when behavior changes.** Documentation-only or formatting changes do not require a behavior entry unless they alter project policy.
12. **Keep `ROADMAP.md` and `ARCHITECTURE.md` synchronized with major changes.** Update both when ownership, navigation, persistence, lifecycle, or planned product scope changes.

## Investigation Rules

- Read the existing implementation before proposing a solution.
- Do not assume that a visible screen, component, storage key, or route is the one executing at runtime.
- Trace UI event, context update, persistence write, persistence read, and final render when debugging data flow.
- Distinguish runtime evidence from static-code inference.
- Use temporary instrumentation only when needed, use a unique prefix, and remove it before completion.
- Revert failed experiments before trying a different approach.
- Do not change business logic during a diagnosis-only task.
- State uncertainty directly when physical-device or external-service validation is unavailable.

## Architecture Rules

- Expo Router owns the navigation container; never introduce another `NavigationContainer`.
- Keep route lifecycle screens inside `app/(tabs)/routes/` unless an architectural migration is approved.
- Keep the bottom tab bar visible on main tab screens and hidden on lifecycle screens.
- Do not reduce the working Android tab bar dimensions without physical-device validation.
- Screens read `currentRoute` and `routeHistory` from RouteContext.
- Do not create a second screen-owned source of truth for route or history data.
- Current-route rename goes through `renameCurrentRoute`.
- Completed-history mutations must reload shared history after persistence succeeds.
- Completed history identity is `id + completedAt`; never use list position as identity.
- Keep import parsing in import/library modules and storage serialization in the persistence layer.

## Change Discipline

- Preserve user changes already present in the working tree.
- Do not revert, reset, or overwrite unrelated work.
- Use existing project patterns and dependencies before adding abstractions or packages.
- Avoid UI or styling changes unless the request requires them.
- Avoid dependency changes unless they are necessary and explicitly justified.
- Keep comments concise and limited to non-obvious behavior.
- Do not leave console traces, temporary labels, dead experiments, or unused imports.
- Update types and tests together with contract changes.
- Treat authentication, import, persistence, navigation, rename, completion, and recovery as high-risk paths.

## Validation Rules

Before closing a code task:

1. Run `npm run typecheck`.
2. Run `npm test`.
3. Run any focused test required by the changed behavior.
4. Inspect the final diff for unrelated edits and temporary code.
5. Report pass/fail for every validation requested by the user.
6. Clearly identify checks that require Expo Go, a physical device, Supabase, or another unavailable runtime.
7. Never claim a device or runtime check passed without direct evidence.

For native import or navigation work, validation must include the relevant Android and iOS items in `docs/RELEASE_CHECKLIST.md` before release.

## Documentation Rules

- `ARCHITECTURE.md` describes what the system currently is.
- `ROADMAP.md` describes prioritized future work.
- `docs/PRODUCT_VISION.md` describes the customer and product direction.
- `docs/CHANGELOG.md` records completed user-visible and architectural behavior changes.
- `docs/KNOWN_ISSUES.md` records confirmed open limitations and risks.
- `docs/RELEASE_CHECKLIST.md` defines release evidence.
- Update documentation in the same atomic change when implementation makes it inaccurate.

## Required Final Report

Every completed code change should report:

- Root cause or requested objective.
- Exact files changed.
- What changed and why it is correct.
- Tests added or updated.
- Typecheck result.
- Test result.
- Runtime/device validation result, including anything not run.
