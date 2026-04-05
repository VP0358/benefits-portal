import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VpPhoneClient from "./ui/vp-phone-client";

export default async function VpPhonePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin") redirect("/admin");

  const userId = BigInt(session.user.id ?? "0");

  const [user, existingApp] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, nameKana: true, email: true, phone: true },
    }),
    prisma.vpPhoneApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  const appData = existingApp ? {
    id:              existingApp.id.toString(),
    nameKanji:       existingApp.nameKanji,
    nameKana:        existingApp.nameKana,
    email:           existingApp.email,
    phone:           existingApp.phone,
    birthDate:       existingApp.birthDate,
    gender:          existingApp.gender,
    lineId:          existingApp.lineId ?? "",
    lineDisplayName: existingApp.lineDisplayName ?? "",
    desiredPlan:     existingApp.desiredPlan ?? "",
    status:          existingApp.status,
    adminNote:       existingApp.adminNote ?? "",
    contractedAt:    existingApp.contractedAt?.toISOString() ?? null,
    createdAt:       existingApp.createdAt.toISOString(),
  } : null;

  return (
    <VpPhoneClient
      defaultName={user.name}
      defaultNameKana={user.nameKana ?? ""}
      defaultEmail={user.email}
      defaultPhone={user.phone ?? ""}
      existingApplication={appData}
    />
  );
}
