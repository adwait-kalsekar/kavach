import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { HealthPage } from "./features/health/health-page";
import { DemoPage } from "./features/demo/demo-page";
const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main className="journey">
      <h1>Let's head back.</h1>
      <Link to="/">Return to Kavach →</Link>
    </main>
  ),
  errorComponent: () => (
    <main className="journey">
      <h1>Kavach could not load.</h1>
      <p>Reload the page to try again.</p>
    </main>
  ),
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DemoPage,
});
const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/health",
  component: () => (
    <main className="journey">
      <HealthPage />
    </main>
  ),
});
export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, healthRoute]),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
