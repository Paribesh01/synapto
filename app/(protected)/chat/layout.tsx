import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { ChatLayoutClient } from "@/components/chat/chat-layout-client";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return <ChatLayoutClient>{children}</ChatLayoutClient>;
}


