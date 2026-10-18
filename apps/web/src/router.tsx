import { PlanningProvider } from "./features/planning/state";
import {
  PlanningLayout,
  SituationPage,
  ComparePage as WaterComparePage,
  NextStepsPage,
  EvidencePage,
} from "./features/planning/pages";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
  redirect,
} from "@tanstack/react-router";
import { HealthPage } from "./features/health/health-page";
import { DemoLayout } from "./features/demo/layout";
import { AssistantRoute } from "./features/planning/assistant-page";
import { SamplePage, ComparePage } from "./features/demo/sample-page";
import { SeasonPage, SourcesPage } from "./features/demo/season-page";
const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main className="fallback-page">
      <h1>Let’s head back.</h1>
      <Link to="/talk">Return to Kavach</Link>
    </main>
  ),
  errorComponent: () => (
    <main className="fallback-page">
      <h1>Kavach could not load.</h1>
      <p>Reload the page to try again.</p>
    </main>
  ),
});
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "experience",
  component: DemoLayout,
});
const planningRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "planning",
  component: () => (
    <PlanningProvider>
      <PlanningLayout />
    </PlanningProvider>
  ),
});
const situationRoute = createRoute({
  getParentRoute: () => planningRoute,
  path: "/situation",
  component: SituationPage,
});
const waterCompareRoute = createRoute({
  getParentRoute: () => planningRoute,
  path: "/compare",
  component: WaterComparePage,
});
const nextStepsRoute = createRoute({
  getParentRoute: () => planningRoute,
  path: "/discussion-sheet",
  component: NextStepsPage,
});
const legacyNextStepsRoute = createRoute({
  getParentRoute: () => planningRoute,
  path: "/next-steps",
  beforeLoad: () => {
    throw redirect({ to: "/compare", replace: true });
  },
});
const evidenceRoute = createRoute({
  getParentRoute: () => planningRoute,
  path: "/evidence",
  component: EvidencePage,
});
const indexRoute = createRoute({
  getParentRoute: () => planningRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/situation", replace: true });
  },
});
const talkRoute = createRoute({
  getParentRoute: () => planningRoute,
  path: "/talk",
  component: AssistantRoute,
});
const sampleRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/sample",
  component: SamplePage,
});
const compareRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/sample/compare",
  component: ComparePage,
});
const seasonRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/season",
  component: SeasonPage,
});
const sourcesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/sources",
  component: SourcesPage,
});
const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/health",
  component: () => (
    <main className="health-page">
      <HealthPage />
    </main>
  ),
});
export const router = createRouter({
  routeTree: rootRoute.addChildren([
    planningRoute.addChildren([
      indexRoute,
      situationRoute,
      waterCompareRoute,
      nextStepsRoute,
      legacyNextStepsRoute,
      evidenceRoute,
      talkRoute,
    ]),
    appRoute.addChildren([
      sampleRoute,
      compareRoute,
      seasonRoute,
      sourcesRoute,
    ]),
    healthRoute,
  ]),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
