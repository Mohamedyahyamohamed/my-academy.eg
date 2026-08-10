import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/services";

/** Root: route to the right home page based on auth state. */
export default function Home() {
  const user = getCurrentUser();
  redirect(user ? roleHome(user.role) : "/login");
}
