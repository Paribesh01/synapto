"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type AvailableApp = {
  id: string;
  name: string;
  capabilities: string[];
  status: "connected" | "disconnected" | "error";
};

export function ConnectAppsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [apps, setApps] = useState<AvailableApp[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Hardcoded available apps with status fetched from DB
  useEffect(() => {
    async function loadAppsWithStatus() {
      // Hardcoded app data
      const hardcodedApps = [
        {
          id: "google-calendar",
          name: "Google Calendar",
          capabilities: ["create_event", "list_events", "update_event", "delete_event"],
          status: "disconnected" as const, // default status
        },
      ];

      // Fetch actual status from database
      try {
        const res = await fetch("/api/apps/available", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { apps: AvailableApp[] };
          // Merge hardcoded data with actual status from DB
          const appsWithStatus = hardcodedApps.map((app) => {
            const dbApp = data.apps.find((a) => a.id === app.id);
            return {
              ...app,
              status: dbApp?.status ?? "disconnected",
            };
          });
          setApps(appsWithStatus);
        } else if (res.status === 401) {
          // User not authenticated, show hardcoded apps with disconnected status
          console.log("User not authenticated, showing hardcoded apps");
          setApps(hardcodedApps);
        } else {
          setApps(hardcodedApps);
        }
      } catch (error) {
        console.error("Failed to fetch app status:", error);
        setApps(hardcodedApps);
      }
    }

    loadAppsWithStatus();
  }, []);

  async function connect(appId: string) {
    setBusyId(appId);
    const res = await fetch(`/api/apps/${appId}/connect`, { method: "POST" });
    if (res.ok) {
      const data = (await res.json()) as { redirectUrl: string | null };
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
    }
    setBusyId(null);
  }

  async function disconnect(appId: string) {
    setBusyId(appId);
    await fetch(`/api/apps/${appId}/disconnect`, { method: "POST" });
    setBusyId(null);
    const res = await fetch("/api/apps/available", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { apps: AvailableApp[] };
      setApps(data.apps);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect Apps</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{app.name}</p>
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      {app.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Capabilities: {app.capabilities.join(", ")}
                  </p>
                </div>
                {app.status === "connected" ? (
                  <Button
                    variant="outline"
                    onClick={() => disconnect(app.id)}
                    disabled={busyId === app.id}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    onClick={() => connect(app.id)}
                    disabled={busyId === app.id}
                  >
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


