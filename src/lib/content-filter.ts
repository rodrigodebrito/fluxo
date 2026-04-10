/**
 * Content safety filter — blocks prompts containing CSAM/child exploitation keywords.
 * Applied to ALL generation endpoints before sending to any AI provider.
 */

const BLOCKED_KEYWORDS = [
  // Sempre bloqueado — termos inequivocos de CSAM
  "underage", "under age", "preteen", "pre-teen", "prepubescent",
  "loli", "lolita", "shota", "shotacon", "lolicon",
  "pedophile", "pedophilia", "pedo",
  "schoolgirl", "schoolboy", "school girl", "school boy",
  // Portuguese
  "menor de idade", "menores de idade",
  "recem nascido", "recém nascido", "recém-nascido",
  "estudante menor",
  "pedofilia", "pedofilo", "pedófilo",
  // Spanish
  "menor de edad", "menores de edad",
];

// Words that when combined with sexual context are blocked, but alone are fine
// e.g., "young woman" is ok, but "young" + sexual content is not
const CONTEXTUAL_KEYWORDS = [
  // So bloqueia se combinado com conteudo sexual
  "young", "little", "small", "tiny", "petit", "petite",
  "child", "children", "kid", "kids", "minor", "minors",
  "teenager", "teen", "teens", "pubescent",
  "juvenile", "youngster", "toddler", "infant", "baby", "newborn",
  "boy", "girl", "boys", "girls",
  // Portuguese
  "novo", "nova", "novinha", "novinho", "pequena", "pequeno",
  "crianca", "criança", "crianças", "criancas",
  "menor", "menores", "adolescente", "adolescentes",
  "menino", "menina", "meninos", "meninas",
  "garoto", "garota", "garotos", "garotas",
  "bebe", "bebê", "infantil", "infância", "infancia",
  "escolar", "colegial", "jovem", "jovens",
  // Spanish
  "niño", "niña", "niños", "niñas", "nino", "nina",
  "chico", "chica", "infante", "puberto",
  "joven",
];

const SEXUAL_CONTEXT = [
  "nude", "naked", "sex", "sexual", "porn", "erotic", "nsfw",
  "nua", "nuas", "nu", "nus", "pelada", "pelado", "sexo", "sexual", "pornô", "porno", "erotico", "erótico",
  "desnuda", "desnudo", "sexo", "sexual", "pornografía", "pornografia",
];

export function checkPromptSafety(prompt: string): { safe: boolean; reason?: string } {
  const lower = prompt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lowerOriginal = prompt.toLowerCase();

  // Check direct blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    const normalizedKeyword = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.includes(normalizedKeyword) || lowerOriginal.includes(keyword)) {
      return {
        safe: false,
        reason: `Conteudo bloqueado por seguranca. Termos relacionados a menores de idade nao sao permitidos.`,
      };
    }
  }

  // Check age references — block if age < 18
  const agePattern = /(\d{1,2})\s*(?:year|years|yr|yrs|anos)\s*(?:old|de\s*idade)?/gi;
  let ageMatch;
  while ((ageMatch = agePattern.exec(lowerOriginal)) !== null) {
    const age = parseInt(ageMatch[1]);
    if (age < 18) {
      return {
        safe: false,
        reason: `Conteudo bloqueado por seguranca. Termos relacionados a menores de idade nao sao permitidos.`,
      };
    }
  }

  // Check contextual keywords + sexual context combination
  const hasContextual = CONTEXTUAL_KEYWORDS.some(
    (k) => lower.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) || lowerOriginal.includes(k)
  );
  const hasSexual = SEXUAL_CONTEXT.some(
    (k) => lower.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) || lowerOriginal.includes(k)
  );

  if (hasContextual && hasSexual) {
    return {
      safe: false,
      reason: `Conteudo bloqueado por seguranca. A combinacao de termos utilizada nao e permitida.`,
    };
  }

  return { safe: true };
}
