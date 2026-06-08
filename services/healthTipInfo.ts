import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

const healthTipDetailsSchema = z.object({
  summary: z.string().describe('Clear explanation of the tip in 2 to 4 short sentences.'),
  whyItMatters: z.string().describe('Why this tip is useful for health.'),
  howToApplyToday: z.array(z.string()).describe('3 to 5 practical steps a person can follow today.'),
  commonMistakes: z.array(z.string()).describe('2 to 4 common mistakes to avoid.'),
  caution: z.string().describe('Simple safety note and who should seek medical advice.'),
});

export type HealthTipDetails = z.infer<typeof healthTipDetailsSchema>;

export async function getHealthTipDetails(tip: string): Promise<HealthTipDetails> {
  return generateObject({
    messages: [
      {
        role: 'user',
        content: `You are a practical health educator. Expand this health tip into detailed but simple guidance:\n\n"${tip}"\n\nRules:\n- Keep language simple and user-friendly.\n- Be evidence-aligned and avoid unsupported claims.\n- Do not provide diagnosis or medication dosing.\n- Keep advice practical for everyday users.\n- Keep bullets concise.`,
      },
    ],
    schema: healthTipDetailsSchema,
  });
}
