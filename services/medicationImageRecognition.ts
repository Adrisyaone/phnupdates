import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

const medicationImageSchema = z.object({
  name: z.string().describe('Name of the medication identified from the image (brand name or generic name). If the image does not contain a recognizable medication, return "unknown".'),
  dosage: z.string().describe('Dosage amount found on the label, e.g. "500", "10", "250". If not visible, provide a common dosage. If unknown, return "0".'),
  unit: z.enum(['mg', 'ml', 'tablet', 'capsule', 'drops', 'puff']).describe('Unit of dosage. Determine from the form visible in the image (pill=tablet, capsule shape=capsule, liquid=ml, etc.)'),
  category: z.enum(['prescription', 'otc', 'supplement', 'vitamin']).describe('Category based on the medication type visible'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the identification. Use "low" if the image does not clearly show a medication.'),
  isValid: z.boolean().describe('Whether the image actually contains a recognizable medication. Set to false if the image is not of a medication or cannot be identified at all.'),
});

export type MedicationImageResult = z.infer<typeof medicationImageSchema>;

export async function identifyMedicationFromImage(base64Image: string): Promise<MedicationImageResult> {
  console.log('[MedicationImage] Identifying medication from image...');

  const result = await generateObject({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a pharmacist expert. Analyze this medication image and identify:

1. The medication name (read from label, packaging, or pill imprint)
2. The dosage amount (read from label or estimate from common dosages)
3. The unit/form (tablet, capsule, mg, ml, drops, puff)
4. The category (prescription, otc, supplement, vitamin)

Look carefully at:
- Packaging labels and text
- Pill imprints and markings
- Bottle labels
- Blister pack information
- Any visible text on the medication or its container

If you cannot clearly identify the medication, provide your best estimate based on visual cues like pill shape, color, size, and any partial text visible. If the image does not appear to contain any medication at all (e.g. random object, food, scenery), set isValid to false.`,
          },
          {
            type: 'image',
            image: base64Image,
          },
        ],
      },
    ],
    schema: medicationImageSchema,
  });

  console.log('[MedicationImage] Identification result:', result);
  return result;
}
