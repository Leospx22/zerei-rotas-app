# Zerei Rotas Route AI Engine

The route AI module is an offline-first optimization foundation. It does not call OpenAI, Gemini, Claude, maps APIs, traffic APIs, or any paid service.

## Pipeline

1. `RouteAnalyzer` reads imported `GroupedStop` data and calculates route distance, duration, clusters, bottlenecks, duplicate streets, and duplicate neighborhoods.
2. `RouteOptimizer` runs deterministic local strategies and returns an optimized stop order with distance, duration, savings, and confidence.
3. `RouteComparison` compares original versus optimized routes and estimates time, fuel, and percentage savings.
4. `RouteScorer` assigns a 0-100 quality score and explains the score.
5. `generateRouteAIReport` combines the pipeline into the report stored on `RouteData.routeAIReport`.

## Strategies

Implemented locally:

- `fastest`
- `shortest-distance`
- `balanced`

Reserved interface values:

- `traffic-aware`
- `driver-preference`
- `historical-learning`

## Provider Interface

Future providers must implement `IRouteOptimizationProvider`. The app should depend on this interface, not on OpenAI, Gemini, Claude, or any other specific provider.

Current provider:

- `DeterministicRouteOptimizer`, provider id `local`

Future provider ids are reserved for `openai`, `gemini`, `claude`, and `offline-ml`, but there is no implementation in this sprint.

## Offline Behavior

When coordinates are available, distance uses haversine calculations. When coordinates are missing, the analyzer falls back to deterministic address, street, neighborhood, and CEP heuristics.

The optimizer yields before computation so import navigation can render a loading state before local work starts. For 200 stops, the balanced strategy is designed to stay under 3 seconds on typical devices by using cluster sorting plus bounded 2-opt improvement.

