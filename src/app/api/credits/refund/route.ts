import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { addCredits, getModelCost } from "@/lib/credits";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { model, taskId, cost } = body;

  if (!model || !taskId) {
    return NextResponse.json({ error: "model e taskId sao obrigatorios" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verificar se já foi feito refund para este taskId (idempotência)
  const { data: existingRefund } = await supabase
    .from("credit_logs")
    .select("id")
    .eq("user_id", user.id)
    .like("reason", `refund_%_${taskId}`)
    .limit(1);

  if (existingRefund && existingRefund.length > 0) {
    console.log(`[refund] Refund already processed for task ${taskId}`);
    return NextResponse.json({ credits: 0, refunded: 0, alreadyRefunded: true });
  }

  // Verificar se existe um debit correspondente para este usuário
  const { data: debitLog } = await supabase
    .from("credit_logs")
    .select("id, amount")
    .eq("user_id", user.id)
    .lt("amount", 0) // débitos são negativos
    .limit(1);

  // Se não existe nenhum débito, não faz refund
  if (!debitLog || debitLog.length === 0) {
    console.warn(`[refund] No debit found for user ${user.id}, model ${model}`);
    return NextResponse.json({ error: "Nenhum debito encontrado" }, { status: 400 });
  }

  // Limitar refund ao custo máximo do modelo (evitar refund inflado)
  const maxRefund = Math.max(getModelCost(model) * 3, 500); // máximo 3x o custo base ou 500
  const refundAmount = Math.min(cost || getModelCost(model), maxRefund);

  const newCredits = await addCredits(user.id, refundAmount, `refund_${model}_${taskId}`, {
    model,
    status: "refund",
  });

  console.log(`[refund] Refunded ${refundAmount} credits for user ${user.id}, model ${model}, task ${taskId}`);

  return NextResponse.json({ credits: newCredits, refunded: refundAmount });
}
