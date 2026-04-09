"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConnectAppsDialog } from "@/components/chat/connect-apps-dialog";
import { useChatStore } from "@/components/chat/use-chat-store";
import { cn } from "@/lib/utils";

type ChatListItem = {
  id: string;
  title: string | null;
  updatedAt: string;
};

export function Sidebar() {
  const router = useRouter();
  const { activeChatId, setActiveChatId } = useChatStore();
  const [appsOpen, setAppsOpen] = useState(false);
  const [chats, setChats] = useState<ChatListItem[]>([]);

  const active = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  );

  async function refreshChats() {
    const res = await fetch("/api/chats", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { chats: ChatListItem[] };
    setChats(data.chats);

    // Bootstrap: if no active chat, pick the newest (or create one).
    if (!activeChatId) {
      if (data.chats[0]) {
        setActiveChatId(data.chats[0].id);
      } else {
        const created = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (created.ok) {
          const { chatId } = (await created.json()) as { chatId: string };
          setActiveChatId(chatId);
          await refreshChats();
        }
      }
    }
  }

  useEffect(() => {
    void refreshChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">InteliBridge</p>
          <p className="truncate text-xs text-muted-foreground">
            All-in-one chat + connectors
          </p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            // Clear active chat and redirect to /chat page
            setActiveChatId(null);
            router.push('/chat');
          }}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button
          variant="outline"
          className="mt-2 w-full justify-start gap-2"
          onClick={() => setAppsOpen(true)}
        >
          <PlugZap className="h-4 w-4" />
          Connect Apps
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2">
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            Chats
          </p>
          <div className="space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveChatId(chat.id);
                  router.push(`/chat/${chat.id}`);
                }}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activeChatId === chat.id &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <p className="truncate">{chat.title ?? "Untitled"}</p>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      <ConnectAppsDialog open={appsOpen} onOpenChange={setAppsOpen} />

      <div className="border-t p-3 text-xs text-muted-foreground">
        {active ? `Active: ${active.title ?? "Untitled"}` : "No chat selected"}
      </div>
    </aside>
  );
}


