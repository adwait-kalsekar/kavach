import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useKavach } from "./state";
import { Icon } from "./ui";
export function ChatPage() {
  const app = useKavach();
  const { t } = app;
  const { draft, setDraft } = app;
  const [help, setHelp] = useState(false);
  const [unread, setUnread] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousLast = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const busy = app.phase !== "idle";
  const capturing = app.phase === "recording" || app.phase === "starting";
  function bottom() {
    const el = scroll.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      nearBottom.current = true;
      setUnread(false);
    }
  }
  useEffect(() => {
    const last = app.messages.at(-1);
    if (last && last.id !== previousLast.current) {
      if (nearBottom.current || last.role === "user") bottom();
      else setUnread(true);
    }
    if (!last) setUnread(false);
    previousLast.current = last?.id || null;
  }, [app.messages]);
  useEffect(() => {
    if (app.messages.length > 0 && nearBottom.current) bottom();
  }, [app.phase, app.messages.length]);
  useEffect(() => {
    if (help) dialog.current?.showModal();
    else dialog.current?.close();
  }, [help]);
  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void app.sendText(text);
  }
  return (
    <section className="chat-screen">
      <header className="chat-heading">
        <div className="assistant-mark">
          <Icon name="leaf" />
        </div>
        <div>
          <h1>{t.talkTitle}</h1>
          <p>
            <span className="status-dot" />
            {t.assistant}
          </p>
        </div>
        <button
          className="icon-button"
          aria-label={t.newChat}
          title={t.newChat}
          disabled={busy}
          onClick={() => {
            app.newChat();
            setDraft("");
            bottom();
          }}
        >
          <Icon name="plus" />
        </button>
      </header>
      <div className="chat-context">
        <span>
          <Icon name="water" size={15} />
          {t[app.water]}
        </span>
        <Link to="/sample">
          {t.sampleOnly}
          <Icon name="arrow" size={14} />
        </Link>
      </div>
      <div
        className="message-area"
        ref={scroll}
        onScroll={() => {
          const el = scroll.current;
          if (el) {
            nearBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 70;
            if (nearBottom.current) setUnread(false);
          }
        }}
      >
        {app.messages.length === 0 ? (
          <div className="conversation-welcome">
            <span className="welcome-sprout">
              <Icon name="leaf" size={36} />
            </span>
            <h2>{t.welcome}</h2>
            <p>{t.welcomeBody}</p>
            <div className="starter-prompts">
              <button onClick={() => void app.ask()}>
                <Icon name="sample" size={20} />
                <span>{t.suggestCheck}</span>
                <Icon name="arrow" size={17} />
              </button>
              <button onClick={() => app.chooseWater("none")}>
                <Icon name="water" size={20} />
                <span>{t.suggestWater}</span>
                <Icon name="arrow" size={17} />
              </button>
            </div>
            <small>{t.scope}</small>
          </div>
        ) : (
          <div
            className="conversation-thread"
            role="log"
            aria-label={t.talkTitle}
            aria-live="polite"
            aria-relevant="additions text"
          >
            {app.messages.map((message) => (
              <article
                key={message.id}
                className={
                  "message message-" +
                  message.role +
                  (message.kind ? " message-" + message.kind : "")
                }
                lang={message.locale.slice(0, 2)}
              >
                {message.role === "assistant" && message.kind !== "context" && (
                  <span className="message-avatar">
                    <Icon name="leaf" size={18} />
                  </span>
                )}
                <div className="message-content">
                  {message.role === "assistant" &&
                    message.kind !== "context" && (
                      <span className="message-author">
                        Kavach{message.google && <small>Google AI</small>}
                      </span>
                    )}
                  <div className="message-bubble">
                    <p>{message.text}</p>
                    {message.kind === "proposal" && message.water && (
                      <div className="proposal-details">
                        <div>
                          <span>{t.from}</span>
                          <strong>{t[message.fromWater || app.water]}</strong>
                        </div>
                        <Icon name="arrow" size={19} />
                        <div>
                          <span>{t.to}</span>
                          <strong>{t[message.water]}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                  {message.kind === "proposal" &&
                    app.pending?.id === message.id && (
                      <div className="message-actions">
                        <button
                          className="primary-button"
                          disabled={busy}
                          onClick={app.confirm}
                        >
                          <Icon name="check" size={18} />
                          {t.confirm}
                        </button>
                        <button
                          className="plain-button"
                          disabled={busy}
                          onClick={app.keep}
                        >
                          {t.keep}
                        </button>
                      </div>
                    )}
                  {message.audio?.status === "available" && (
                    <button
                      className="listen-reply"
                      onClick={() => app.play(message.id, message.audio!)}
                    >
                      <Icon name="sound" size={16} />
                      {app.playing === message.id
                        ? t.stopPlayback
                        : t.replayLabel}
                    </button>
                  )}
                  {message.retry && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void app.sendText(message.retry!)}
                    >
                      {t.retryMessage}
                    </button>
                  )}
                </div>
              </article>
            ))}
            {busy && !capturing && (
              <div className="assistant-working" role="status">
                <span className="working-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  {app.phase === "explaining" ? t.explaining : t.typing}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {unread && (
        <button className="new-messages" onClick={bottom}>
          {t.newMessages} ↓
        </button>
      )}
      <div className="chat-input-zone">
        {app.messages.length > 0 && !capturing && (
          <div className="followup-prompts">
            <button
              disabled={busy}
              onClick={() =>
                void app.ask(
                  app.water === "one" ? "explain-checks" : "explain-change",
                )
              }
            >
              {app.water === "one" ? t.suggestCheck : t.suggestChange}
            </button>
            <Link to="/sample">{t.goSample}</Link>
            <button onClick={() => setHelp(true)}>{t.help}</button>
          </div>
        )}
        {capturing ? (
          <div className="recording-composer" role="status">
            <button
              className="icon-button"
              aria-label={t.voiceCancel}
              onClick={() => app.cancel()}
            >
              <Icon name="close" />
            </button>
            <div className="recording-copy">
              <strong>
                {app.phase === "starting" ? t.requestMic : t.listening}
              </strong>
              <span>
                {app.phase === "starting" ? t.voiceLimit : t.recordHelp}
              </span>
            </div>
            <button
              className="record-finish"
              aria-label={t.voiceStop}
              disabled={app.phase === "starting"}
              onClick={() => void app.toggleMic()}
            >
              <span />
            </button>
          </div>
        ) : (
          <form className="chat-composer" onSubmit={submit}>
            <textarea
              ref={input}
              rows={2}
              maxLength={1200}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  if (draft.trim() && !busy) {
                    const text = draft;
                    setDraft("");
                    void app.sendText(text);
                  }
                }
              }}
              aria-label={t.typePlaceholder}
              placeholder={t.typePlaceholder}
              disabled={busy}
            />
            <div className="composer-tools">
              <label className="reply-toggle">
                <input
                  type="checkbox"
                  checked={app.spoken}
                  onChange={(event) => app.setSpoken(event.target.checked)}
                  disabled={busy}
                />
                <Icon name="sound" size={17} />
                <span>{t.readAloud}</span>
              </label>
              <div className="composer-buttons">
                {busy ? (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={t.cancelRequest}
                    onClick={() => app.cancel(true)}
                  >
                    <Icon name="close" size={20} />
                  </button>
                ) : (
                  <button
                    className="mic-compose"
                    type="button"
                    aria-label={t.voiceStart}
                    title={t.voiceStart}
                    onClick={() => void app.toggleMic()}
                  >
                    <Icon name="mic" size={21} />
                  </button>
                )}
                <button
                  className="send-button"
                  type="submit"
                  aria-label={t.send}
                  title={t.send}
                  disabled={busy || !draft.trim()}
                >
                  <Icon name="send" size={21} />
                </button>
              </div>
            </div>
          </form>
        )}
        {app.playbackNotice && (
          <p className="composer-note" role="status">
            {app.playbackNotice}
          </p>
        )}
        <div className="composer-footnote">
          <span>{capturing ? t.voiceLimit : t.privacyShort}</span>
          {app.messages.length === 0 && (
            <button onClick={() => setHelp(true)}>{t.help}</button>
          )}
        </div>
      </div>
      <dialog
        className="k-dialog"
        ref={dialog}
        onCancel={() => setHelp(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setHelp(false);
        }}
      >
        <div>
          <button
            className="dialog-close icon-button"
            aria-label={t.close}
            onClick={() => setHelp(false)}
          >
            <Icon name="close" />
          </button>
          <Icon name="talk" size={30} />
          <h2>{t.helpTitle}</h2>
          <p>{t.chatHelpNote}</p>
          <div className="help-actions">
            <button
              onClick={() => {
                setHelp(false);
                void app.ask();
              }}
            >
              {t.suggestCheck}
              <Icon name="arrow" size={18} />
            </button>
            <button
              onClick={() => {
                setHelp(false);
                app.chooseWater("none");
              }}
            >
              {t.suggestWater}
              <Icon name="arrow" size={18} />
            </button>
          </div>
          <p className="muted">{t.limitIntro}</p>
        </div>
      </dialog>
    </section>
  );
}
