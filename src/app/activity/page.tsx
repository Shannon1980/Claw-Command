import { redirect } from "next/navigation";

export default function ActivityRedirect() {
  redirect("/monitoring?tab=activity");
}
