import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { addCredits, findDebitLogByTaskId, findRefundLogByTaskId } from "@/lib/credits";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { model, taskId } = body;

  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json({ error: "taskId e obrigatorio" }, { status: 400 });
  }

  const existingRefund = await findRefundLogByTaskId(user.id, taskId);
  if (existingRefund) {
    console.log(`[refund] Refund already processed for task ${taskId}`);
    return NextResponse.json({ credits: 0, refunded: 0, alreadyRefunded: true });
  }

  const debitLog = await findDebitLogByTaskId(user.id, taskId);
  if (!debitLog) {
    console.warn(`[refund] No debit found for user ${user.id}, task ${taskId}`);
    return NextResponse.json({ error: "Nenhum debito encontrado para esta task" }, { status: 404 });
  }

  if (model && debitLog.model && model !== debitLog.model) {
    return NextResponse.json({ error: "Model nao corresponde ao debito original" }, { status: 409 });
  }

  const refundAmount = Math.abs(debitLog.amount);
  const newCredits = await addCredits(user.id, refundAmount, `refund_${debitLog.model || model || "unknown"}_${taskId}`, {
    model: debitLog.model || model || null,
    status: "refund",
    metadata: {
      refundForTaskId: taskId,
      refundForCreditLogId: debitLog.id,
      originalDebitAmount: debitLog.amount,
      originalReason: debitLog.reason,
    },
  });

  console.log(`[refund] Refunded ${refundAmount} credits for user ${user.id}, model ${debitLog.model || model}, task ${taskId}`);

  return NextResponse.json({ credits: newCredits, refunded: refundAmount });
}
