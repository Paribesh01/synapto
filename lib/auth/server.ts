import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getServerSession() {
  // Better Auth uses request headers for cookies.
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  return session;
}

export async function requireServerSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}


