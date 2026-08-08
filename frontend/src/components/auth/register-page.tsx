import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, CalendarClock, Mail, MessagesSquare, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Workflow,
    title: "Multi-step Campaigns",
    description:
      "Create personalized email sequences with intelligent follow-up scheduling that adapts to your outreach workflow.",
  },
  {
    icon: BrainCircuit,
    title: "AI Writing Persona",
    description:
      "Learns your writing style, tone, and communication patterns to generate replies that sound like you—not like AI.",
  },
  {
    icon: MessagesSquare,
    title: "Intelligent Conversation Management",
    description:
      "Keeps conversations moving by drafting contextual replies, qualifying leads, and handing control back whenever your attention is needed.",
  },
  {
    icon: CalendarClock,
    title: "Google Calendar Scheduling",
    description: "Book qualified meetings directly into your Google Calendar without endless back-and-forth emails.",
  },
  {
    icon: BarChart3,
    title: "Campaign Analytics",
    description:
      "Track deliveries, replies, booked meetings, conversions, and campaign performance from one dashboard.",
  },
  {
    icon: Mail,
    title: "Native Gmail Integration",
    description: "Connect your Gmail account and continue using the inbox you already know. No migration or SMTP setup required.",
  },
];

export function RegisterPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-(image:--gradient-primary) text-xs font-bold text-primary-foreground">
              A
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">AI Outreach</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sign In
            </Link>
            <Button asChild size="sm">
              <Link href="/register/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-hero-glow">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
          <div className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI-powered outbound workspace
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-5xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Turn cold outreach into <span className="text-gradient">booked meetings</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Write, send, follow up, reply, and schedule meetings without leaving Gmail. AI handles the
            repetitive work while you stay in complete control.
          </p>

          <div className="mt-10 flex items-center justify-center">
            <Button asChild variant="gradient" size="xl">
              <Link href="/register/signup">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6">
          {features.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className="grid gap-6 border-b border-border py-14 last:border-b-0 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-20"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
                </div>
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground lg:pt-1">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for agencies, founders, recruiters, and sales teams that rely on outbound growth.
          </h2>
          <div className="mt-8 flex items-center justify-center">
            <Button asChild variant="gradient" size="xl">
              <Link href="/register/signup">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>AI Outreach Automation Platform</span>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Sign In
          </Link>
        </div>
      </footer>
    </main>
  );
}
