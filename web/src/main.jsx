import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  ChevronDown,
  Code2,
  Command,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode2,
  FolderGit2,
  GitBranch,
  Github,
  Globe,
  History,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  Monitor,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  TriangleAlert,
  X,
  Zap,
  Box,
  BookOpen,
  CheckCircle2,
  Radio,
  RefreshCw,
  FlaskConical,
  Save,
  Bug,
  Workflow,
} from "lucide-react";
import "./styles.css";
const ADMIN = import.meta.env.VITE_ADMIN_MODE === "true";
const SITE = "https://polite-river-00fb9ed10.4.azurestaticapps.net";
const install = `npm install -g ${SITE}/downloads/qwik-cli.tgz`;
async function api(path, method = "GET", body) {
  const r = await fetch(`/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Qwik-Request": "1" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw new Error(
      "The service is temporarily unavailable. Please try again.",
    );
  }
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}
function go(path) {
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}
function Link({ to, children, ...rest }) {
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        if (rest.onClick) rest.onClick(e);
        if (
          !e.metaKey &&
          !e.ctrlKey &&
          !rest.target &&
          !to.startsWith("http") &&
          !to.startsWith("/.auth")
        ) {
          e.preventDefault();
          go(to);
        }
      }}
    >
      {children}
    </a>
  );
}
function Logo({ small = false }) {
  return (
    <Link to={ADMIN ? "/" : "/"} className={`logo ${small ? "small" : ""}`}>
      <span className="logo-mark">
        <Zap size={small ? 17 : 20} fill="currentColor" />
      </span>
      <span>
        qwik<span className="logo-dot">.</span>
      </span>
      {ADMIN && <span className="admin-tag">ADMIN</span>}
    </Link>
  );
}
function Button({
  children,
  variant = "",
  busy = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`button ${variant} ${props.className || ""}`}
    >
      {busy ? (
        <Loader2 className="spin" size={16} />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  );
}
function Badge({ children, tone = "" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-button"
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copy this value:", value);
        }
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
function CommandBox({ children }) {
  return (
    <div className="command-box">
      <span className="prompt">$</span>
      <code>{children}</code>
      <CopyButton value={String(children)} />
    </div>
  );
}
function Empty({ icon: Icon = FolderGit2, title, description, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
function ErrorBox({ error }) {
  return error ? (
    <div className="error-box" role="alert">
      <TriangleAlert size={16} />
      {error}
    </div>
  ) : null;
}
function Modal({ title, subtitle, children, onClose }) {
  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", handle);
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="icon-button close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="modal-symbol">
          <Zap size={23} />
        </div>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}
const sampleFindings = [
  {
    fingerprint: "example-1",
    ruleId: "QWK003",
    title: "Hardcoded credential",
    severity: "high",
    file: "src/lib/payments.ts",
    line: 12,
    description:
      "A credential-like value is assigned directly in source. Verify whether it is real.",
    remediation:
      "Rotate the credential if it is real, remove it from source, and load it from your secret manager.",
    source: "rules",
  },
  {
    fingerprint: "example-2",
    ruleId: "QWK008",
    title: "Unsafe HTML insertion",
    severity: "medium",
    file: "src/components/Preview.tsx",
    line: 38,
    description:
      "Raw HTML is inserted into the DOM. Unsanitized content could lead to cross-site scripting.",
    remediation: "Render text normally or use a maintained HTML sanitizer.",
    source: "rules",
  },
];
function TerminalPreview() {
  return (
    <div className="terminal-preview">
      <div className="terminal-toolbar">
        <div className="traffic">
          <i />
          <i />
          <i />
        </div>
        <span>
          <Terminal size={12} /> ~/projects/next-big-thing
        </span>
        <span className="terminal-example">EXAMPLE SCAN</span>
      </div>
      <div className="terminal-body">
        <div className="terminal-input">
          <span>❯</span> qwik scan
          <span className="cursor" />
        </div>
        <p className="terminal-brand">
          ϟ qwik <span>v0.1.0</span>
        </p>
        <p className="terminal-muted">
          A little confidence before your next commit.
        </p>
        <div className="terminal-steps">
          <p>
            <Check size={14} /> Reading project files <span>48 files</span>
          </p>
          <p>
            <Check size={14} /> Checking code & infrastructure{" "}
            <span>complete</span>
          </p>
          <p>
            <Check size={14} /> Reviewing dependencies <span>complete</span>
          </p>
        </div>
        <div className="terminal-finding">
          <span className="severity-dot high" />
          <strong>Hardcoded credential</strong>
          <Badge tone="high">HIGH</Badge>
          <small>src/lib/payments.ts:12</small>
        </div>
        <div className="terminal-finding">
          <span className="severity-dot medium" />
          <strong>Unsafe HTML insertion</strong>
          <Badge tone="medium">MEDIUM</Badge>
          <small>src/components/Preview.tsx:38</small>
        </div>
        <div className="terminal-summary">
          <span>
            <CheckCheck size={14} /> Findings synced to your workspace
          </span>
          <ArrowUpRight size={15} />
        </div>
        <div className="terminal-prompt">
          <span>❯</span> <span className="cursor" />
        </div>
      </div>
      <div className="terminal-footer">
        <span>
          <span className="status-dot" /> LOCAL RULE ENGINE
        </span>
        <span>
          your code stays yours <LockKeyhole size={11} />
        </span>
      </div>
    </div>
  );
}
function Landing() {
  const [menu, setMenu] = useState(false);
  return (
    <div className="landing">
      <nav className="public-nav wrap">
        <Logo />
        <div className={`nav-links ${menu ? "mobile-open" : ""}`}>
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <Link to="/docs">
            Docs <ArrowUpRight size={12} />
          </Link>
          <a
            href="https://github.com/gitachi143/qwik"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={15} /> GitHub
          </a>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="text-link">
            Log in
          </Link>
          <Link to="/signup" className="button small-button">
            Start for free <ArrowUpRight size={14} />
          </Link>
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow-pill">
              <span className="status-dot" /> OPEN SOURCE. OPEN TO EVERYONE.
              <ChevronRight size={13} />
            </div>
            <h1>
              Ship fast.
              <br />
              Stay <span className="hero-highlight">secure.</span>
            </h1>
            <p className="hero-description">
              Big ideas move fast. Your code review should too.
              <br className="desktop-break" /> Find vulnerabilities, catch risky
              code, and keep building.
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="button">
                Start building with confidence <ArrowUpRight size={17} />
              </Link>
              <Link to="/demo" className="button ghost">
                <Monitor size={16} /> Explore the demo
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <Check size={14} /> Free core scanner
              </span>
              <span>
                <Check size={14} /> Bring your own model
              </span>
              <span>
                <Check size={14} /> No credit card
              </span>
            </div>
            <div className="hero-install">
              <div className="micro-label">ONE COMMAND. A CLEARER PICTURE.</div>
              <CommandBox>{install}</CommandBox>
              <span className="install-note">
                Node.js 22+ <span>·</span> macOS, Linux & Windows
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-grid" />
            <div className="floating-label">
              <ShieldCheck size={14} /> Your next commit, with confidence.
            </div>
            <TerminalPreview />
            <div className="visual-bottom">
              <span className="little-line" />
              <span>Built for the way you actually code.</span>
              <Command size={14} />
            </div>
          </div>
        </section>
        <div className="principles wrap">
          <span>LESS FRICTION. MORE BUILDING.</span>
          <div>
            <Terminal size={17} /> Terminal-first
          </div>
          <div>
            <GitBranch size={17} /> Fits your Git workflow
          </div>
          <div>
            <Box size={17} /> Local or cloud models
          </div>
          <div>
            <Code2 size={17} /> Open-source by default
          </div>
        </div>
        <section className="section wrap" id="how-it-works">
          <div className="section-heading">
            <div>
              <div className="kicker">FROM FIRST IDEA TO NEXT COMMIT</div>
              <h2>Security that stays in your flow.</h2>
            </div>
            <p>
              No complicated setup. No new rituals.
              <br />
              Just a little more certainty, every time you ship.
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                n: "01",
                icon: Terminal,
                title: "Make yourself at home.",
                text: "Install Qwik, sign in, and open any project. One command connects your terminal to your workspace.",
                cmd: "qwik login",
              },
              {
                n: "02",
                icon: Search,
                title: "Find what needs a second look.",
                text: "Scan for risky patterns, exposed secrets, and known dependency vulnerabilities. Add your own model for a deeper review.",
                cmd: "qwik scan",
              },
              {
                n: "03",
                icon: GitBranch,
                title: "Keep the good commits coming.",
                text: "See actionable findings in your terminal and on the web. Add commit hooks and PR checks when you’re ready.",
                cmd: "qwik hooks",
              },
            ].map((s) => (
              <article className="step" key={s.n}>
                <div className="step-top">
                  <s.icon size={23} />
                  <span>{s.n}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <code>
                  <span>$</span> {s.cmd}
                </code>
              </article>
            ))}
          </div>
        </section>
        <section className="section wrap" id="features">
          <div className="section-heading">
            <div>
              <div className="kicker">POWERFUL, WITHOUT THE OVERHEAD</div>
              <h2>Your code. Your models. Your call.</h2>
            </div>
            <Link to="/docs" className="text-link">
              Meet the toolkit <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="features-grid">
            <article className="feature feature-wide">
              <div className="feature-icon">
                <SlidersHorizontal size={22} />
              </div>
              <h3>Bring your favorite brain.</h3>
              <p>
                Use an OpenAI-compatible API or an open model running locally
                with Ollama. You choose where your code goes and what it costs.
              </p>
              <div className="model-chips">
                <span>
                  <Globe size={16} /> Your API
                </span>
                <span>
                  <Terminal size={16} /> Ollama
                </span>
                <span>
                  <Code2 size={16} /> Open models
                </span>
              </div>
            </article>
            <article className="feature">
              <div className="feature-icon">
                <History size={22} />
              </div>
              <h3>One place for every finding.</h3>
              <p>
                Local scans, web reviews, and CI results. A shared history that
                doesn’t disappear when you close your terminal.
              </p>
              <div className="mini-lines">
                <i />
                <i />
                <i />
              </div>
            </article>
            <article className="feature">
              <div className="feature-icon">
                <Box size={22} />
              </div>
              <h3>A little room to experiment.</h3>
              <p>
                Run commands in a restricted local Docker container with no
                network, read-only source, and resource limits.
              </p>
              <code className="mini-code">qwik sandbox -- node --version</code>
            </article>
            <article className="feature feature-wide">
              <div className="feature-icon">
                <ShieldCheck size={22} />
              </div>
              <h3>Useful reviews. No mystery score.</h3>
              <p>
                Get a location, a reason, and a next step. Review findings, mark
                false positives, and understand exactly what each scan covered.
              </p>
              <div className="inline-checks">
                <span>
                  <Check size={14} /> Clear evidence
                </span>
                <span>
                  <Check size={14} /> Actionable fixes
                </span>
                <span>
                  <Check size={14} /> Honest coverage
                </span>
              </div>
            </article>
          </div>
        </section>
        <section className="closing wrap">
          <div className="kicker">A SMALL COMMAND. A BETTER HABIT.</div>
          <h2>
            Build the thing.
            <br />
            <span>We’ll help you look it over.</span>
          </h2>
          <Link className="button" to="/signup">
            Get started for free <ArrowUpRight size={17} />
          </Link>
          <p>
            Free, open-source rules. Optional model costs are yours to control.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
function Footer() {
  return (
    <footer className="public-footer wrap">
      <Logo small />
      <span>Made for the next thing you build.</span>
      <div>
        <Link to="/docs">Documentation</Link>
        <Link to="/privacy">Privacy</Link>
        <a
          href="https://github.com/gitachi143/qwik"
          target="_blank"
          rel="noreferrer"
        >
          Source code <ArrowUpRight size={12} />
        </a>
      </div>
      <small>© {new Date().getFullYear()} Qwik</small>
    </footer>
  );
}
function Auth({ mode = "login", onAuthenticated }) {
  const signup = mode === "signup",
    recover = mode === "recover";
  const [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      recoveryCode: "",
    }),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState("");
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(
        ADMIN ? "auth/admin" : `auth/${mode}`,
        "POST",
        form,
      );
      if (result.recoveryCode) setRecovery(result.recoveryCode);
      else await onAuthenticated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-top">
        <Logo />
        <Link to="/docs" className="text-link">
          Need a hand? <ArrowUpRight size={14} />
        </Link>
      </div>
      <main className="auth-layout">
        <aside className="auth-story">
          <Badge tone="green">
            {ADMIN
              ? "QWIK CONTROL ROOM"
              : "BUILD WITH A LITTLE MORE CONFIDENCE"}
          </Badge>
          <h1>
            {ADMIN ? (
              <>
                A sharper eye.
                <br />
                <span>Every review.</span>
              </>
            ) : (
              <>
                Less second-guessing.
                <br />
                <span>More shipping.</span>
              </>
            )}
          </h1>
          <p>
            {ADMIN
              ? "Manage review policies, track missed findings, and investigate emerging vulnerabilities."
              : "From your first side project to your next big idea, Qwik helps you see what deserves a second look."}
          </p>
          <div className="auth-terminal">
            <span className="muted">~/your-next-big-thing</span>
            <p>
              <span className="lime">❯</span> qwik
            </p>
            <p className="lime">
              <Check size={15} /> You build. We’ll look it over.
            </p>
          </div>
          <div className="auth-bottom">
            <Shield size={16} />
            {ADMIN
              ? "Separate admin session · protected workspace"
              : "Your source stays local unless you choose to share it."}
          </div>
        </aside>
        <section className="auth-card">
          {recovery ? (
            <>
              <div className="auth-icon">
                <KeyRound size={25} />
              </div>
              <h2>Save your recovery code.</h2>
              <p>
                This is the only time we show it. Keep it somewhere safe—you’ll
                need it to reset your password.
              </p>
              <div className="secret-box">
                <code>{recovery}</code>
                <CopyButton value={recovery} />
              </div>
              <p className="small muted">
                Qwik doesn’t send recovery emails. This code replaces your
                previous recovery code, if you had one.
              </p>
              <Button onClick={onAuthenticated}>
                I’ve saved it. Open my workspace <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <div className="auth-icon">
                {ADMIN ? <LockKeyhole size={25} /> : <Zap size={25} />}
              </div>
              <h2>
                {ADMIN
                  ? "Admin sign in"
                  : signup
                    ? "Your next chapter starts here."
                    : recover
                      ? "Back to building."
                      : "Good to see you again."}
              </h2>
              <p>
                {ADMIN
                  ? "Enter your administrator password."
                  : signup
                    ? "Create your free Qwik workspace."
                    : recover
                      ? "Use your saved recovery code to reset your password."
                      : "Sign in to your Qwik workspace."}
              </p>
              {!ADMIN && !recover && (
                <>
                  <a
                    className="button ghost full"
                    href="/.auth/login/github?post_login_redirect_uri=/app"
                  >
                    <Github size={18} /> Continue with GitHub
                  </a>
                  <div className="divider">
                    <span>or continue with email</span>
                  </div>
                </>
              )}
              <form onSubmit={submit}>
                {signup && !ADMIN && (
                  <label>
                    Your name
                    <input
                      autoComplete="name"
                      required
                      placeholder="Alex Morgan"
                      {...field("name")}
                    />
                  </label>
                )}
                {!ADMIN && (
                  <label>
                    Email address
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      {...field("email")}
                    />
                  </label>
                )}
                {recover && (
                  <label>
                    Recovery code
                    <input
                      autoComplete="off"
                      required
                      placeholder="Your saved recovery code"
                      {...field("recoveryCode")}
                    />
                  </label>
                )}
                <label>
                  {recover ? "New password" : "Password"}
                  <div className="password-input">
                    <input
                      type={visible ? "text" : "password"}
                      autoComplete={
                        signup || recover ? "new-password" : "current-password"
                      }
                      required
                      minLength={signup || recover ? 12 : 1}
                      maxLength={128}
                      placeholder={
                        signup
                          ? "At least 12 characters"
                          : "Enter your password"
                      }
                      {...field("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? "Hide password" : "Show password"}
                    >
                      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
                {!signup && !recover && !ADMIN && (
                  <Link to="/recover" className="forgot">
                    Forgot your password?
                  </Link>
                )}
                <ErrorBox error={error} />
                <Button busy={busy} type="submit" className="full">
                  {ADMIN
                    ? "Open admin portal"
                    : signup
                      ? "Create your account"
                      : recover
                        ? "Reset password"
                        : "Sign in"}
                  <ArrowRight size={16} />
                </Button>
              </form>
              {!ADMIN && (
                <p className="auth-switch">
                  {signup ? "Already have a workspace?" : "New to Qwik?"}{" "}
                  <Link to={signup ? "/login" : "/signup"}>
                    {signup ? "Sign in" : "Create an account"}
                  </Link>
                </p>
              )}
              {signup && (
                <p className="legal-note">
                  By creating an account, you acknowledge our{" "}
                  <Link to="/privacy">privacy notice</Link>. Core scans are
                  free. Your model provider may charge for usage.
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
function Docs({ privacy = false }) {
  return (
    <div className="docs-page">
      <nav className="public-nav wrap">
        <Logo />
        <div className="nav-actions">
          <Link to="/" className="text-link">
            Home
          </Link>
          <Link to="/app" className="button small-button">
            Open workspace <ArrowUpRight size={14} />
          </Link>
        </div>
      </nav>
      <main className="docs-layout wrap">
        <aside>
          <div className="kicker">QWIK HANDBOOK</div>
          {[
            "Get started",
            "Scan your project",
            "Connect a model",
            "GitHub automation",
            "Sandbox",
            "Coverage and limits",
            "Account recovery",
          ].map((t, i) => (
            <a key={t} href={`#doc-${i}`}>
              {t}
            </a>
          ))}
          <Link to="/privacy">Privacy notice</Link>
        </aside>
        <article>
          <Badge tone="green">
            {privacy
              ? "YOUR CODE, YOUR CHOICE"
              : "A LITTLE HELP GETTING STARTED"}
          </Badge>
          <h1>
            {privacy
              ? "Privacy, in plain language."
              : "From zero to your first review."}
          </h1>
          <p className="lead">
            {privacy
              ? "Here’s what Qwik processes and where it goes."
              : "Install once. Scan anywhere. Keep building."}
          </p>
          {privacy ? (
            <>
              <h2>Local scans</h2>
              <p>
                Source files stay on your computer when using the built-in rule
                engine. When you are signed in, Qwik receives project metadata,
                file paths, findings, commit references, coverage details, and
                pinned dependency names and versions. Do not put confidential
                information in project names.
              </p>
              <h2>Web scans and model reviews</h2>
              <p>
                A web scan retrieves selected files from GitHub and processes
                them in memory. Qwik does not persist those source files. Opting
                into a model review sends selected source to your configured
                provider. That provider’s policies and charges apply. Ollama
                reviews run from your CLI.
              </p>
              <h2>Dependency advisories</h2>
              <p>
                Dependency checks send package names and versions to OSV.dev.
                Disable them in the CLI with --no-deps.
              </p>
              <h2>Accounts and credentials</h2>
              <p>
                Passwords are hashed with scrypt. Session cookies are HTTP-only.
                Provider and GitHub tokens are encrypted at rest with a
                server-held key. Qwik administrators operate the service and can
                investigate stored dependency inventories for new advisories.
              </p>
              <h2>Retention and control</h2>
              <p>
                Scan history remains in Azure storage until deleted. Deleting a
                project removes its scan history. Revoke CLI tokens in Settings,
                clear provider credentials there, and use the source
                repository’s issue tracker for data requests. Email ownership is
                not verified; use your recovery code to recover email accounts.
              </p>
            </>
          ) : (
            <>
              <section id="doc-0">
                <h2>01 — Get started</h2>
                <p>
                  Create an account, save your recovery code, and install the
                  CLI with Node.js 22 or newer.
                </p>
                <CommandBox>{install}</CommandBox>
                <CommandBox>qwik login</CommandBox>
                <p>
                  Approve the device code in your browser. Your login lasts up
                  to 90 days and can be revoked in Settings.
                </p>
              </section>
              <section id="doc-1">
                <h2>02 — Scan your project</h2>
                <CommandBox>qwik scan</CommandBox>
                <p>
                  Run <code>qwik</code> for an interactive session. Use{" "}
                  <code>/scan</code>, <code>/history</code>, <code>/watch</code>
                  , and <code>/exit</code>. The watch command monitors new
                  commits while the terminal is open. <code>qwik hooks</code>{" "}
                  installs a post-commit hook that works when the terminal is
                  closed.
                </p>
                <p>
                  A Git project scans tracked files. To keep scan results local,
                  use <code>--offline</code>. Add <code>--no-deps</code> to
                  disable the network request to OSV.
                </p>
              </section>
              <section id="doc-2">
                <h2>03 — Connect a model</h2>
                <CommandBox>qwik model</CommandBox>
                <p>
                  Choose Ollama or a compatible API. For Ollama, use{" "}
                  <code>http://127.0.0.1:11434</code> and the name of a model
                  you have already pulled. For a hosted model, use a base URL
                  ending in <code>/v1</code> and set your key in{" "}
                  <code>QWIK_MODEL_API_KEY</code>.
                </p>
                <CommandBox>qwik scan --ai</CommandBox>
                <p>
                  Model review is opt-in. Selected source is sent to the
                  configured endpoint. Web model settings and CLI model settings
                  are separate; a website cannot reach Ollama on your computer.
                </p>
              </section>
              <section id="doc-3">
                <h2>04 — GitHub automation</h2>
                <p>
                  Add a repository in Projects, then open its “Set up CI” panel.
                  Create a project token, save it as a repository Actions secret
                  named <code>QWIK_TOKEN</code>, and add the generated workflow
                  to <code>.github/workflows/qwik.yml</code>.
                </p>
                <p>
                  The workflow runs on pushes and pull requests, publishes a
                  check and a job summary, and adds a result comment to
                  same-repository PRs. Fork PRs skip authenticated scanning
                  because GitHub does not expose repository secrets to them. It
                  never runs checked-out project code.
                </p>
              </section>
              <section id="doc-4">
                <h2>05 — Sandbox</h2>
                <p>
                  Install and start Docker, then pull a trusted image yourself.
                </p>
                <CommandBox>docker pull node:22-alpine</CommandBox>
                <CommandBox>qwik sandbox -- node --version</CommandBox>
                <p>
                  The sandbox disables networking, mounts your project
                  read-only, drops capabilities, runs as a non-root user, and
                  limits execution to 60 seconds, 512 MB memory, and one CPU. It
                  is a local Docker container, not a hardened service for
                  executing hostile code. Never mount sensitive projects into
                  untrusted images.
                </p>
              </section>
              <section id="doc-5">
                <h2>06 — Know what was reviewed</h2>
                <p>
                  Qwik’s rules are pattern checks, not full data-flow analysis.
                  Findings need human review. Local scans cover up to 500 files
                  / 3 MB; web scans cover up to 60 files / 600 KB. Large,
                  binary, generated, and unsupported files may be excluded.
                  Model review covers up to 60 KB of selected source.
                </p>
                <p>
                  Dependency coverage currently includes npm package-lock.json
                  and pinned Python requirements.txt, up to 200 unique versions.
                  OSV findings use a conservative “high” review priority, not a
                  verified CVSS rating. Results report service failures and
                  truncation explicitly. Scan records retain up to 75 findings;
                  scan smaller projects when limits are reached.
                </p>
                <p>
                  Hosted workspace limits: 50 projects, 20 web scans per day,
                  and 100 CLI scan uploads per day. Optional model providers and
                  hosting resources can incur charges.
                </p>
              </section>
              <section id="doc-6">
                <h2>07 — Keep your account recoverable</h2>
                <p>
                  Save the recovery code shown at signup. Email accounts do not
                  use verification or recovery emails yet. Resetting your
                  password requires that code. GitHub accounts use GitHub’s
                  recovery process.
                </p>
              </section>
            </>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
function relativeTime(date) {
  if (!date) return "Not scanned yet";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(date)) / 60000),
  );
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}
function Severity({ value }) {
  return (
    <span className={`severity ${value}`}>
      <span className={`severity-dot ${value}`} />
      {value}
    </span>
  );
}
function workflow(projectId) {
  return `name: Qwik security review\non: [push, pull_request, workflow_dispatch]\npermissions:\n  contents: read\n  pull-requests: write\njobs:\n  scan:\n    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          persist-credentials: false\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - run: npm install -g ${SITE}/downloads/qwik-cli.tgz\n      - name: Review source\n        id: scan\n        continue-on-error: true\n        env:\n          QWIK_TOKEN: \${{ secrets.QWIK_TOKEN }}\n          QWIK_PROJECT_ID: ${projectId}\n        run: qwik scan --require-sync --fail-on-high --output "$RUNNER_TEMP/qwik-report.json"\n      - name: Publish review\n        if: always()\n        uses: actions/github-script@v7\n        with:\n          script: |\n            const fs = require('fs');\n            const path = process.env.RUNNER_TEMP + '/qwik-report.json';\n            if (!fs.existsSync(path)) { core.setFailed('Qwik did not produce a report.'); return; }\n            const r = JSON.parse(fs.readFileSync(path, 'utf8'));\n            const safe = s => String(s).replace(/[<>\\r\\n]/g, ' ').replace(/@/g, '@\\u200b').slice(0, 180);\n            const body = '## Qwik security review\\n\\n' + r.filesScanned + ' files · ' + r.findings.length + ' findings\\n\\n' + r.findings.slice(0, 20).map(f => '- **' + safe(f.severity) + '**: ' + safe(f.title) + ' — ' + safe(f.file) + ':' + f.line).join('\\n') + '\\n\\n' + (r.url ? '[View scan](' + r.url + ')' : 'Sync unavailable') + '\\n\\nDependency coverage: ' + safe(r.dependencyStatus) + '\\nAutomated findings need human review.';\n            await core.summary.addRaw(body).write();\n            if (context.eventName === 'pull_request') {\n              await github.rest.issues.createComment({ ...context.repo, issue_number: context.issue.number, body });\n            }\n            if (r.syncError || !r.url || r.dependencyStatus?.includes('incomplete') || r.findings.some(f => ['high', 'critical'].includes(f.severity))) core.setFailed('Qwik found issues needing attention or could not sync.');\n`;
}
function ProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", repository: "" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Make room for your next idea."
      subtitle="Add a GitHub repository for web scans, or start with a local project."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("projects", "POST", form);
            onCreated();
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Project name
          <input
            required
            autoFocus
            placeholder="my-next-big-thing"
            maxLength={70}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          GitHub repository <span className="optional">optional</span>
          <div className="input-with-icon">
            <Github size={17} />
            <input
              placeholder="owner/repository"
              value={form.repository}
              onChange={(e) => setForm({ ...form, repository: e.target.value })}
            />
          </div>
        </label>
        <p className="form-help">
          Public repositories work right away. Add a GitHub token in Settings to
          scan private repositories.
        </p>
        <ErrorBox error={error} />
        <Button busy={busy} type="submit" className="full" icon={Plus}>
          Create project
        </Button>
      </form>
    </Modal>
  );
}
function CiModal({ project, onClose }) {
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="A second look at every push."
      subtitle={`Connect ${project.name} to GitHub Actions.`}
      onClose={onClose}
    >
      <div className="numbered-step">
        <span>1</span>
        <div>
          <h4>Create a project token</h4>
          <p>Scoped to uploads for this project. Expires in 90 days.</p>
        </div>
      </div>
      {token ? (
        <div className="secret-box">
          <code>{token}</code>
          <CopyButton value={token} />
        </div>
      ) : (
        <Button
          variant="ghost"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api("tokens", "POST", {
                name: `CI: ${project.name}`,
                projectId: project.id,
              });
              setToken(r.token);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Generate CI token <KeyRound size={15} />
        </Button>
      )}
      <p className="form-help">
        Save it as a repository Actions secret named <code>QWIK_TOKEN</code>. It
        is shown only once.
      </p>
      <div className="numbered-step">
        <span>2</span>
        <div>
          <h4>Add the workflow</h4>
          <p>
            Save this as <code>.github/workflows/qwik.yml</code> in your
            project.
          </p>
        </div>
      </div>
      <div className="code-block">
        <CopyButton value={workflow(project.id)} label="Copy workflow" />
        <pre>{workflow(project.id)}</pre>
      </div>
      <p className="form-help">
        Runs on pushes and same-repository PRs. Fork PRs skip authenticated
        scans. PR comments are published by your GitHub workflow.
      </p>
      <ErrorBox error={error} />
    </Modal>
  );
}
function ScanTable({ scans, onSelect }) {
  return (
    <div className="table-scroll">
      <table className="scan-table">
        <thead>
          <tr>
            <th>PROJECT / SCAN</th>
            <th>SOURCE</th>
            <th>FINDINGS</th>
            <th>WHEN</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr
              key={s.id}
              onClick={() => onSelect(s)}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(s)}
            >
              <td>
                <div className="table-project">
                  <div className="project-symbol">
                    <FolderGit2 size={18} />
                  </div>
                  <div>
                    <strong>{s.projectName}</strong>
                    <small>
                      <GitBranch size={11} />
                      {s.branch} <span>·</span>{" "}
                      {s.commit?.slice(0, 7) || "local"}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <Badge>
                  {s.source === "cli" ? (
                    <Terminal size={12} />
                  ) : s.source === "web" ? (
                    <Globe size={12} />
                  ) : (
                    <GitBranch size={12} />
                  )}{" "}
                  {s.source.replace("_", " ")}
                </Badge>
              </td>
              <td>
                {s.findings.length ? (
                  <span className="findings-count">
                    <span
                      className={`severity-dot ${s.findings.some((f) => f.severity === "critical" || f.severity === "high") ? "high" : "medium"}`}
                    />
                    {s.findings.length} findings
                  </span>
                ) : (
                  <span className="clear">
                    <Check size={14} /> No findings
                  </span>
                )}
              </td>
              <td className="muted">{relativeTime(s.createdAt)}</td>
              <td>
                <ChevronRight size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function FindingList({ findings, states, onSelect }) {
  return (
    <div className="finding-list">
      {findings.map((f, i) => (
        <button
          className="finding-row"
          key={f.fingerprint + i}
          onClick={() => onSelect(f)}
        >
          <div className={`finding-symbol ${f.severity}`}>
            <Shield size={18} />
          </div>
          <div className="finding-main">
            <strong>{f.title}</strong>
            <small>
              <FileCode2 size={12} />
              {f.file}:{f.line}
              <span>·</span>
              {f.ruleId}
            </small>
          </div>
          <span className="finding-state">
            {states[f.fingerprint] && states[f.fingerprint] !== "open"
              ? states[f.fingerprint]
              : ""}
          </span>
          <Severity value={f.severity} />
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}
function ScanDetail({ scan, onBack, onFinding, states }) {
  const [filter, setFilter] = useState("all");
  const findings = scan.findings.filter(
    (f) => filter === "all" || f.severity === filter,
  );
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> All scans
      </button>
      <div className="page-heading">
        <div>
          <div className="kicker">SCAN REPORT</div>
          <h1>{scan.projectName}</h1>
          <p>
            <GitBranch size={14} /> {scan.branch} <span>·</span>{" "}
            {scan.commit?.slice(0, 7) || "local workspace"} <span>·</span>{" "}
            {new Date(scan.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge tone="green">
          <CheckCheck size={13} /> Recorded
        </Badge>
      </div>
      <div className="stats-grid small-stats">
        <div className="stat-card">
          <span>Files reviewed</span>
          <strong>{scan.filesScanned}</strong>
          <small>Within scan limits</small>
        </div>
        <div className="stat-card">
          <span>Findings</span>
          <strong>{scan.findings.length}</strong>
          <small>Human review recommended</small>
        </div>
        <div className="stat-card">
          <span>High & critical</span>
          <strong className="orange">
            {
              scan.findings.filter((f) =>
                ["critical", "high"].includes(f.severity),
              ).length
            }
          </strong>
          <small>Prioritize these findings</small>
        </div>
        <div className="stat-card">
          <span>Review policy</span>
          <strong>v{scan.promptVersion}</strong>
          <small>Engine {scan.engineVersion}</small>
        </div>
      </div>
      <div className="coverage-bar">
        <ShieldCheck size={18} />
        <div>
          <strong>What this scan covered</strong>
          <p>
            Dependencies: {scan.dependencyStatus || "not reported"} · Model:{" "}
            {scan.modelStatus || "not enabled"}
          </p>
          {scan.coverage && (
            <p>
              {scan.coverage.selectedFiles} of {scan.coverage.availableFiles}{" "}
              candidate files selected · {scan.coverage.limit}
            </p>
          )}
          {scan.truncated && (
            <p className="orange">
              The result limit was reached. Some findings were omitted.
            </p>
          )}
        </div>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>
            Findings <span>{scan.findings.length}</span>
          </h2>
          <select
            aria-label="Filter severity"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All severities</option>
            {["critical", "high", "medium", "low"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {findings.length ? (
          <FindingList
            findings={findings}
            states={states}
            onSelect={onFinding}
          />
        ) : (
          <Empty
            icon={ShieldCheck}
            title="Nothing flagged in this view."
            description="Automated review has limits. Keep human review in your workflow."
          />
        )}
      </section>
    </>
  );
}
function SettingsPanel({ notify, refresh }) {
  const [settings, setSettings] = useState(null),
    [tokens, setTokens] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [newToken, setNewToken] = useState("");
  useEffect(() => {
    Promise.all([api("settings"), api("tokens")])
      .then(([s, t]) => {
        setSettings({ ...s, apiKey: "", githubToken: "" });
        setTokens(t.tokens);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (!settings)
    return (
      <>
        <ErrorBox error={error} />
        <div className="loading">
          <Loader2 className="spin" /> Loading settings…
        </div>
      </>
    );
  return (
    <>
      <ErrorBox error={error} />
      <form
        className="settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("settings", "PUT", {
              ...settings,
              ...(!settings.apiKey ? { apiKey: undefined } : {}),
              ...(!settings.githubToken ? { githubToken: undefined } : {}),
            });
            notify("Settings saved.");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className="panel settings-section">
          <div className="settings-title">
            <div className="feature-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h2>Your model, your choice.</h2>
              <p>Add an optional model review to your web scans.</p>
            </div>
            <Badge>OPTIONAL</Badge>
          </div>
          <div className="form-grid">
            <label>
              Provider
              <select
                value={settings.provider}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    provider: e.target.value,
                    endpoint:
                      e.target.value === "openai"
                        ? "https://api.openai.com/v1"
                        : e.target.value === "ollama"
                          ? "http://127.0.0.1:11434"
                          : settings.endpoint,
                  })
                }
              >
                <option value="none">Built-in rules only</option>
                <option value="openai">OpenAI-compatible API</option>
                <option value="custom">Custom compatible provider</option>
                <option value="ollama">Ollama · local CLI</option>
              </select>
            </label>
            <label>
              Model name
              <input
                placeholder="Your provider’s model ID"
                value={settings.model}
                onChange={(e) =>
                  setSettings({ ...settings, model: e.target.value })
                }
              />
            </label>
            <label className="span-2">
              API base URL
              <input
                type="url"
                placeholder="https://your-provider.example/v1"
                value={settings.endpoint}
                onChange={(e) =>
                  setSettings({ ...settings, endpoint: e.target.value })
                }
              />
            </label>
            <label className="span-2">
              API key{" "}
              {settings.hasApiKey && (
                <span className="saved-label">
                  <Check size={12} /> Saved
                </span>
              )}
              <input
                type="password"
                autoComplete="off"
                placeholder={
                  settings.hasApiKey
                    ? "Leave blank to keep your saved key"
                    : "Your provider API key"
                }
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings({ ...settings, apiKey: e.target.value })
                }
              />
            </label>
          </div>
          {settings.provider === "ollama" ? (
            <div className="info-box">
              <Terminal size={18} />
              <p>
                Ollama runs on your computer. Use <code>qwik model</code>, then{" "}
                <code>qwik scan --ai</code>. The web server cannot reach your
                local model.
              </p>
            </div>
          ) : (
            <p className="form-help">
              <LockKeyhole size={13} /> Keys are encrypted at rest. Model
              reviews send selected source to your provider only when you enable
              them for a scan.
            </p>
          )}
          {settings.hasApiKey && (
            <button
              type="button"
              className="danger-link"
              onClick={async () => {
                await api("settings", "PUT", {
                  ...settings,
                  apiKey: "",
                  githubToken: undefined,
                });
                setSettings({ ...settings, hasApiKey: false, apiKey: "" });
                notify("Model key removed.");
              }}
            >
              Remove saved model key
            </button>
          )}
        </section>
        <section className="panel settings-section">
          <div className="settings-title">
            <div className="feature-icon">
              <Github size={20} />
            </div>
            <div>
              <h2>Private repositories</h2>
              <p>Let Qwik read the repositories you choose.</p>
            </div>
          </div>
          <label>
            GitHub fine-grained access token{" "}
            {settings.hasGithubToken && (
              <span className="saved-label">
                <Check size={12} /> Saved
              </span>
            )}
            <input
              type="password"
              autoComplete="off"
              placeholder={
                settings.hasGithubToken
                  ? "Leave blank to keep your saved token"
                  : "github_pat_…"
              }
              value={settings.githubToken}
              onChange={(e) =>
                setSettings({ ...settings, githubToken: e.target.value })
              }
            />
          </label>
          <p className="form-help">
            Grant Contents: read access only to repositories you want to scan.
            GitHub sign-in does not grant repository access.
          </p>
          {settings.hasGithubToken && (
            <button
              type="button"
              className="danger-link"
              onClick={async () => {
                await api("settings", "PUT", {
                  ...settings,
                  githubToken: "",
                  apiKey: undefined,
                });
                setSettings({
                  ...settings,
                  hasGithubToken: false,
                  githubToken: "",
                });
                notify("GitHub token removed.");
              }}
            >
              Remove saved GitHub token
            </button>
          )}
        </section>
        <div className="settings-save">
          <Button busy={busy} type="submit" icon={Save}>
            Save settings
          </Button>
        </div>
      </form>
      <section className="panel settings-section">
        <div className="panel-header no-padding">
          <div>
            <h2>CLI & automation tokens</h2>
            <p>Revoke access to a device or create a manual login token.</p>
          </div>
          <Button
            variant="ghost"
            icon={Plus}
            onClick={async () => {
              try {
                const t = await api("tokens", "POST", {
                  name: "Manual CLI token",
                });
                setNewToken(t.token);
                setTokens([...tokens, t]);
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Create token
          </Button>
        </div>
        {newToken && (
          <div className="secret-box">
            <code>{newToken}</code>
            <CopyButton value={newToken} />
            <p>
              Shown once. Use <code>qwik login --token YOUR_TOKEN</code>.
            </p>
          </div>
        )}
        {tokens.length ? (
          <div className="token-list">
            {tokens.map((t) => (
              <div key={t.id}>
                <KeyRound size={16} />
                <div>
                  <strong>{t.name}</strong>
                  <small>
                    {t.projectId ? "Project-scoped" : "Workspace access"} ·
                    Expires {new Date(t.expires).toLocaleDateString()}
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Revoke ${t.name}`}
                  onClick={async () => {
                    try {
                      await api(`tokens/${t.id}`, "DELETE");
                      setTokens(tokens.filter((x) => x.id !== t.id));
                      notify("Token revoked.");
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small">
            No active tokens yet. Connect the CLI to get started.
          </p>
        )}
      </section>
    </>
  );
}
function CliPage() {
  return (
    <div className="cli-layout">
      <section className="panel cli-guide">
        <div className="cli-hero-icon">
          <Terminal size={30} />
        </div>
        <Badge tone="green">YOUR WORKSPACE, IN THE TERMINAL</Badge>
        <h2>
          A small command.
          <br />A better habit.
        </h2>
        <p>
          Your project doesn’t need to change.
          <br />
          Just bring Qwik along.
        </p>
        <div className="numbered-step">
          <span>1</span>
          <div>
            <h4>Install the CLI</h4>
            <p>Node.js 22 or newer. Works on macOS, Linux, and Windows.</p>
          </div>
        </div>
        <CommandBox>{install}</CommandBox>
        <div className="numbered-step">
          <span>2</span>
          <div>
            <h4>Make the connection</h4>
            <p>Approve the device in your browser.</p>
          </div>
        </div>
        <CommandBox>qwik login</CommandBox>
        <div className="numbered-step">
          <span>3</span>
          <div>
            <h4>Open a project. Take a look.</h4>
            <p>Run this from any project directory.</p>
          </div>
        </div>
        <CommandBox>qwik</CommandBox>
        <Link to="/docs" className="text-link">
          Read the full CLI guide <ArrowUpRight size={15} />
        </Link>
      </section>
      <aside>
        <section className="panel command-reference">
          <h3>Your command palette</h3>
          {[
            ["/scan", "Run a security review"],
            ["/scan ai", "Add your configured model"],
            ["/history", "See your latest scans"],
            ["/watch", "Scan each new commit"],
            ["/stop", "Pause the watcher"],
            ["/exit", "Back to your terminal"],
          ].map(([c, d]) => (
            <div key={c}>
              <code>{c}</code>
              <span>{d}</span>
            </div>
          ))}
        </section>
        <section className="tip-card">
          <GitBranch size={24} />
          <h3>Make it a habit.</h3>
          <p>
            Run <code>qwik hooks</code> once to scan after every commit, even
            when the interactive terminal is closed.
          </p>
        </section>
        <section className="tip-card">
          <Box size={24} />
          <h3>Try it in a sandbox.</h3>
          <p>
            Run commands in restricted local Docker containers. No network.
            Read-only source. Resource limits.
          </p>
          <code>qwik sandbox -- node --version</code>
        </section>
      </aside>
    </div>
  );
}
function Dashboard({ user, onLogout, demo = false, path }) {
  const [projects, setProjects] = useState([]),
    [scans, setScans] = useState([]),
    [states, setStates] = useState({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false),
    [newProject, setNewProject] = useState(false),
    [ci, setCi] = useState(null),
    [finding, setFinding] = useState(null),
    [scanTarget, setScanTarget] = useState(null),
    [scanning, setScanning] = useState(false),
    [useModel, setUseModel] = useState(false),
    [query, setQuery] = useState(""),
    [severity, setSeverity] = useState("all"),
    [stateFilter, setStateFilter] = useState("open"),
    [device, setDevice] = useState(
      new URLSearchParams(location.search).get("device") || "",
    ),
    [deviceBusy, setDeviceBusy] = useState(false),
    [deleteProject, setDeleteProject] = useState(null);
  const base = demo ? "/demo" : "/app";
  const tab = path.split("/")[2] || "overview";
  const selectedId = path.split("/")[3];
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };
  const refresh = useCallback(async () => {
    if (demo) {
      setProjects([
        {
          id: "demo",
          name: "next-big-thing",
          repository: "you/next-big-thing",
          lastScanAt: new Date().toISOString(),
          lastFindings: 2,
        },
      ]);
      setScans([
        {
          id: "example",
          projectId: "demo",
          projectName: "next-big-thing",
          repository: "you/next-big-thing",
          createdAt: new Date(Date.now() - 240000).toISOString(),
          source: "cli",
          branch: "main",
          commit: "f6d12c9",
          filesScanned: 48,
          findings: sampleFindings,
          engineVersion: "0.1.0",
          promptVersion: 1,
          dependencyStatus: "complete",
          modelStatus: "not enabled",
        },
      ]);
      setLoading(false);
      return;
    }
    try {
      const [p, s, f] = await Promise.all([
        api("projects"),
        api("scans"),
        api("findings/state"),
      ]);
      setProjects(p.projects);
      setScans(s.scans);
      setStates(
        Object.fromEntries(f.states.map((x) => [x.fingerprint, x.status])),
      );
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [demo]);
  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 12000);
    return () => clearInterval(id);
  }, [refresh]);
  const latest = new Map();
  for (const s of scans) {
    if (!latest.has(s.projectId + (s.source === "research" ? ":research" : "")))
      latest.set(s.projectId + (s.source === "research" ? ":research" : ""), s);
  }
  const findings = [
    ...new Map(
      [...latest.values()]
        .flatMap((s) =>
          s.findings.map((f) => ({ ...f, projectName: s.projectName })),
        )
        .map((f) => [f.fingerprint, f]),
    ).values(),
  ];
  const open = findings.filter(
    (f) => (states[f.fingerprint] || "open") === "open",
  );
  const high = open.filter((f) => ["critical", "high"].includes(f.severity));
  const selected = scans.find((s) => s.id === selectedId);
  const nav = [
    { id: "overview", name: "Overview", icon: LayoutDashboard },
    { id: "projects", name: "Projects", icon: FolderGit2 },
    { id: "scans", name: "Scan history", icon: History },
    { id: "findings", name: "Findings", icon: Shield, number: open.length },
  ];
  const titles = {
    overview: [
      "Your work, with a clearer picture.",
      "A little confidence for everything you’re building.",
    ],
    projects: [
      "Good ideas start here.",
      "Connect your projects and give every commit a second look.",
    ],
    scans: [
      "Every review. One place.",
      "Your local, web, and CI scans, all in sync.",
    ],
    findings: [
      "A few things worth a look.",
      "Findings from the latest scan of each project.",
    ],
    cli: [
      "Meet your new terminal companion.",
      "Fast reviews. Familiar surroundings.",
    ],
    settings: [
      "Make Qwik your own.",
      "Your models, integrations, and connected devices.",
    ],
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "visible" : ""}`}>
        <div className="sidebar-logo">
          <Logo />
          <button
            className="icon-button mobile-menu"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">
            {demo ? "D" : (user.name || "Q")[0].toUpperCase()}
          </div>
          <div>
            <strong>
              {demo
                ? "Demo workspace"
                : `${user.name?.split(" ")[0] || "My"}’s workspace`}
            </strong>
            <small>Personal workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.id}
              to={n.id === "overview" ? base : `${base}/${n.id}`}
              className={`sidebar-link ${tab === n.id ? "active" : ""}`}
              onClick={() => setMobile(false)}
            >
              <n.icon size={18} />
              {n.name}
              {n.number > 0 && <span className="nav-count">{n.number}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-label second-label">TOOLKIT</div>
        <nav>
          <Link
            to={`${base}/cli`}
            className={`sidebar-link ${tab === "cli" ? "active" : ""}`}
          >
            <Terminal size={18} /> Get the CLI <ArrowUpRight size={13} />
          </Link>
          <Link
            to={`${base}/settings`}
            className={`sidebar-link ${tab === "settings" ? "active" : ""}`}
          >
            <Settings size={18} /> Settings
          </Link>
          <Link to="/docs" className="sidebar-link">
            <BookOpen size={18} /> Documentation <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>
              <Zap size={15} /> A little peace of mind.
            </span>
            <p>
              Keep the good commits coming.
              <br />
              Your next scan is one command away.
            </p>
            <code>
              $ qwik scan <span>↵</span>
            </code>
          </div>
          <div className="sidebar-user">
            <div className="user-avatar">
              {demo ? "D" : (user.name || "Q")[0].toUpperCase()}
            </div>
            <div>
              <strong>{demo ? "Demo explorer" : user.name}</strong>
              <small>
                {demo ? "Example data" : user.email || "GitHub account"}
              </small>
            </div>
            <button
              className="icon-button"
              title={demo ? "Create an account" : "Sign out"}
              onClick={demo ? () => go("/signup") : onLogout}
            >
              {demo ? <ArrowUpRight size={17} /> : <LogOut size={17} />}
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <div className="app-main">
        <header className="app-topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {nav.find((n) => n.id === tab)?.name ||
                (tab === "cli" ? "Get the CLI" : "Settings")}
            </strong>
          </div>
          <div>
            <span className="live-indicator">
              <span className="status-dot" />
              {demo ? "Example workspace" : "Synced every 12s"}
            </span>
            <a
              href="https://github.com/gitachi143/qwik"
              aria-label="Qwik on GitHub"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={18} />
            </a>
          </div>
        </header>
        <main className="dashboard-content">
          {demo && (
            <div className="demo-banner">
              <Sparkles size={17} />
              <span>
                You’re exploring example data. Your own workspace starts empty.
              </span>
              <Link to="/signup">
                Make it yours <ArrowRight size={14} />
              </Link>
            </div>
          )}
          {device && !demo && (
            <div className="device-banner">
              <Terminal size={25} />
              <div>
                <strong>Connect your terminal</strong>
                <p>
                  Only approve if this code matches the CLI you just opened:{" "}
                  <code>{device}</code>
                </p>
              </div>
              <Button
                busy={deviceBusy}
                onClick={async () => {
                  setDeviceBusy(true);
                  try {
                    await api("device/approve", "POST", { code: device });
                    setDevice("");
                    history.replaceState({}, "", "/app");
                    notify("Device approved. Return to your terminal.");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setDeviceBusy(false);
                  }
                }}
              >
                Approve device
              </Button>
            </div>
          )}
          <ErrorBox error={error} />
          {selected ? (
            <ScanDetail
              scan={selected}
              states={states}
              onBack={() => go(`${base}/scans`)}
              onFinding={setFinding}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  {tab === "overview" && (
                    <div className="kicker">LET’S KEEP BUILDING</div>
                  )}
                  <h1>{(titles[tab] || titles.overview)[0]}</h1>
                  <p>{(titles[tab] || titles.overview)[1]}</p>
                </div>
                {["overview", "projects"].includes(tab) && (
                  <Button
                    icon={Plus}
                    onClick={() => (demo ? go("/signup") : setNewProject(true))}
                  >
                    New project
                  </Button>
                )}
                {tab === "scans" && (
                  <Button variant="ghost" icon={RefreshCw} onClick={refresh}>
                    Refresh
                  </Button>
                )}
              </div>
              {loading ? (
                <div className="loading">
                  <Loader2 className="spin" /> Loading your workspace…
                </div>
              ) : (
                <>
                  {tab === "overview" && (
                    <>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div>
                            <span>Projects</span>
                            <FolderGit2 size={17} />
                          </div>
                          <strong>
                            {projects.length}
                            <span className="stat-dash">↗</span>
                          </strong>
                          <small>Your ideas, all in one place</small>
                        </div>
                        <div className="stat-card">
                          <div>
                            <span>Total scans</span>
                            <Activity size={17} />
                          </div>
                          <strong>{scans.length}</strong>
                          <small>Every review adds perspective</small>
                        </div>
                        <div className="stat-card">
                          <div>
                            <span>Open findings</span>
                            <Shield size={17} />
                          </div>
                          <strong>{open.length}</strong>
                          <small>From your latest project scans</small>
                        </div>
                        <div className="stat-card attention">
                          <div>
                            <span>Needs attention</span>
                            <TriangleAlert size={17} />
                          </div>
                          <strong>
                            {high.length}
                            <span className="stat-label">high & critical</span>
                          </strong>
                          <small>A good place to start</small>
                        </div>
                      </div>
                      <div className="dashboard-grid">
                        <div>
                          <section className="panel">
                            <div className="panel-header">
                              <h2>
                                Recent scans <span>{scans.length}</span>
                              </h2>
                              <Link to={`${base}/scans`} className="text-link">
                                View all <ArrowRight size={14} />
                              </Link>
                            </div>
                            {scans.length ? (
                              <ScanTable
                                scans={scans.slice(0, 5)}
                                onSelect={(s) => go(`${base}/scans/${s.id}`)}
                              />
                            ) : (
                              <Empty
                                icon={Terminal}
                                title="Your next scan starts here."
                                description="Connect a repository for a web scan, or bring Qwik into your terminal."
                              >
                                <Button
                                  variant="ghost"
                                  icon={Plus}
                                  onClick={() => setNewProject(true)}
                                >
                                  Add your first project
                                </Button>
                              </Empty>
                            )}
                          </section>
                          <section className="panel">
                            <div className="panel-header">
                              <h2>Worth a closer look</h2>
                              <Link
                                to={`${base}/findings`}
                                className="text-link"
                              >
                                All findings <ArrowRight size={14} />
                              </Link>
                            </div>
                            {open.length ? (
                              <FindingList
                                findings={open.slice(0, 4)}
                                states={states}
                                onSelect={setFinding}
                              />
                            ) : (
                              <div className="calm-empty">
                                <ShieldCheck size={23} />
                                <div>
                                  <strong>
                                    {scans.length
                                      ? "Nothing open in your latest scans."
                                      : "A fresh start."}
                                  </strong>
                                  <p>
                                    {scans.length
                                      ? "Keep reviewing as your code evolves."
                                      : "Findings will appear here after your first review."}
                                  </p>
                                </div>
                              </div>
                            )}
                          </section>
                        </div>
                        <aside>
                          <section className="quickstart-card">
                            <div className="quickstart-top">
                              <Terminal size={23} />
                              <Badge>QUICK START</Badge>
                            </div>
                            <h2>
                              Right where
                              <br />
                              you’re building.
                            </h2>
                            <p>
                              Bring your workspace into the terminal. Scan,
                              review, keep going.
                            </p>
                            <div className="quick-code">
                              <span>$</span> qwik <span className="cursor" />
                            </div>
                            <Link to={`${base}/cli`} className="button full">
                              Set up the CLI <ArrowUpRight size={15} />
                            </Link>
                            <span className="quick-note">
                              <Check size={12} /> Free & open source
                            </span>
                          </section>
                          <section className="tip-card">
                            <div className="tip-label">
                              <Sparkles size={16} /> MAKE IT YOURS
                            </div>
                            <h3>Got a favorite model?</h3>
                            <p>
                              Connect your own API or use Ollama locally.
                              Reviews, on your terms.
                            </p>
                            <Link to={`${base}/settings`} className="text-link">
                              Choose your model <ArrowRight size={14} />
                            </Link>
                          </section>
                        </aside>
                      </div>
                      <div className="workspace-footer">
                        <LockKeyhole size={13} /> Built-in scans keep source on
                        your machine. Model reviews are always your choice.
                      </div>
                    </>
                  )}
                  {tab === "projects" && (
                    <>
                      {projects.length ? (
                        <div className="project-grid">
                          {projects.map((p) => (
                            <article className="panel project-card" key={p.id}>
                              <div className="project-card-top">
                                <div className="project-symbol">
                                  <FolderGit2 size={22} />
                                </div>
                                <Badge>
                                  {p.repository ? "GitHub" : "Local"}
                                </Badge>
                                <button
                                  className="icon-button"
                                  title={`Delete ${p.name}`}
                                  onClick={() =>
                                    demo
                                      ? notify(
                                          "Example project. Create an account to add your own.",
                                        )
                                      : setDeleteProject(p)
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                              <h2>{p.name}</h2>
                              <p>
                                {p.repository || "Connected through the CLI"}
                              </p>
                              <div className="project-meta">
                                <span>
                                  <History size={13} />
                                  {relativeTime(p.lastScanAt)}
                                </span>
                                <span>
                                  {p.lastFindings !== undefined
                                    ? `${p.lastFindings} findings`
                                    : "Ready for a first scan"}
                                </span>
                              </div>
                              <div className="project-actions">
                                <Button
                                  variant="ghost"
                                  icon={Workflow}
                                  onClick={() =>
                                    demo
                                      ? notify(
                                          "Create an account to set up CI.",
                                        )
                                      : setCi(p)
                                  }
                                >
                                  Set up CI
                                </Button>
                                <Button
                                  icon={p.repository ? Search : Terminal}
                                  onClick={() =>
                                    p.repository
                                      ? demo
                                        ? go(`${base}/scans/example`)
                                        : setScanTarget(p)
                                      : go(`${base}/cli`)
                                  }
                                >
                                  {p.repository ? "Run scan" : "Scan locally"}
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <section className="panel">
                          <Empty
                            title="A home for your projects."
                            description="Add a repository or connect a local project. Your scan history will follow."
                          >
                            <Button
                              icon={Plus}
                              onClick={() => setNewProject(true)}
                            >
                              Create your first project
                            </Button>
                          </Empty>
                        </section>
                      )}
                    </>
                  )}
                  {tab === "scans" && (
                    <section className="panel">
                      <div className="panel-header">
                        <h2>
                          Scan history <span>{scans.length}</span>
                        </h2>
                        <div className="search-box">
                          <Search size={15} />
                          <input
                            placeholder="Find a project…"
                            aria-label="Search scans"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      {scans.filter((s) =>
                        s.projectName
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      ).length ? (
                        <ScanTable
                          scans={scans.filter((s) =>
                            s.projectName
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )}
                          onSelect={(s) => go(`${base}/scans/${s.id}`)}
                        />
                      ) : (
                        <Empty
                          icon={History}
                          title={
                            query
                              ? "No matching scans."
                              : "Your history is a blank canvas."
                          }
                          description={
                            query
                              ? "Try another project name."
                              : "Run a scan from the web or CLI to start your review history."
                          }
                        />
                      )}
                    </section>
                  )}
                  {tab === "findings" && (
                    <section className="panel">
                      <div className="panel-header findings-controls">
                        <h2>
                          Findings <span>{findings.length}</span>
                        </h2>
                        <div>
                          <select
                            aria-label="Finding status"
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                          >
                            {["open", "resolved", "ignored", "all"].map((x) => (
                              <option key={x} value={x}>
                                {x === "all"
                                  ? "All statuses"
                                  : x[0].toUpperCase() + x.slice(1)}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Finding severity"
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                          >
                            <option value="all">All severities</option>
                            {["critical", "high", "medium", "low"].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {findings.filter(
                        (f) =>
                          (severity === "all" || f.severity === severity) &&
                          (stateFilter === "all" ||
                            (states[f.fingerprint] || "open") === stateFilter),
                      ).length ? (
                        <FindingList
                          findings={findings.filter(
                            (f) =>
                              (severity === "all" || f.severity === severity) &&
                              (stateFilter === "all" ||
                                (states[f.fingerprint] || "open") ===
                                  stateFilter),
                          )}
                          states={states}
                          onSelect={setFinding}
                        />
                      ) : (
                        <Empty
                          icon={ShieldCheck}
                          title="Nothing in this view."
                          description="New findings from your latest scans will show up here. Try changing your filters."
                        />
                      )}
                    </section>
                  )}
                  {tab === "cli" && <CliPage />}
                  {tab === "settings" &&
                    (demo ? (
                      <section className="panel">
                        <Empty
                          icon={Settings}
                          title="Your workspace. Your settings."
                          description="Create an account to connect models, manage private repositories, and pair your CLI."
                        >
                          <Link to="/signup" className="button">
                            Create your workspace <ArrowUpRight size={15} />
                          </Link>
                        </Empty>
                      </section>
                    ) : (
                      <SettingsPanel notify={notify} refresh={refresh} />
                    ))}
                </>
              )}
            </>
          )}
        </main>
      </div>
      {newProject && (
        <ProjectModal
          onClose={() => setNewProject(false)}
          onCreated={() => {
            refresh();
            notify("Project created. Ready when you are.");
          }}
        />
      )}
      {ci && <CiModal project={ci} onClose={() => setCi(null)} />}
      {scanTarget && (
        <Modal
          title={`Review ${scanTarget.name}`}
          subtitle="Qwik will read selected source from GitHub and report what needs attention."
          onClose={() => !scanning && setScanTarget(null)}
        >
          <div className="scan-includes">
            <span>
              <Check size={15} /> Code & infrastructure rules
            </span>
            <span>
              <Check size={15} /> Exposed credential patterns
            </span>
            <span>
              <Check size={15} /> Known dependency advisories
            </span>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useModel}
              onChange={(e) => setUseModel(e.target.checked)}
            />
            <span>
              Add my configured model{" "}
              <small>
                Selected source is sent to your provider. Provider charges may
                apply.
              </small>
            </span>
          </label>
          <p className="form-help">
            Web scans cover up to 60 files / 600 KB. Use the CLI for broader
            coverage. Source files are processed in memory and not retained by
            Qwik.
          </p>
          <ErrorBox error={error} />
          <Button
            busy={scanning}
            className="full"
            icon={Search}
            onClick={async () => {
              setScanning(true);
              setError("");
              try {
                const result = await api("scan/web", "POST", {
                  projectId: scanTarget.id,
                  useModel,
                });
                setScanTarget(null);
                await refresh();
                go(`${base}/scans/${result.id}`);
                notify("Review complete. Take a look.");
              } catch (e) {
                setError(e.message);
              } finally {
                setScanning(false);
              }
            }}
          >
            {scanning ? "Reviewing your project…" : "Run security review"}
          </Button>
        </Modal>
      )}
      {finding && (
        <Modal
          title={finding.title}
          subtitle={`${finding.file}:${finding.line}`}
          onClose={() => setFinding(null)}
        >
          <div className="finding-modal-meta">
            <Severity value={finding.severity} />
            <Badge>{finding.ruleId}</Badge>
            <Badge>{finding.source}</Badge>
          </div>
          <h4>Why it matters</h4>
          <p>{finding.description}</p>
          <div className="remediation">
            <div>
              <CheckCircle2 size={17} />
              <h4>A good next step</h4>
            </div>
            <p>{finding.remediation}</p>
          </div>
          <p className="form-help">
            This is a review candidate. Confirm the context before changing your
            code.
          </p>
          <label>
            Review status
            <select
              value={states[finding.fingerprint] || "open"}
              onChange={async (e) => {
                const status = e.target.value;
                if (!demo) {
                  try {
                    await api("findings/state", "PUT", {
                      fingerprint: finding.fingerprint,
                      status,
                    });
                  } catch (e) {
                    notify(e.message);
                    return;
                  }
                }
                setStates({ ...states, [finding.fingerprint]: status });
                notify("Finding updated.");
              }}
            >
              <option value="open">Open · needs a look</option>
              <option value="resolved">Resolved · addressed</option>
              <option value="ignored">Ignored · not applicable</option>
            </select>
          </label>
        </Modal>
      )}
      {deleteProject && (
        <Modal
          title={`Delete ${deleteProject.name}?`}
          subtitle="This removes the project and its scan history from your workspace. It does not change your repository."
          onClose={() => setDeleteProject(null)}
        >
          <Button
            variant="danger"
            className="full"
            onClick={async () => {
              try {
                await api(`projects/${deleteProject.id}`, "DELETE");
                setDeleteProject(null);
                refresh();
                notify("Project deleted.");
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Delete project and history
          </Button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Admin({ user, onLogout }) {
  const [tab, setTab] = useState("policy"),
    [config, setConfig] = useState(null),
    [versions, setVersions] = useState([]),
    [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [newItem, setNewItem] = useState({ title: "", details: "" }),
    [advisoryId, setAdvisoryId] = useState(""),
    [advisory, setAdvisory] = useState(null),
    [researchResult, setResearchResult] = useState(null),
    [passwords, setPasswords] = useState({ currentPassword: "", password: "" });
  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  };
  const load = async () => {
    try {
      const [c, v, t] = await Promise.all([
        api("admin/config"),
        api("admin/history"),
        api("admin/tracker"),
      ]);
      setConfig(c);
      setVersions(v.versions);
      setItems(t.items);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-app">
      <header className="admin-header wrap">
        <Logo />
        <div>
          <Badge tone="green">
            <LockKeyhole size={12} /> PRIVATE CONTROL ROOM
          </Badge>
          <button className="icon-button" title="Sign out" onClick={onLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="admin-content wrap">
        <div className="page-heading">
          <div>
            <div className="kicker">
              THE QUALITY OF EVERY REVIEW STARTS HERE
            </div>
            <h1>Keep Qwik sharp.</h1>
            <p>
              Better instructions. Better coverage. One improvement at a time.
            </p>
          </div>
          <div className="policy-status">
            <span className="status-dot" /> Active policy{" "}
            <strong>v{config?.version || 1}</strong>
          </div>
        </div>
        <div className="admin-tabs">
          {[
            { id: "policy", name: "Review policy", icon: SlidersHorizontal },
            { id: "rules", name: "Detection rules", icon: Shield },
            { id: "tracker", name: "Missed findings", icon: Bug },
            { id: "research", name: "Advisory research", icon: FlaskConical },
            { id: "security", name: "Access", icon: LockKeyhole },
          ].map((t) => (
            <button
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
              key={t.id}
            >
              <t.icon size={17} />
              {t.name}
            </button>
          ))}
        </div>
        <ErrorBox error={error} />
        {!config ? (
          <div className="loading">
            <Loader2 className="spin" /> Loading control room…
          </div>
        ) : (
          <>
            {tab === "policy" && (
              <div className="admin-grid">
                <section className="panel settings-section">
                  <div className="panel-header no-padding">
                    <div>
                      <h2>The review prompt</h2>
                      <p>
                        Used by opt-in model reviews in the web app and
                        connected CLI.
                      </p>
                    </div>
                    <Badge>v{config.version}</Badge>
                  </div>
                  <textarea
                    className="prompt-editor"
                    aria-label="System review prompt"
                    value={config.prompt}
                    onChange={(e) =>
                      setConfig({ ...config, prompt: e.target.value })
                    }
                    maxLength={16000}
                  />
                  <div className="editor-footer">
                    <span>
                      {config.prompt.length.toLocaleString()} / 16,000
                      characters
                    </span>
                    <Button
                      busy={busy}
                      icon={Save}
                      onClick={() =>
                        run(async () => {
                          const updated = await api(
                            "admin/config",
                            "PUT",
                            config,
                          );
                          setConfig(updated);
                          notify(`Policy v${updated.version} published.`);
                          load();
                        })
                      }
                    >
                      Publish new version
                    </Button>
                  </div>
                </section>
                <aside>
                  <div className="tip-card">
                    <ShieldCheck size={23} />
                    <h3>Instructions with boundaries.</h3>
                    <p>
                      Treat repository text as untrusted. Ask for evidence,
                      location, and remediation. Never ask a model to execute
                      repository instructions or repeat credentials.
                    </p>
                    <p>
                      Changes take effect on the next connected scan. Offline
                      scans use the bundled policy.
                    </p>
                  </div>
                  <section className="panel version-list">
                    <div className="panel-header">
                      <h2>Version history</h2>
                    </div>
                    {versions.length ? (
                      versions.slice(0, 8).map((v) => (
                        <div key={v.version}>
                          <div>
                            <Badge>v{v.version}</Badge>
                            <small>
                              {new Date(v.updatedAt).toLocaleString()}
                            </small>
                          </div>
                          <button
                            className="text-link"
                            onClick={() => {
                              setConfig({
                                ...config,
                                prompt: v.prompt,
                                rules: v.rules,
                              });
                              notify(
                                "Previous policy loaded as a draft. Publish to activate.",
                              );
                            }}
                          >
                            Load as draft <History size={13} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="muted small">
                        Published versions will appear here.
                      </p>
                    )}
                  </section>
                </aside>
              </div>
            )}
            {tab === "rules" && (
              <section className="panel settings-section">
                <div className="panel-header no-padding">
                  <div>
                    <h2>Extend the rule engine</h2>
                    <p>
                      Literal substring rules run alongside Qwik’s built-in
                      checks. No arbitrary code or regular expressions.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    icon={Plus}
                    onClick={() =>
                      setConfig({
                        ...config,
                        rules: [
                          ...config.rules,
                          {
                            id: `CUSTOM-${Date.now()}`,
                            title: "",
                            needle: "",
                            severity: "medium",
                            description: "",
                            remediation: "",
                            enabled: true,
                          },
                        ],
                      })
                    }
                  >
                    Add rule
                  </Button>
                </div>
                {config.rules.length ? (
                  config.rules.map((r, i) => (
                    <div className="rule-editor" key={r.id}>
                      <div className="rule-top">
                        <Badge>{r.id}</Badge>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={r.enabled}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                rules: config.rules.map((x, j) =>
                                  i === j
                                    ? { ...x, enabled: e.target.checked }
                                    : x,
                                ),
                              })
                            }
                          />
                          Enabled
                        </label>
                        <button
                          className="icon-button"
                          aria-label="Remove rule"
                          onClick={() =>
                            setConfig({
                              ...config,
                              rules: config.rules.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="form-grid">
                        {[
                          ["title", "Finding title"],
                          ["needle", "Exact text to detect"],
                          ["description", "Why it matters"],
                          ["remediation", "Recommended fix"],
                        ].map(([k, label]) => (
                          <label key={k}>
                            {label}
                            <input
                              value={r[k]}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  rules: config.rules.map((x, j) =>
                                    i === j ? { ...x, [k]: e.target.value } : x,
                                  ),
                                })
                              }
                            />
                          </label>
                        ))}
                        <label>
                          Severity
                          <select
                            value={r.severity}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                rules: config.rules.map((x, j) =>
                                  i === j
                                    ? { ...x, severity: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          >
                            {["critical", "high", "medium", "low"].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Shield}
                    title="Start with a pattern worth catching."
                    description="Qwik already includes 12 built-in rules. Add targeted patterns learned from your vulnerability research."
                  />
                )}
                <div className="settings-save">
                  <Button
                    busy={busy}
                    icon={Save}
                    onClick={() =>
                      run(async () => {
                        if (config.rules.some((r) => !r.title || !r.needle))
                          throw new Error(
                            "Each rule needs a title and an exact text pattern.",
                          );
                        const updated = await api(
                          "admin/config",
                          "PUT",
                          config,
                        );
                        setConfig(updated);
                        notify("Detection policy published.");
                      })
                    }
                  >
                    Publish detection rules
                  </Button>
                </div>
              </section>
            )}
            {tab === "tracker" && (
              <div className="admin-grid">
                <section className="panel">
                  <div className="panel-header">
                    <h2>
                      Learn from what we missed <span>{items.length}</span>
                    </h2>
                  </div>
                  {items.length ? (
                    <div className="tracker-list">
                      {items.map((item) => (
                        <article key={item.id}>
                          <div>
                            <Badge
                              tone={
                                item.status === "resolved" ? "green" : "medium"
                              }
                            >
                              {item.status}
                            </Badge>
                            <small>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.details}</p>
                          <button
                            className="text-link"
                            onClick={() =>
                              run(async () => {
                                await api(`admin/tracker/${item.id}`, "PATCH", {
                                  status:
                                    item.status === "open"
                                      ? "resolved"
                                      : "open",
                                });
                                load();
                              })
                            }
                          >
                            {item.status === "open"
                              ? "Mark addressed"
                              : "Reopen finding"}{" "}
                            <Check size={14} />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={Bug}
                      title="A place to get better."
                      description="Record missed vulnerabilities, false negatives, and ideas for improving the review policy."
                    />
                  )}
                </section>
                <section className="panel settings-section">
                  <h2>Note a missed finding</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        await api("admin/tracker", "POST", newItem);
                        setNewItem({ title: "", details: "" });
                        load();
                        notify("Finding added to the tracker.");
                      });
                    }}
                  >
                    <label>
                      Title
                      <input
                        required
                        value={newItem.title}
                        placeholder="What did the scanner miss?"
                        onChange={(e) =>
                          setNewItem({ ...newItem, title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Evidence & next steps
                      <textarea
                        rows={7}
                        value={newItem.details}
                        placeholder="Describe the pattern, context, and how the review should improve. Avoid including secrets."
                        onChange={(e) =>
                          setNewItem({ ...newItem, details: e.target.value })
                        }
                      />
                    </label>
                    <Button busy={busy} type="submit" icon={Plus}>
                      Add to tracker
                    </Button>
                  </form>
                </section>
              </div>
            )}
            {tab === "research" && (
              <div className="admin-grid">
                <section className="panel settings-section">
                  <div className="settings-title">
                    <div className="feature-icon">
                      <FlaskConical size={23} />
                    </div>
                    <div>
                      <h2>Understand the next advisory.</h2>
                      <p>
                        Look up a published vulnerability in the OSV database.
                      </p>
                    </div>
                  </div>
                  <form
                    className="research-search"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        setResearchResult(null);
                        setAdvisory(
                          await api("admin/research", "POST", {
                            advisory: advisoryId,
                          }),
                        );
                      });
                    }}
                  >
                    <input
                      aria-label="Advisory identifier"
                      value={advisoryId}
                      onChange={(e) => setAdvisoryId(e.target.value)}
                      placeholder="GHSA-… or an OSV advisory ID"
                      required
                    />
                    <Button busy={busy} type="submit" icon={Search}>
                      Research
                    </Button>
                  </form>
                  {advisory ? (
                    <div className="advisory">
                      <Badge tone="high">{advisory.id}</Badge>
                      <h2>{advisory.summary || advisory.id}</h2>
                      <p className="preserve-lines">{advisory.details}</p>
                      <h4>Affected packages</h4>
                      <div className="model-chips">
                        {advisory.affected?.map((a, i) => (
                          <span key={i}>
                            {a.package?.ecosystem}: {a.package?.name}
                          </span>
                        ))}
                      </div>
                      <a
                        className="text-link"
                        href={`https://osv.dev/vulnerability/${advisory.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read full advisory <ExternalLink size={14} />
                      </a>
                      <div className="advisory-actions">
                        <Button
                          variant="ghost"
                          icon={Plus}
                          onClick={() =>
                            run(async () => {
                              await api("admin/tracker", "POST", {
                                title: advisory.summary || advisory.id,
                                details: `${advisory.id}\nhttps://osv.dev/vulnerability/${advisory.id}\nReview affected patterns and update the policy.`,
                              });
                              notify("Advisory added to the tracker.");
                              load();
                            })
                          }
                        >
                          Add to tracker
                        </Button>
                        <Button
                          icon={Search}
                          busy={busy}
                          onClick={() =>
                            run(async () => {
                              setResearchResult(
                                await api("admin/research/run", "POST", {
                                  advisory: advisory.id,
                                }),
                              );
                              notify("Inventory research completed.");
                            })
                          }
                        >
                          Check stored inventories
                        </Button>
                      </div>
                      {researchResult && (
                        <div className="info-box">
                          <Shield size={20} />
                          <p>
                            {researchResult.projectsChecked} project inventories
                            checked. {researchResult.matches} matching projects
                            received a new research scan.{" "}
                            {researchResult.incomplete
                              ? "Some checks were unavailable; review again later."
                              : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Empty
                      icon={FlaskConical}
                      title="A new vulnerability shouldn’t mean guesswork."
                      description="Start with a published advisory, check stored dependency inventories, and turn what you learn into a better review policy."
                    />
                  )}
                </section>
                <aside className="tip-card">
                  <BookOpen size={23} />
                  <h3>From research to review.</h3>
                  <ol>
                    <li>Look up a published advisory.</li>
                    <li>
                      Check stored dependency inventories for affected versions.
                    </li>
                    <li>Capture the pattern in Missed findings.</li>
                    <li>Update the prompt or add a detection rule.</li>
                    <li>Publish a new policy version.</li>
                  </ol>
                  <p>
                    Inventory research uses previously uploaded pinned
                    dependency versions. It does not prove runtime reachability
                    or rescan source. New code rules run on the next project
                    scan.
                  </p>
                </aside>
              </div>
            )}
            {tab === "security" && (
              <section className="panel settings-section narrow">
                <div className="settings-title">
                  <div className="feature-icon">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <h2>Keep the control room private.</h2>
                    <p>Change the password for this separate admin site.</p>
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await api("admin/password", "PUT", passwords);
                      setPasswords({ currentPassword: "", password: "" });
                      notify("Admin password changed.");
                    });
                  }}
                >
                  <label>
                    Current password
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    New password
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={16}
                      maxLength={128}
                      placeholder="At least 16 characters"
                      value={passwords.password}
                      onChange={(e) =>
                        setPasswords({ ...passwords, password: e.target.value })
                      }
                    />
                  </label>
                  <Button type="submit" busy={busy} icon={LockKeyhole}>
                    Update password
                  </Button>
                </form>
              </section>
            )}
          </>
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function App() {
  const [path, setPath] = useState(location.pathname),
    [user, setUser] = useState(null),
    [checked, setChecked] = useState(false),
    [authError, setAuthError] = useState("");
  useEffect(() => {
    const handle = () => setPath(location.pathname);
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);
  const loadUser = async () => {
    try {
      const result = await api("auth/me");
      setUser(result.user);
      setAuthError("");
      return result.user;
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setChecked(true);
    }
  };
  useEffect(() => {
    loadUser();
  }, []);
  const loggedIn = async () => {
    await loadUser();
    go(
      ADMIN
        ? "/"
        : "/app" + (location.search.includes("device=") ? location.search : ""),
    );
  };
  const logout = async () => {
    try {
      await api("auth/logout", "POST", {});
      setUser(null);
      if (!ADMIN && user?.id?.startsWith("gh_"))
        location.href = "/.auth/logout?post_logout_redirect_uri=/";
      else go(ADMIN ? "/" : "/");
    } catch (e) {
      setAuthError(e.message);
    }
  };
  useEffect(() => {
    document.title = ADMIN
      ? "Qwik — Admin control room"
      : path.startsWith("/app")
        ? "Qwik — Workspace"
        : path === "/docs"
          ? "Qwik — Documentation"
          : "Qwik — Ship fast. Stay secure.";
  }, [path]);
  if (ADMIN) {
    if (!checked)
      return (
        <div className="full-loading">
          <Logo />
          <Loader2 className="spin" />
        </div>
      );
    return user ? (
      <Admin user={user} onLogout={logout} />
    ) : (
      <Auth mode="login" onAuthenticated={loggedIn} />
    );
  }
  if (path === "/") return <Landing />;
  if (path === "/docs") return <Docs />;
  if (path === "/privacy") return <Docs privacy />;
  if (path.startsWith("/demo"))
    return (
      <Dashboard
        demo
        user={{ name: "Demo" }}
        path={path}
        onLogout={() => go("/")}
      />
    );
  if (["/login", "/signup", "/recover"].includes(path))
    return <Auth key={path} mode={path.slice(1)} onAuthenticated={loggedIn} />;
  if (path.startsWith("/app")) {
    if (!checked)
      return (
        <div className="full-loading">
          <Logo />
          <Loader2 className="spin" />
        </div>
      );
    if (!user) return <Auth mode="login" onAuthenticated={loggedIn} />;
    return <Dashboard user={user} path={path} onLogout={logout} />;
  }
  return (
    <div className="not-found">
      <Logo />
      <h1>This path is a little off track.</h1>
      <p>Let’s get you back to building.</p>
      <Link className="button" to="/">
        Back to Qwik <ArrowRight size={16} />
      </Link>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
