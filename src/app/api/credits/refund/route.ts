import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { addCredits, getModelCost } from "@/lib/credits";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { model, taskId, cost } = body;

  if (!model || !taskId) {
    return NextResponse.json({ error: "model e taskId sao obrigatorios" }, { status: 400 });
  }

  const refundAmount = cost || getModelCost(model);
  const newCredits = await addCredits(user.id, refundAmount, `refund_${model}_${taskId}`);

  return NextResponse.json({ credits: newCredits, refunded: refundAmount });
}
