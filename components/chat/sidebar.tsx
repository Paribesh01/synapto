"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, PlugZap, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const active = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  );

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter((c) => (c.title ?? "Untitled").toLowerCase().includes(q));
  }, [chats, search]);

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

  async function handleDelete(chatId: string) {
    setDeletingId(chatId);
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (!res.ok) return;

      setChats((prev) => {
        const next = prev.filter((c) => c.id !== chatId);
        if (activeChatId === chatId) {
          if (next[0]) {
            setActiveChatId(next[0].id);
            router.push(`/chat/${next[0].id}`);
          } else {
            setActiveChatId(null);
            router.push("/chat");
          }
        }
        return next;
      });
    } finally {
      setDeletingId(null);
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
          <p className="truncate text-sm font-medium">ChatBB</p>
          <p className="truncate text-xs text-muted-foreground">
            All-in-one chat + connectors
          </p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            setActiveChatId(null);
            router.push("/chat");
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

      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            Chats
          </p>
          <div className="space-y-1">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group flex items-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activeChatId === chat.id &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <button
                  onClick={() => {
                    setActiveChatId(chat.id);
                    router.push(`/chat/${chat.id}`);
                  }}
                  className="min-w-0 flex-1 px-3 py-2 text-left text-sm"
                >
                  <p className="truncate">{chat.title ?? "Untitled"}</p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(chat.id);
                  }}
                  disabled={deletingId === chat.id}
                  className="mr-1 shrink-0 rounded p-1 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {filteredChats.length === 0 && search && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No chats match &ldquo;{search}&rdquo;
              </p>
            )}
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
