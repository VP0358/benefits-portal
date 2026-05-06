import { auth } from "@/auth";
import { redirect } from "next/navigation";
import WelfareContractsClient from "./ui/welfare-contracts-client";

export default async function WelfareContractsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return <WelfareContractsClient />;
}
