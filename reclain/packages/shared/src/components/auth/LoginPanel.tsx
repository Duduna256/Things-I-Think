"use client";

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { emailLinkSignIn, googleSignIn, passwordSignIn, passwordSignUp } from "../../auth/actions";
import { Icon } from "../Icon";
import type { AuthField, AuthFormState, LoginView } from "./logic";

const IDLE: AuthFormState = { status: "idle" };

export interface LoginMethods {
  link: boolean;
  password: boolean;
  google: boolean;
}

// The real log-in: "Continue with Google", "Email me a link", and email and password with a
// Log in / Create account switch. Each is a Server Action; this file only handles the screen.
export function LoginPanel({ next, methods, initialView }: { next: string; methods: LoginMethods; initialView: LoginView }) {
  const firstView: LoginView = initialView === "link" && !methods.link ? "login" : initialView !== "link" && !methods.password ? "link" : initialView;
  const [view, setView] = useState<LoginView>(firstView);
  // The email typed so far, carried over when switching between forms.
  const [email, setEmail] = useState("");
  const body = useRef<HTMLDivElement>(null);
  const focusAfterSwitch = useRef(false);

  useEffect(() => {
    if (!focusAfterSwitch.current) return;
    focusAfterSwitch.current = false;
    body.current?.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
  }, [view]);

  // The button that was clicked disappears, so focus moves to the new form's first field.
  const switchTo = (v: LoginView) => {
    focusAfterSwitch.current = true;
    setView(v);
  };

  const emailForms = methods.link || methods.password;

  return (
    <div className="auth-methods">
      {methods.google && <GoogleForm next={next} />}
      {methods.google && emailForms && (
        <p className="auth-or">
          <span>or use your email</span>
        </p>
      )}
      <div ref={body} className="auth-body">
        {view === "link" && methods.link && (
          <LinkForm next={next} email={email} onEmail={setEmail} onPassword={methods.password ? () => switchTo("login") : undefined} />
        )}
        {view !== "link" && methods.password && (
          <>
            <div className="auth-tabs" role="group" aria-label="Log in or create an account">
              <button type="button" aria-pressed={view === "login"} onClick={() => setView("login")}>
                Log in
              </button>
              <button type="button" aria-pressed={view === "signup"} onClick={() => setView("signup")}>
                Create account
              </button>
            </div>
            {view === "login" ? (
              <PasswordLogin next={next} email={email} onEmail={setEmail} onLink={methods.link ? () => switchTo("link") : undefined} />
            ) : (
              <PasswordSignup
                next={next}
                email={email}
                onEmail={setEmail}
                onLink={methods.link ? () => switchTo("link") : undefined}
                onLogin={() => switchTo("login")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Pieces ----------

function useFocusInvalid(state: AuthFormState) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "error" || !state.field) return;
    const el = form.current?.elements.namedItem(state.field);
    if (el instanceof HTMLElement) el.focus();
  }, [state]);
  return form;
}

function Field({
  id,
  label,
  hint,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {optional && <span className="hint"> {optional}</span>}
      </label>
      {children}
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}

// aria props for a field: marked invalid when the error is about it, and described by its
// hint and (when relevant) the error message.
function fieldProps(state: AuthFormState, field: AuthField, id: string, errId: string, hint = false) {
  const invalid = state.status === "error" && state.field === field;
  const describedBy = [hint ? `${id}-hint` : "", invalid ? errId : ""].filter(Boolean).join(" ");
  return { "aria-invalid": invalid || undefined, "aria-describedby": describedBy || undefined };
}

function FormError({ state, id }: { state: AuthFormState; id: string }) {
  if (state.status !== "error" || !state.message) return null;
  return (
    <p className="form-err auth-err" id={id} role="alert">
      <Icon name="alert" />
      <span>{state.message}</span>
    </p>
  );
}

function PasswordInput({ id, autoComplete, extra }: { id: string; autoComplete: string; extra: Record<string, unknown> }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="auth-pw">
      <input id={id} name="password" type={shown ? "text" : "password"} autoComplete={autoComplete} required maxLength={200} {...extra} />
      <button type="button" className="auth-pw-toggle" aria-pressed={shown} aria-controls={id} onClick={() => setShown(s => !s)}>
        <Icon name="eye" />
        <span className="sr-only">Show password</span>
      </button>
    </span>
  );
}

function GoogleForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(googleSignIn, IDLE);
  const errId = useId();
  return (
    <form action={action} className="auth-google">
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="btn btn-ghost btn-wide" disabled={pending} aria-describedby={state.status === "error" ? errId : undefined}>
        <Icon name="google" className="ic auth-g" />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      <FormError state={state} id={errId} />
    </form>
  );
}

// ---------- "Email me a link" ----------

function LinkForm({
  next,
  email,
  onEmail,
  onPassword,
}: {
  next: string;
  email: string;
  onEmail: (v: string) => void;
  onPassword?: () => void;
}) {
  const [state, action, pending] = useActionState(emailLinkSignIn, IDLE);
  // "Use a different email" hides the sent screen for that result only.
  const [dismissed, setDismissed] = useState<number | undefined>();
  const form = useFocusInvalid(state);
  const ids = useId();
  const errId = `${ids}-err`;
  const sent = state.status === "sent" && state.at !== dismissed;

  // Back from the sent screen: put the cursor in the email field, ready for a new address.
  useEffect(() => {
    if (dismissed !== undefined && !sent) form.current?.querySelector<HTMLInputElement>("input[name=email]")?.focus();
  }, [dismissed, sent, form]);

  if (sent) {
    return (
      <SentPanel
        title="Check your email"
        email={state.values?.email ?? email}
        name={state.values?.name ?? ""}
        next={next}
        onBack={() => setDismissed(state.at)}
      />
    );
  }

  const v = state.values ?? {};
  return (
    <form ref={form} action={action} className="form auth-form" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id={`${ids}-email`} label="Email">
        <input
          id={`${ids}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          placeholder="you@example.com"
          defaultValue={v.email ?? email}
          onChange={e => onEmail(e.target.value)}
          {...fieldProps(state, "email", `${ids}-email`, errId)}
        />
      </Field>
      <Field id={`${ids}-name`} label="Your name" optional="if you're new" hint="So your pro knows who's coming.">
        <input
          id={`${ids}-name`}
          name="name"
          type="text"
          autoComplete="name"
          maxLength={80}
          defaultValue={v.name ?? ""}
          {...fieldProps(state, "name", `${ids}-name`, errId, true)}
        />
      </Field>
      <FormError state={state} id={errId} />
      <button type="submit" className="btn btn-black btn-wide" disabled={pending}>
        <Icon name="mail" />
        {pending ? "Sending your link…" : "Email me a link"}
      </button>
      <p className="auth-small">One tap from your inbox and you&apos;re in. No password to remember.</p>
      {onPassword && (
        <p className="auth-alt">
          Prefer a password?{" "}
          <button type="button" className="link-btn" onClick={onPassword}>
            Use a password instead
          </button>
        </p>
      )}
    </form>
  );
}

function SentPanel({ title, email, name, next, onBack }: { title: string; email: string; name: string; next: string; onBack: () => void }) {
  const [state, action, pending] = useActionState(emailLinkSignIn, IDLE);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="auth-sent">
      <span className="auth-sent-ic" aria-hidden="true">
        <Icon name="mail" />
      </span>
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
      <p>
        We sent a log-in link to <b className="auth-email">{email}</b>. Open it on this phone or computer and you&apos;ll land right
        back here.
      </p>
      <p className="hint">It can take a minute. If it&apos;s not there, look in spam or promotions.</p>
      <form action={action} className="auth-resend">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="name" value={name} />
        <button type="submit" className="btn btn-ghost btn-wide" disabled={pending}>
          {pending ? "Sending…" : "Send it again"}
        </button>
      </form>
      <p className="form-ok" role="status">
        {state.status === "sent" ? "Sent again. Give it a minute to arrive." : ""}
      </p>
      {state.status === "error" && (
        <p className="form-err" role="alert">
          {state.message}
        </p>
      )}
      <button type="button" className="link-btn" onClick={onBack}>
        Use a different email
      </button>
    </div>
  );
}

// ---------- Email and password ----------

function PasswordLogin({
  next,
  email,
  onEmail,
  onLink,
}: {
  next: string;
  email: string;
  onEmail: (v: string) => void;
  onLink?: () => void;
}) {
  const [state, action, pending] = useActionState(passwordSignIn, IDLE);
  const form = useFocusInvalid(state);
  const ids = useId();
  const errId = `${ids}-err`;
  const v = state.values ?? {};
  return (
    <form ref={form} action={action} className="form auth-form" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id={`${ids}-email`} label="Email">
        <input
          id={`${ids}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          defaultValue={v.email ?? email}
          onChange={e => onEmail(e.target.value)}
          {...fieldProps(state, "email", `${ids}-email`, errId)}
        />
      </Field>
      <Field id={`${ids}-pw`} label="Password">
        <PasswordInput id={`${ids}-pw`} autoComplete="current-password" extra={fieldProps(state, "password", `${ids}-pw`, errId)} />
      </Field>
      <FormError state={state} id={errId} />
      <button type="submit" className="btn btn-black btn-wide" disabled={pending}>
        {pending ? "Logging you in…" : "Log in"}
      </button>
      {onLink && (
        <p className="auth-alt">
          Forgotten your password?{" "}
          <button type="button" className="link-btn" onClick={onLink}>
            Email me a link instead
          </button>
        </p>
      )}
    </form>
  );
}

function PasswordSignup({
  next,
  email,
  onEmail,
  onLink,
  onLogin,
}: {
  next: string;
  email: string;
  onEmail: (v: string) => void;
  onLink?: () => void;
  onLogin: () => void;
}) {
  const [state, action, pending] = useActionState(passwordSignUp, IDLE);
  const form = useFocusInvalid(state);
  const ids = useId();
  const errId = `${ids}-err`;
  const heading = useRef<HTMLHeadingElement>(null);
  const confirming = state.status === "confirm";
  useEffect(() => {
    if (confirming) heading.current?.focus();
  }, [confirming, state.at]);

  if (confirming) {
    return (
      <div className="auth-sent">
        <span className="auth-sent-ic" aria-hidden="true">
          <Icon name="mail" />
        </span>
        <h2 ref={heading} tabIndex={-1}>
          Confirm your email
        </h2>
        <p>
          We sent a link to <b className="auth-email">{state.values?.email}</b>. Tap it to finish setting up your account and
          you&apos;ll land right back here.
        </p>
        <p className="hint">
          Already have an account with that email? Then no new email is coming, so log in instead. Nothing after a few minutes?
          Check spam or promotions.
        </p>
        <button type="button" className="btn btn-ghost btn-wide" onClick={onLogin}>
          Go to log in
        </button>
        {onLink && (
          <button type="button" className="link-btn" onClick={onLink}>
            Email me a log-in link instead
          </button>
        )}
      </div>
    );
  }

  const v = state.values ?? {};
  return (
    <form ref={form} action={action} className="form auth-form" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id={`${ids}-name`} label="Your name">
        <input
          id={`${ids}-name`}
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={v.name ?? ""}
          {...fieldProps(state, "name", `${ids}-name`, errId)}
        />
      </Field>
      <Field id={`${ids}-phone`} label="Mobile number" optional="optional" hint="For booking texts and MoMo prompts. You can add it later.">
        <input
          id={`${ids}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="0772 123 456"
          defaultValue={v.phone ?? ""}
          {...fieldProps(state, "phone", `${ids}-phone`, errId, true)}
        />
      </Field>
      <Field id={`${ids}-email`} label="Email">
        <input
          id={`${ids}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          defaultValue={v.email ?? email}
          onChange={e => onEmail(e.target.value)}
          {...fieldProps(state, "email", `${ids}-email`, errId)}
        />
      </Field>
      <Field id={`${ids}-pw`} label="Password" hint="At least 8 characters.">
        <PasswordInput id={`${ids}-pw`} autoComplete="new-password" extra={fieldProps(state, "password", `${ids}-pw`, errId, true)} />
      </Field>
      <FormError state={state} id={errId} />
      <button type="submit" className="btn btn-black btn-wide" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </button>
      {onLink && (
        <p className="auth-alt">
          Rather skip the password?{" "}
          <button type="button" className="link-btn" onClick={onLink}>
            Email me a link instead
          </button>
        </p>
      )}
    </form>
  );
}
