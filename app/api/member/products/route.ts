import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, price: true, imageUrl: true },
  });

  return NextResponse.json(
    products.map(p => ({ id: p.id.toString(), name: p.name, description: p.description, price: p.price, imageUrl: p.imageUrl }))
  );
}
