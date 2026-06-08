import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

const lipidProfileImageSchema = z.object({
  tg: z.number().describe('Triglycerides value in mg/dL. Return 0 if not readable.'),
  hdl: z.number().describe('HDL cholesterol value in mg/dL. Return 0 if not readable.'),
  ldl: z.number().describe('LDL cholesterol value in mg/dL. Return 0 if not readable.'),
  vldl: z.number().describe('VLDL cholesterol value in mg/dL. Return 0 if not readable.'),
  totalCholesterol: z.number().describe('Total cholesterol value in mg/dL. Return 0 if not readable.'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the extraction.'),
  isValid: z.boolean().describe('Whether the image appears to be a lipid profile or lab report containing cholesterol values.'),
});

export type LipidProfileImageResult = z.infer<typeof lipidProfileImageSchema>;

export async function identifyLipidProfileFromImage(base64Image: string): Promise<LipidProfileImageResult> {
  console.log('[LipidProfileImage] Extracting lipid values from image...');

  const result = await generateObject({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a clinical lab assistant. Analyze this lab report image and extract lipid values.

Tasks:
1. Detect whether this image contains a lipid profile or lab report with cholesterol values.
2. Extract Triglycerides (TG), HDL, LDL, VLDL, and Total Cholesterol values in mg/dL.
3. Ignore unrelated numbers like patient IDs, dates, page numbers, ratio values, and reference ranges.

Rules:
- Return only TG, HDL, LDL, VLDL, and Total Cholesterol.
- If a value is missing or unreadable, return 0 for that field.
- If the image is not a lipid lab report, set isValid=false.
`,
          },
          {
            type: 'image',
            image: base64Image,
          },
        ],
      },
    ],
    schema: lipidProfileImageSchema,
  });

  console.log('[LipidProfileImage] Extraction result:', result);
  return result;
}