"use client";

import * as React from "react";

type ChatStore = {
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
};

const ChatStoreContext = React.createContext<ChatStore | null>(null);

export function ChatStoreProvider({ children }: { children: React.ReactNode }) {
  const [activeChatId, setActiveChatIdState] = React.useState<string | null>(
    null,
  );

  const setActiveChatId = React.useCallback((id: string | null) => {
    setActiveChatIdState(id);
  }, []);

  return (
    <ChatStoreContext.Provider value={{ activeChatId, setActiveChatId }}>
      {children}
    </ChatStoreContext.Provider>
  );
}

export function useChatStore() {
  const ctx = React.useContext(ChatStoreContext);
  if (!ctx) {
    throw new Error("useChatStore must be used within ChatStoreProvider");
  }
  return ctx;
}


