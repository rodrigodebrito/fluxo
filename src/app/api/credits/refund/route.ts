import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { addCredits, getModelCost } from "@/lib/credits";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { model, taskId } = body;

  if (!model || !taskId) {
    return NextResponse.json({ error: "model e taskId sao obrigatorios" }, { status: 400 });
  }

  const cost = getModelCost(model);
  const newCredits = await addCredits(user.id, cost, `refund_${model}_${taskId}`);

  return NextResponse.json({ credits: newCredits, refunded: cost });
}
