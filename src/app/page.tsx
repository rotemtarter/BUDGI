import { redirect } from "next/navigation";

// The proxy sends "/" to /dashboard or /login; this is only a fallback
export default function RootPage() {
  redirect("/dashboard");
}
