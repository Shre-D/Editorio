"use client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Code2,
  Users,
  Video,
  Zap,
  Lock,
  Globe,
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle2,
  Terminal,
  MonitorPlay,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetroGrid, GlowingOrbs, Meteors, ShimmerButton, BorderBeam } from "@/components/ui/retro-effects";
import { FeatureCard, StatsCard } from "@/components/ui/feature-cards";
import { Navbar, Footer } from "@/components/layout/navbar";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center pt-16">
        {/* Background effects */}
        <RetroGrid />
        <GlowingOrbs />
        <Meteors number={15} />

        <div className="container relative z-10 mx-auto px-4 py-24">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Now with AI-powered code suggestions</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl"
            >
              Code Together,{" "}
              <span className="gradient-text">In Real-Time</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl"
            >
              The collaborative code editor for teams. Write, debug, and ship code 
              together with voice, video, and real-time sync. No conflicts, just flow.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link to="/register">
                <ShimmerButton className="h-12 px-8 text-base">
                  Start Coding Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </ShimmerButton>
              </Link>
              <Button variant="outline" size="lg" className="gap-2">
                <Play className="h-4 w-4" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-retro-green" />
                <span className="text-sm">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-retro-green" />
                <span className="text-sm">Free for open source</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-retro-green" />
                <span className="text-sm">Self-host option available</span>
              </div>
            </motion.div>
          </div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mx-auto mt-16 max-w-5xl"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-2xl backdrop-blur-sm">
              <BorderBeam size={250} duration={12} />
              
              {/* Mock Editor Header */}
              <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="ml-4 flex items-center gap-2 rounded-md bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                  main.ts
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full border-2 border-background bg-retro-pink" />
                    <div className="h-6 w-6 rounded-full border-2 border-background bg-retro-purple" />
                    <div className="h-6 w-6 rounded-full border-2 border-background bg-retro-cyan" />
                  </div>
                  <span className="text-xs text-muted-foreground">3 online</span>
                </div>
              </div>

              {/* Mock Editor Content */}
              <div className="grid md:grid-cols-[280px_1fr]">
                {/* Sidebar */}
                <div className="hidden border-r border-border/50 bg-muted/10 p-4 md:block">
                  <div className="mb-4 text-xs font-semibold text-muted-foreground uppercase">
                    Participants
                  </div>
                  <div className="space-y-3">
                    {["Alice", "Bob", "Charlie"].map((name, i) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`h-8 w-8 rounded-full ${["bg-retro-pink", "bg-retro-purple", "bg-retro-cyan"][i]}`} />
                          <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-retro-green" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">Editing line 42</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Code Area */}
                <div className="p-4 font-mono text-sm">
                  <pre className="text-muted-foreground">
                    <code>
{`1  import { createServer } from 'http';
2  import { WebSocketServer } from 'ws';
3  
4  const server = createServer();
5  const wss = new WebSocketServer({ server });
6  
7  wss.on('connection', (ws) => {
8    console.log('Client connected');
9    
10   ws.on('message', (data) => {`}
                      <span className="relative">
                        <span className="absolute -left-0.5 h-5 w-0.5 animate-pulse bg-retro-pink" />
                      </span>
{`
11     // Broadcast to all clients
12     wss.clients.forEach((client) => {
13       client.send(data);
14     });
15   });
16 });`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative border-y border-border/50 bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <StatsCard value="50K+" label="Active Developers" index={0} />
            <StatsCard value="1M+" label="Lines Synced Daily" index={1} />
            <StatsCard value="99.9%" label="Uptime" index={2} />
            <StatsCard value="<50ms" label="Average Latency" index={3} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold md:text-5xl">
              Everything You Need to{" "}
              <span className="gradient-text">Code Together</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Built for teams who want to ship faster. From real-time collaboration 
              to voice chat, we've got you covered.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Code2}
              title="Real-Time Sync"
              description="See every keystroke instantly. Our CRDT-powered engine ensures zero conflicts, even offline."
              index={0}
            />
            <FeatureCard
              icon={Video}
              title="Voice & Video"
              description="Built-in Discord-style communication. Talk while you code, no tab switching needed."
              index={1}
            />
            <FeatureCard
              icon={Users}
              title="Multiplayer Cursors"
              description="See where your teammates are editing with color-coded cursors and selections."
              index={2}
            />
            <FeatureCard
              icon={Zap}
              title="Blazing Fast"
              description="Sub-50ms latency with our global edge network. Optimized for the best coding experience."
              index={3}
            />
            <FeatureCard
              icon={Lock}
              title="Enterprise Security"
              description="End-to-end encryption, SSO, and audit logs. SOC 2 Type II certified."
              index={4}
            />
            <FeatureCard
              icon={Globe}
              title="Self-Hostable"
              description="Run Editorio on your own infrastructure. Full control, same great experience."
              index={5}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative border-t border-border/50 bg-muted/10 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold md:text-5xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Get started in seconds. No complex setup required.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create a Room",
                description: "Start a new coding session and get a shareable link instantly.",
                icon: Terminal,
              },
              {
                step: "02",
                title: "Invite Your Team",
                description: "Share the link with your teammates. They can join with one click.",
                icon: Users,
              },
              {
                step: "03",
                title: "Code Together",
                description: "Start coding in real-time with voice, video, and instant sync.",
                icon: MonitorPlay,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="mb-2 text-xs font-bold text-primary">{item.step}</div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <GlowingOrbs />
        <div className="container relative z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-12 text-center backdrop-blur-sm"
          >
            <BorderBeam size={300} duration={15} />
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Ready to Transform Your{" "}
              <span className="gradient-text">Team's Workflow?</span>
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
              Join thousands of developers who are already coding together in real-time.
              Start your free trial today.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <ShimmerButton className="h-12 px-8 text-base">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </ShimmerButton>
              </Link>
              <Button variant="outline" size="lg" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Contact Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
