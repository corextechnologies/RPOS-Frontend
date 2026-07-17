import { redirect } from "next/navigation";

export default function BranchTerminalsRedirect() {
  redirect("/branch/devices");
}
