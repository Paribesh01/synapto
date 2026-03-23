"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
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

function ChatInner({ chatId: propChatId }: { chatId?: string }) {
  const router = useRouter();
  const { activeChatId, setActiveChatId } = useChatStore();
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Only use prop chatId if provided, otherwise use null for /chat page
  const chatId = propChatId || null;

  // Clear active chat ID when on /chat page (no propChatId)
  useEffect(() => {
    if (!propChatId && activeChatId) {
      setActiveChatId(null);
    }
  }, [propChatId, activeChatId, setActiveChatId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Only load messages if we have a valid chatId
      if (!chatId || chatId === "undefined") return;
      setLoading(true);
      
      // Check for pending message in localStorage first
      const pendingMessageKey = `pendingMessage_${chatId}`;
      const pendingMessage = localStorage.getItem(pendingMessageKey);
      
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = (await res.json()) as { messages: DbMessage[] };
        if (cancelled) return;
        
        let messages: UIMessage[] = [];
        
        // Add pending message if exists
        if (pendingMessage) {
          try {
            const pendingMsg = JSON.parse(pendingMessage);
            messages.push({
              id: pendingMsg.id,
              role: "user" as "user" | "assistant",
              parts: [{ type: "text" as const, text: pendingMsg.content }],
            });
            // Clear pending message after loading
            localStorage.removeItem(pendingMessageKey);
          } catch (e) {
            console.error("Failed to parse pending message:", e);
          }
        }
        
        // Add existing messages from database
        messages.push(...data.messages.map((m) => ({
          id: m.id,
          role: (m.role as "user" | "assistant"),
          parts: [{ type: "text" as const, text: m.content }],
        })));
        
        setInitialMessages(messages);
        setLoading(false);
        
        // If we had a pending user message, automatically send it to AI
        if (pendingMessage) {
          try {
            const pendingMsg = JSON.parse(pendingMessage);
            console.log("Sending pending message to AI:", pendingMsg.content);
            await sendMessage({
              parts: [{ type: "text", text: pendingMsg.content }],
            }, {
              body: {
                chatId,
              },
            });
          } catch (e) {
            console.error("Failed to send pending message:", e);
          }
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [chatId]); // Remove activeChatId and initialMessages from dependencies to prevent infinite loops

  const {
    messages,
    sendMessage,
    setMessages,
  } = useChat();
  const isStreaming = false; // Temporary fix

  // Debug: Log when chatId changes
  useEffect(() => {
    console.log("ChatShell props:", { propChatId, activeChatId, finalChatId: chatId });
  }, [propChatId, activeChatId, chatId]);

  const [input, setInput] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("handleSubmit called with input:", input);
    
    if (input.trim() && !isStreaming) {
      setInput("");
      
      // If no chatId, create new chat first
      let currentChatId = chatId;
      if (!currentChatId) {
        console.log("No chatId, creating new chat...");
        
        // Save message to localStorage for the new chat
        const tempMessageId = Date.now().toString();
        localStorage.setItem('pendingMessage', JSON.stringify({
          id: tempMessageId,
          role: 'user',
          content: input,
          createdAt: new Date().toISOString()
        }));
        
        try {
          const res = await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: input.slice(0, 50) }),
          });
          
          console.log("Chat creation response:", res.status);
          
          if (res.ok) {
            const newChat = await res.json();
            console.log("New chat created:", newChat);
            console.log("newChat.chatId:", newChat.chatId);
            console.log("newChat.chatId type:", typeof newChat.chatId);
            currentChatId = newChat.chatId;
            
            // Save pending message to localStorage for the new chat
            if (newChat.chatId) {
              console.log("Entering newChat.chatId block...");
              localStorage.setItem(`pendingMessage_${newChat.chatId}`, JSON.stringify({
                id: tempMessageId,
                role: 'user',
                content: input,
                createdAt: new Date().toISOString()
              }));
              
              // Update store
              setActiveChatId(newChat.chatId);
              
              // Send the message immediately after creating the chat (non-blocking)
              const sendMessagePromise = (async () => {
                try {
                  console.log("Sending message to new chat:", newChat.chatId, input);
                  const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      chatId: newChat.chatId,
                      messages: [{
                        id: tempMessageId,
                        role: 'user',
                        parts: [{ type: 'text', text: input }]
                      }]
                    })
                  });
                  
                  console.log("Message send response:", response.status);
                  
                  if (response.ok) {
                    console.log("Message sent successfully");
                  } else {
                    console.error("Failed to send message:", response.status, response.statusText);
                    const errorText = await response.text();
                    console.error("Error response:", errorText);
                  }
                } catch (error) {
                  console.error("Error sending message:", error);
                }
              })();
              
              // Redirect immediately without waiting for message sending
              console.log("Redirecting to:", `/chat/${newChat.chatId}`);
              window.location.href = `/chat/${newChat.chatId}`;
              return;
            } else {
              console.log("newChat.chatId is falsy, not entering block");
            }
          } else {
            console.error("Failed to create chat:", res.status);
            const errorText = await res.text();
            console.error("Chat creation error:", errorText);
          }
        } catch (error) {
          console.error("Error creating chat:", error);
        }
      } else {
        console.log("Using existing chatId:", currentChatId);
      }

      // If we have an existing chatId, send the message normally
      if (currentChatId) {
        console.log("Sending message to existing chat:", currentChatId, input);
        await sendMessage({
          parts: [{ type: "text", text: input }],
        }, {
          body: {
            chatId: currentChatId,
          },
        });
      }
    }
  };

  // When switching chats, replace client messages with loaded history.
  useEffect(() => {
    // Only set messages if we have a valid chatId
    if (chatId && chatId !== "undefined" && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
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
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}

export function ChatShell({ chatId: propChatId }: { chatId?: string }) {
  return <ChatInner chatId={propChatId} />;
}


