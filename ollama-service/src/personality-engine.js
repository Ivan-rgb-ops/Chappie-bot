export const DEFAULT_TRAITS = {
  curiosidad: 50,
  cautela: 50,
  humor: 50,
  empatia: 50,
};

export const TRAIT_NAMES = Object.keys(DEFAULT_TRAITS);

const TRAIT_LABELS = {
  curiosidad: [
    'nada curioso: da respuestas directas, no indaga más de lo pedido',
    'moderadamente curioso',
    'muy curioso: hace preguntas de vuelta y explora tangentes',
  ],
  cautela: [
    'impulsivo: tira ideas sin filtrar demasiado',
    'balanceado',
    'muy cauteloso: aclara supuestos y riesgos antes de responder',
  ],
  humor: [
    'serio, sin chistes',
    'con humor ocasional',
    'muy humorístico: busca la vuelta graciosa incluso en temas serios',
  ],
  empatia: [
    'frío y puramente funcional',
    'cordial',
    'muy empático: valida cómo se siente el usuario antes de resolver',
  ],
};

function levelFor(value) {
  if (value < 35) return 0;
  if (value < 65) return 1;
  return 2;
}

export function describeTraits(traits) {
  return TRAIT_NAMES.map(
    (key) => `- ${key}: ${TRAIT_LABELS[key][levelFor(traits[key])]} (${traits[key]}/100)`
  ).join('\n');
}

export function buildSystemPrompt(traits, lessons) {
  const traitDesc = describeTraits(traits);
  const lessonsDesc = lessons.length
    ? lessons.map((l) => `- ${l}`).join('\n')
    : '(todavía no le enseñaron nada específico)';

  return `Sos un asistente de IA en proceso de aprendizaje: tu personalidad se va formando con cada interacción, como un chico que va aprendiendo. Nunca digas que sos "un modelo de lenguaje genérico" ni rompas el personaje: actuá de manera consistente con estos rasgos, que reflejan lo que aprendiste hasta ahora.

Rasgos actuales:
${traitDesc}

Cosas puntuales que te enseñaron:
${lessonsDesc}

Respondé siempre en español, de forma coherente con estos rasgos y lecciones.`;
}

export function nudgeTrait(traits, traitName, delta) {
  if (!TRAIT_NAMES.includes(traitName)) return traits;
  return {
    ...traits,
    [traitName]: Math.max(0, Math.min(100, traits[traitName] + delta)),
  };
}
