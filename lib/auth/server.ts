import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getServerSession() {
  // Better Auth uses request headers for cookies.
  const headersList = await headers();
  console.log("Headers for session:", Object.fromEntries(headersList.entries()));
  const session = await auth.api.getSession({
    headers: headersList,
  });
  console.log("Session result:", session);
  return session;
}

export async function requireServerSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}


