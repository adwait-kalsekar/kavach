import { useQuery } from "@tanstack/react-query";
import { healthQueryOptions } from "./health-query";

export function HealthPage() {
  const health = useQuery(healthQueryOptions);
  const connected = health.isSuccess;
  const label = health.isPending
    ? "Checking connection"
    : health.isError
      ? "API unreachable"
      : "API reachable";
  const detail = health.isPending
    ? "Sending a real request from this app to Hono."
    : health.isError
      ? "We couldn't verify the latest request. Check that the API is running, then try again."
      : "The app received and validated a response from Hono. Your connection is working.";
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">
          <span aria-hidden="true">●</span> THE FIRST CONNECTION
        </p>
        <h1>
          Good things start
          <br />
          with solid roots.
        </h1>
        <p className="intro">
          Your Kavach workspace is taking shape. First, let's make sure the app
          and API are talking.
        </p>
      </section>
      <section className="connection-card" aria-labelledby="connection-title">
        <div className="card-heading">
          <div>
            <span className="section-kicker">SYSTEM CHECK</span>
            <h2 id="connection-title">App meets API.</h2>
          </div>
          <span className="live-label">
            <span aria-hidden="true">◉</span> Live request
          </span>
        </div>
        <div
          className="connection-flow"
          aria-label="Browser connects to Hono API"
        >
          <div>
            <span className="flow-icon" aria-hidden="true">
              ▤
            </span>
            <strong>React app</strong>
            <span>Your browser</span>
          </div>
          <span className="flow-line" aria-hidden="true">
            <i />→<i />
          </span>
          <div>
            <span className="flow-icon api-icon" aria-hidden="true">
              ⌘
            </span>
            <strong>Hono API</strong>
            <span>One service boundary</span>
          </div>
        </div>
        <div
          className={`health-state ${health.isError ? "state-error" : ""}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className={`status-dot ${health.isPending ? "is-pending" : ""}`}
            aria-hidden="true"
          />
          <div>
            <h3>{label}</h3>
            <p>{detail}</p>
          </div>
          {connected && (
            <span className="verified-mark" aria-hidden="true">
              ✓
            </span>
          )}
        </div>
        <dl className="connection-metrics">
          <div>
            <dt>ENDPOINT</dt>
            <dd>
              <code>/api/v1/health</code>
            </dd>
          </div>
          <div>
            <dt>ROUND TRIP</dt>
            <dd>{connected ? `${health.data.roundTripMs} ms` : "—"}</dd>
          </div>
          <div>
            <dt>LAST RESPONSE</dt>
            <dd>
              {health.data ? (
                <time dateTime={health.data.data.checkedAt}>
                  {new Date(health.data.data.checkedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                  {health.isError && " (previous)"}
                </time>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        <div className="card-bottom">
          <p>
            <span aria-hidden="true">↳</span> Same origin. Typed request.
            Validated response.
          </p>
          <button
            type="button"
            className="check-button"
            onClick={() => {
              void health.refetch();
            }}
            disabled={health.isFetching}
          >
            {health.isFetching ? "Checking…" : "Check again"}
            <span aria-hidden="true">↗︎</span>
          </button>
        </div>
        {health.data && (
          <details className="response-details">
            <summary>Inspect the API response</summary>
            <pre>{JSON.stringify(health.data.data, null, 2)}</pre>
            <p>
              Request ID: <code>{health.data.meta.requestId}</code>
            </p>
            <p>
              This checks API reachability. Database readiness is a separate{" "}
              <code>/readyz</code> check.
            </p>
          </details>
        )}
      </section>
      <section
        className="foundation-section"
        aria-labelledby="foundation-title"
      >
        <div className="foundation-heading">
          <h2 id="foundation-title">A small start. A strong foundation.</h2>
          <span>WHAT'S IN PLACE</span>
        </div>
        <div className="foundation-grid">
          <article>
            <span className="tile-number">01 / INTERFACE</span>
            <h3>Ready for the next screen.</h3>
            <p>
              React and Vite, with TanStack Router for navigation and Query for
              API state.
            </p>
          </article>
          <article>
            <span className="tile-number">02 / CONNECTION</span>
            <h3>One clear way through.</h3>
            <p>
              The browser calls Hono. Cloud services and provider credentials
              stay behind the API.
            </p>
          </article>
          <article>
            <span className="tile-number">03 / NEXT CHAPTER</span>
            <h3>From connection to context.</h3>
            <p>
              Next: capture a farm profile and connect the first
              seasonal-readiness journey.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
