# Known Issues

This register contains confirmed open limitations and risks in the current project. Update the Status and Notes columns when an issue changes.

| ID | Description | Priority | Status | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| ZR-001 | Package occurrence reasons are stored only in RouteContext memory and are lost after an application restart. | P1 | Open | Unassigned | Package `skipped` status persists with the route, but the explanatory reason does not. Planned for MVP delivery-status hardening. |
| ZR-002 | Deleting a completed history route targets only its route ID. If legacy history contains duplicate IDs, every matching entry can be removed. | P1 | Open | Unassigned | Rename already uses `id + completedAt`; delete should eventually use the same unique history identity without breaking current-route deletion. |
| ZR-003 | Android tab interaction currently depends on fixed tab bar dimensions (`height: 100`, `paddingBottom: 24`). Behavior has not been verified across the supported Android device and navigation-mode matrix. | P1 | Open | Unassigned | Do not reduce these values without physical-device testing. Future work should validate gesture and three-button navigation with safe-area variations. |
| ZR-004 | Native iOS document picking, spreadsheet parsing, navigation, persistence, and safe-area behavior have not been validated on a physical iOS device. | P1 | Open | Unassigned | TypeScript compatibility is not equivalent to runtime validation. Complete the iOS section of the release checklist before an iOS release. |
| ZR-005 | Automated tests focus on persistence and route-state transitions; navigation touch handling, native file selection, screen rendering, and full lifecycle behavior remain manually tested. | P1 | Open | Unassigned | Add integration or end-to-end coverage as the MVP stabilizes. Physical-device smoke tests remain mandatory. |
| ZR-006 | `npm test` emits a Node `MODULE_TYPELESS_PACKAGE_JSON` warning while loading TypeScript modules. | P2 | Open | Unassigned | Tests pass. Resolve only after checking the impact of setting package module type or adjusting the test loader. |

Priority meanings:

- **P0:** Release blocker or active data-loss issue.
- **P1:** Important reliability or product gap that should be addressed in the current milestone.
- **P2:** Non-blocking maintenance or quality improvement.
