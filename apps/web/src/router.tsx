import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { HealthPage } from "./features/health/health-page";

function AppShell() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Kavach home">
          <img src="/kavach.svg" alt="" width="38" height="38" />
          <span>
            Kavach<span className="brand-divider">/</span>
            <span className="brand-space">Workspace</span>
          </span>
        </Link>
        <span className="prototype-label">Prototype foundation</span>
      </header>
      <div className="workspace">
        <aside className="sidebar" aria-label="Workspace navigation">
          <p className="nav-label">BUILD SPACE</p>
          <nav>
            <Link
              to="/"
              className="nav-link"
              activeOptions={{ exact: true }}
              activeProps={{ "aria-current": "page" }}
            >
              {" "}
              <span aria-hidden="true">◈</span> Overview{" "}
              <span className="nav-arrow" aria-hidden="true">
                ↗︎
              </span>
            </Link>
          </nav>
          <div className="sidebar-note">
            <span className="small-sprout" aria-hidden="true">
              ✳
            </span>
            <p>
              A stronger start
              <br />
              for every season.
            </p>
            <span>Built one verified step at a time.</span>
          </div>
        </aside>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <footer>
        <span>Kavach · Seasonal readiness, thoughtfully built.</span>
        <span>Foundation / 01</span>
      </footer>
    </>
  );
}
const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: () => (
    <section className="page-heading">
      <p className="eyebrow">PAGE NOT FOUND</p>
      <h1>Let's head back.</h1>
      <Link to="/">Return to the workspace →</Link>
    </section>
  ),
  errorComponent: () => (
    <section className="page-heading">
      <h1>The workspace could not load.</h1>
      <p>Reload the page to try again.</p>
    </section>
  ),
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HealthPage,
});
export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
