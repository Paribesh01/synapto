"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function MessageList({
  messages,
  emptyState,
  className,
}: {
  messages: UIMessage[];
  emptyState: string;
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        {messages.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            {emptyState}
          </div>
        ) : null}

        {messages.map((m) => {
          const content = m.parts?.find(part => part.type === "text")?.text || "";
          return (
            <div key={m.id} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {m.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm leading-6">
                {content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}


