"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import { useChatStore } from "@/components/chat/use-chat-store";
import { MessageList } from "@/components/chat/message-list";
import { ChatComposer } from "@/components/chat/chat-composer";
import { cn } from "@/lib/utils";

type DbMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

function ChatInner() {
  const { activeChatId } = useChatStore();
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const chatId = activeChatId ?? "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!chatId) return;
      setLoading(true);
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { messages: DbMessage[] };
      if (cancelled) return;
      setInitialMessages(
        data.messages.map((m) => ({
          id: m.id,
          role: m.role === "assistant" ? "assistant" : "user",
          parts: [{ type: "text", text: m.content }],
        })),
      );
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const {
    messages,
    sendMessage,
    setMessages,
  } = useChat();
  const isStreaming = false; // Temporary fix

  const [input, setInput] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      setInput("");
      await sendMessage({
        parts: [{ type: "text", text: input }],
      }, {
        body: {
          chatId,
        },
      });
    }
  };

  // When switching chats, replace client messages with loaded history.
  useEffect(() => {
    setMessages(initialMessages);
  }, [chatId, initialMessages, setMessages]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList
          className="flex-1"
          messages={messages}
          emptyState={
            loading
              ? "Loading messages…"
              : "Ask something, or try: “Create a meeting tomorrow at 5pm.”"
          }
        />
      </div>

      <div className={cn("border-t bg-background p-4")}>
        <ChatComposer
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          disabled={!chatId || isStreaming}
        />
      </div>
    </div>
  );
}

export function ChatShell() {
  return <ChatInner />;
}


