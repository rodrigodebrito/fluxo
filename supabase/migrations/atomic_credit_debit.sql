-- Função atômica para debitar créditos (evita race condition)
-- Usa UPDATE ... SET credits = credits - amount WHERE credits >= amount
-- Retorna os créditos restantes ou -1 se insuficiente
CREATE OR REPLACE FUNCTION debit_credits(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining INT;
BEGIN
  UPDATE profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id AND credits >= p_amount
  RETURNING credits INTO v_remaining;

  IF NOT FOUND THEN
    -- Créditos insuficientes
    SELECT credits INTO v_remaining FROM profiles WHERE id = p_user_id;
    RETURN -1;
  END IF;

  RETURN v_remaining;
END;
$$;
