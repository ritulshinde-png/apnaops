"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { users, session, setSession, loginUser, upsertUser } = useAppStore();
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (session.authenticated) router.replace("/home");
  }, [session.authenticated, router]);

  const stage = session.stage;
  const pendingUser = session.pendingUserId ? users.find((u) => u.id === session.pendingUserId) : null;

  function checkEmail() {
    const e = email.trim().toLowerCase();
    if (!e) { setErr("Enter an email to continue."); return; }
    const u = users.find((x) => x.email.toLowerCase() === e && x.active);
    if (!u) { setErr("No active user with that email. Ask your admin to add you."); return; }
    setErr("");
    setSession({ pendingUserId: u.id, stage: u.password ? "password" : "first-time" });
  }
  function setPassword() {
    if (!pw || pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    const u = users.find((x) => x.id === session.pendingUserId);
    if (!u) return;
    const updated = { ...u, password: pw };
    upsertUser(updated);
    loginUser(updated);
    router.replace("/home");
  }
  function checkPassword() {
    const u = users.find((x) => x.id === session.pendingUserId);
    if (!u) return;
    if (pw !== u.password) { setErr("Incorrect password. Try again."); return; }
    loginUser(u);
    router.replace("/home");
  }
  function back() { setErr(""); setPw(""); setPw2(""); setSession({ pendingUserId: null, stage: "email" }); }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary font-semibold mb-2"><Zap className="h-5 w-5" /> Apnaops</div>
          {stage === "email" && (<><CardTitle>Sign in</CardTitle><CardDescription>Use the email your admin added you with.</CardDescription></>)}
          {stage === "first-time" && pendingUser && (<><CardTitle>Welcome, {pendingUser.name}</CardTitle><CardDescription>First time signing in. Set a password to continue.</CardDescription></>)}
          {stage === "password" && pendingUser && (<><CardTitle>Welcome back, {pendingUser.name.split(" ")[0]}</CardTitle><CardDescription>{pendingUser.email}</CardDescription></>)}
        </CardHeader>
        <CardContent className="space-y-3">
          {stage === "email" && (<>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="name@apnamart.in" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkEmail()} autoFocus /></div>
            <Button className="w-full" onClick={checkEmail}>Continue</Button>
          </>)}
          {stage === "first-time" && (<>
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" placeholder="at least 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></div>
            <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" placeholder="re-enter to confirm" value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPassword()} /></div>
            <Button className="w-full" onClick={setPassword}>Set password &amp; sign in</Button>
            <Button variant="ghost" className="w-full" onClick={back}>Use a different email</Button>
          </>)}
          {stage === "password" && (<>
            <div className="space-y-1.5"><Label>Password</Label><Input type="password" placeholder="your password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkPassword()} autoFocus /></div>
            <Button className="w-full" onClick={checkPassword}>Sign in</Button>
            <Button variant="ghost" className="w-full" onClick={back}>Use a different email</Button>
          </>)}
          {err && <p className="text-xs text-destructive">{err}</p>}
          <p className="text-xs text-muted-foreground text-center pt-2">Don&apos;t have an account? Ask your admin to add you in <b>Setup → Users</b>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
