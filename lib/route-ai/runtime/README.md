# Route AI Runtime

The runtime layer continuously evaluates only the remaining route while the driver is delivering. It is deterministic, local, offline-first, and does not call external AI, traffic, map, weather, or paid APIs.

## Flow

Import -> Optimize -> Execute -> Analyze remaining stops -> Recommend improvements.

The runtime never silently changes the route. It returns recommendations for driver-controlled actions:

- Accept Recommendation
- Ignore
- Preview Changes

## Locked Stops

Locked stops are preserved in their current remaining-route positions. Supported reasons:

- User Locked
- Priority Delivery
- Business Hours
- Customer Request
- Future Appointment

Completed and skipped stops are excluded from remaining-route optimization and never reordered.

## Simulation

`simulateRemainingRouteStrategies` compares:

- Current
- Fastest
- Shortest
- Balanced
- Cluster

Each result includes distance, duration, savings, confidence, and the winning strategy.

## Future Hooks

`OptimizationSession.ts` defines interfaces for future traffic, weather, road events, parking difficulty, learning, and voice assistant providers. They are intentionally interfaces only in this sprint.

