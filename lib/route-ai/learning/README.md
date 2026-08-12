# ZR Learning Engine™

The learning engine records anonymous local delivery patterns from completed routes. It never changes route behavior automatically.

## What It Learns

- Average stop duration
- Apartment and house duration estimates
- Average walking distance placeholder
- Preferred optimization strategy
- Route completion speed
- Pause duration placeholder
- Packages per stop
- Delivery success rate
- Local category patterns for residential, commercial, apartments, condos, shopping centers, industrial areas, and unknown stops

## Inputs

The engine is prepared to learn from:

- Completed routes
- Completed stops
- Skipped stops
- Manual reordering
- Accepted AI recommendations
- Ignored AI recommendations
- Locked stops
- Navigation deviations

## Privacy

All data stays in local storage under `zerei_route_learning`. No telemetry, uploads, cloud sync, or external ML is used. Drivers can clear learning history or disable learning through the exported store APIs.

## Future Hooks

Interfaces are reserved for encrypted cloud backup and fleet learning. They are not implemented in this sprint.

