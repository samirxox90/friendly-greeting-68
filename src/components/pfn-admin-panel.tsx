import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Pattern = {
  id?: string;
  region: "SG" | "NA" | "EU";
  event_type: "TW" | "FW" | "DW" | "O" | "MS" | "STORE";
  label: string;
  pattern: string;
  sort_order: number;
  is_active: boolean;
};

type Template = {
  id?: string;
  event_type: "TW" | "FW" | "DW" | "O" | "MS";
  template_word: string;
  is_active: boolean;
};

const DURATIONS = [
  { label: "10 Minutes", value: 10 * 60 * 1000 },
  { label: "1 Hour", value: 60 * 60 * 1000 },
  { label: "6 Hours", value: 6 * 60 * 60 * 1000 },
  { label: "1 Day", value: 24 * 60 * 60 * 1000 },
  { label: "3 Days", value: 3 * 24 * 60 * 60 * 1000 },
  { label: "30 Days", value: 30 * 24 * 60 * 60 * 1000 },
];

export function PfnAdminPanel() {
  const [ok, setOk] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [panelMessage, setPanelMessage] = useState("");
  const [panelError, setPanelError] = useState("");
  const [mainPassword, setMainPassword] = useState("lofat");
  const [adminPassword, setAdminPassword] = useState("lofaf");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [codeScope, setCodeScope] = useState<"main" | "admin">("main");
  const [duration, setDuration] = useState(DURATIONS[0].value);
  const [generatedCode, setGeneratedCode] = useState("");

  async function fetchConfig() {
    const res = await fetch("/api/public/admin/config", { credentials: "include" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setPanelError(data.error ?? "Unable to load admin config.");
      if (res.status === 401) setOk(false);
      return;
    }

    setPanelError("");
    setMainPassword(data.settings.main_access?.password ?? "lofat");
    setAdminPassword(data.settings.admin_access?.password ?? "lofaf");
    setPatterns(data.patterns ?? []);
    setTemplates(data.templates ?? []);
  }

  useEffect(() => {
    fetch("/api/public/admin/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setOk(true);
          void fetchConfig();
        }
      });
  }, []);

  async function login() {
    setErr("");
    setPanelError("");
    setPanelMessage("");
    const res = await fetch("/api/public/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErr(data.error ?? "Invalid password");
      return;
    }
    setOk(true);
    setPwd("");
    void fetchConfig();
  }

  async function save() {
    setPanelError("");
    setPanelMessage("");
    const res = await fetch("/api/public/admin/config", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainPassword, adminPassword, patterns, templates }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Save failed." }));

    if (!res.ok || !data.ok) {
      setPanelError(data.error ?? "Save failed.");
      if (res.status === 401) setOk(false);
      return;
    }

    setPanelMessage("Saved successfully.");
    void fetchConfig();
  }

  async function makeCode() {
    setPanelError("");
    setPanelMessage("");
    const res = await fetch("/api/public/admin/generate-code", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: codeScope, durationMs: duration }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      setGeneratedCode("");
      setPanelError(data.error ?? "Failed to generate code.");
      if (res.status === 401) setOk(false);
      return;
    }

    setGeneratedCode(`${data.code} (expires ${data.expiresAt})`);
    setPanelMessage("Access code generated.");
  }

  function addTemplate() {
    setTemplates((prev) => [...prev, { event_type: "TW", template_word: "", is_active: true }]);
  }

  function addPattern() {
    setPatterns((prev) => [
      ...prev,
      { region: "SG", event_type: "TW", label: "New", pattern: "https://", sort_order: prev.length + 1, is_active: true },
    ]);
  }

  if (!ok) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
        <Card className="surface-panel w-full rounded-lg">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Password protected admin panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Admin password" />
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <Button onClick={login} className="w-full">Unlock Admin</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-3xl font-semibold">PFN Admin Panel</h1>
      {panelError ? <p className="mb-3 text-sm text-destructive">{panelError}</p> : null}
      {panelMessage ? <p className="mb-3 text-sm text-primary">{panelMessage}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-panel rounded-lg">
          <CardHeader>
            <CardTitle>Passwords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={mainPassword} onChange={(e) => setMainPassword(e.target.value)} placeholder="Main password" />
            <Input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin password" />
            <Button onClick={save}>Save Passwords</Button>
          </CardContent>
        </Card>
        <Card className="surface-panel rounded-lg">
          <CardHeader>
            <CardTitle>Generate Access Code</CardTitle>
            <CardDescription>6-character random code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={codeScope} onChange={(e) => setCodeScope(e.target.value as "main" | "admin")}>
              <option value="main">Main Site</option>
              <option value="admin">Admin Site</option>
            </select>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((item) => (
                <option key={item.label} value={item.value}>{item.label}</option>
              ))}
            </select>
            <Button onClick={makeCode}>Generate</Button>
            {generatedCode ? <p className="text-sm text-primary">{generatedCode}</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="surface-panel rounded-lg">
          <CardHeader>
            <CardTitle>SG Template Words</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="secondary" onClick={addTemplate}>Add Template</Button>
            {templates.map((item, index) => (
              <div key={`${item.id ?? "new"}-${index}`} className="grid grid-cols-3 gap-2">
                <Input value={item.event_type} onChange={(e) => setTemplates((prev) => prev.map((t, i) => i === index ? { ...t, event_type: e.target.value as Template["event_type"] } : t))} />
                <Input value={item.template_word} onChange={(e) => setTemplates((prev) => prev.map((t, i) => i === index ? { ...t, template_word: e.target.value } : t))} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.is_active} onChange={(e) => setTemplates((prev) => prev.map((t, i) => i === index ? { ...t, is_active: e.target.checked } : t))} />Active</label>
              </div>
            ))}
            <Button onClick={save}>Save Templates</Button>
          </CardContent>
        </Card>

        <Card className="surface-panel rounded-lg">
          <CardHeader>
            <CardTitle>Link Patterns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="secondary" onClick={addPattern}>Add Pattern</Button>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {patterns.map((item, index) => (
                <div key={`${item.id ?? "new"}-${index}`} className="space-y-2 rounded-md border border-border p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={item.region} onChange={(e) => setPatterns((prev) => prev.map((p, i) => i === index ? { ...p, region: e.target.value as Pattern["region"] } : p))} />
                    <Input value={item.event_type} onChange={(e) => setPatterns((prev) => prev.map((p, i) => i === index ? { ...p, event_type: e.target.value as Pattern["event_type"] } : p))} />
                    <Input value={item.label} onChange={(e) => setPatterns((prev) => prev.map((p, i) => i === index ? { ...p, label: e.target.value } : p))} />
                    <Input type="number" value={item.sort_order} onChange={(e) => setPatterns((prev) => prev.map((p, i) => i === index ? { ...p, sort_order: Number(e.target.value || 0) } : p))} />
                  </div>
                  <Input value={item.pattern} onChange={(e) => setPatterns((prev) => prev.map((p, i) => i === index ? { ...p, pattern: e.target.value } : p))} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.is_active} onChange={(e) => setPatterns((prev) => prev.map((p, i) => i === index ? { ...p, is_active: e.target.checked } : p))} />Active</label>
                </div>
              ))}
            </div>
            <Button onClick={save}>Save Patterns</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
