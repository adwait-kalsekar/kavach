import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { DemoProvider, useKavach, languages } from "./state";
import { Icon } from "./ui";
function Shell() {
  const app = useKavach();
  const { t } = app;
  const path = useLocation({ select: (location) => location.pathname });
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    main.current?.scrollTo(0, 0);
    app.setConversationVisible(path === "/talk");
  }, [path, app.setConversationVisible]);
  useEffect(() => {
    if (
      path !== "/talk" &&
      (app.phase === "recording" || app.phase === "starting")
    )
      app.cancel();
  }, [path, app.phase, app.cancel]);
  return (
    <div className="k-app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="k-rail">
        <Link to="/talk" className="k-brand" aria-label="Kavach home">
          <span>
            <Icon name="leaf" />
          </span>
          kavach.
        </Link>
        <p className="rail-caption">{t.assistant}</p>
        <nav className="rail-navigation" aria-label="Main navigation">
          <NavLinks />
        </nav>
        <div className="rail-context">
          <Icon name="leaf" />
          <strong>{t.sampleHint}</strong>
          <span>{t.sampleOnly}</span>
          <small>{t.limitIntro}</small>
        </div>
      </aside>
      <div className="k-workspace">
        <header className="k-topbar">
          <Link
            to="/talk"
            className="k-brand mobile-brand"
            aria-label="Kavach home"
          >
            <span>
              <Icon name="leaf" />
            </span>
            kavach.
          </Link>
          <div className="desktop-location">
            <Icon name="leaf" size={18} />
            {t.sampleHint}
            <span>{t.sampleOnly}</span>
          </div>
          <label className="locale-control">
            <span aria-hidden="true">अ / A</span>
            <span className="sr-only">{t.selectLanguage}</span>
            <select
              aria-label={t.selectLanguage}
              value={app.locale}
              onChange={(event) =>
                app.changeLocale(event.target.value as typeof app.locale)
              }
            >
              {Object.entries(languages).map(([locale, name]) => (
                <option key={locale} value={locale}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <main
          ref={main}
          id="main"
          className={"k-main" + (path === "/talk" ? " k-main-chat" : "")}
        >
          <Outlet />
        </main>
        <nav className="mobile-navigation" aria-label="Main navigation">
          <NavLinks />
        </nav>
      </div>
    </div>
  );
}
function NavLinks() {
  const { t } = useKavach();
  return (
    <>
      {(
        [
          { to: "/talk", icon: "talk", label: t.talkNav },
          { to: "/sample", icon: "sample", label: t.sampleNav },
          { to: "/season", icon: "season", label: t.seasonNav },
        ] as const
      ).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeProps={{ "aria-current": "page", className: "is-active" }}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );
}
export function DemoLayout() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  );
}
