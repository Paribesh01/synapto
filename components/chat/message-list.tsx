"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { Copy, Check, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
      title="Copy message"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

export function MessageList({
  messages,
  emptyState,
  isStreaming,
  onRegenerate,
  className,
}: {
  messages: UIMessage[];
  emptyState: string;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const lastAssistantIndex = messages.reduce(
    (last, m, i) => (m.role === "assistant" ? i : last),
    -1,
  );

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        {messages.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            {emptyState}
          </div>
        ) : null}

        {messages.map((m, index) => {
          const content = m.parts?.find(part => part.type === "text")?.text || "";
          const isLastAssistant = index === lastAssistantIndex;

          return (
            <div key={m.id} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {m.role === "user" ? "You" : "Assistant"}
              </div>

              <div className="group relative rounded-lg border bg-card p-4 text-sm leading-6">
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-p:my-1 prose-p:leading-6
                    prose-headings:mt-3 prose-headings:mb-1
                    prose-ul:my-1 prose-ol:my-1
                    prose-li:my-0
                    prose-pre:my-2 prose-pre:bg-muted prose-pre:rounded prose-pre:p-3 prose-pre:overflow-x-auto
                    prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                    prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:text-muted-foreground
                    prose-hr:my-3
                    prose-table:text-sm
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{content}</p>
                )}

                <div className="absolute right-2 top-2">
                  <CopyButton text={content} />
                </div>
              </div>

              {isLastAssistant && onRegenerate && !isStreaming && (
                <div className="flex justify-end">
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Regenerate response"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
