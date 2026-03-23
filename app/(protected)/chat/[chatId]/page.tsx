import { ChatShell } from "@/components/chat/chat-shell";

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  return <ChatShell chatId={chatId} />;
}
