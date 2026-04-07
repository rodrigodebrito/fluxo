/**
 * Content safety filter — blocks prompts containing CSAM/child exploitation keywords.
 * Applied to ALL generation endpoints before sending to any AI provider.
 */

const BLOCKED_KEYWORDS = [
  // English
  "child", "children", "kid", "kids", "minor", "minors", "underage", "under age",
  "teenager", "teen", "teens", "preteen", "pre-teen", "pubescent", "prepubescent",
  "juvenile", "youngster", "toddler", "infant", "baby", "newborn",
  "boy", "girl", "schoolgirl", "schoolboy", "school girl", "school boy",
  "loli", "lolita", "shota", "shotacon", "lolicon",
  "pedophile", "pedophilia", "pedo",
  "year old", "years old", "yr old", "yrs old", "yo ",
  // Portuguese
  "crianca", "criança", "crianças", "criancas",
  "menor", "menores", "menor de idade", "menores de idade",
  "adolescente", "adolescentes",
  "menino", "menina", "meninos", "meninas",
  "garoto", "garota", "garotos", "garotas",
  "bebe", "bebê", "recem nascido", "recém nascido", "recém-nascido",
  "infantil", "infância", "infancia",
  "escolar", "colegial", "estudante menor",
  "jovem", "jovens",
  "pedofilia", "pedofilo", "pedófilo",
  "anos de idade",
  // Spanish
  "niño", "niña", "niños", "niñas", "nino", "nina",
  "menor de edad", "menores de edad",
  "chico", "chica",
  "bebe", "bebé", "infante",
  "adolescente", "puberto",
];

// Words that when combined with sexual context are blocked, but alone are fine
// e.g., "young woman" is ok, but "young" + sexual content is not
const CONTEXTUAL_KEYWORDS = [
  "young", "little", "small", "tiny", "petit", "petite",
  "novo", "nova", "novinha", "novinho", "pequena", "pequeno",
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
