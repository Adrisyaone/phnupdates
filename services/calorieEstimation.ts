import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { NutritionEstimate } from '@/types/food';

const nutritionSchema = z.object({
  name: z.string().describe('Name of the food item'),
  calories: z.number().describe('Estimated calories'),
  protein: z.number().describe('Protein in grams'),
  carbs: z.number().describe('Carbohydrates in grams'),
  fat: z.number().describe('Fat in grams'),
  servingSize: z.string().describe('Estimated serving size'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the estimation'),
});

export async function estimateCaloriesFromText(description: string): Promise<NutritionEstimate> {
  console.log('[CalorieEstimation] Estimating from text:', description);
  
  const result = await generateObject({
    messages: [
      {
        role: 'user',
        content: `You are a nutrition expert. Analyze this food description and provide accurate nutritional estimates.

Food description: "${description}"

Provide realistic nutritional values based on typical serving sizes. Be specific about the serving size you're estimating for.`,
      },
    ],
    schema: nutritionSchema,
  });

  console.log('[CalorieEstimation] Result:', result);
  return result;
}

export async function estimateCaloriesFromImage(base64Image: string): Promise<NutritionEstimate> {
  console.log('[CalorieEstimation] Estimating from image');
  
  const result = await generateObject({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a nutrition expert. Analyze this food image and provide accurate nutritional estimates.

Look at the food in the image and estimate:
1. What food item(s) are shown
2. The approximate portion size
3. Nutritional values (calories, protein, carbs, fat)

Be realistic and specific about what you see. If multiple items are visible, combine them into one estimate.`,
          },
          {
            type: 'image',
            image: base64Image,
          },
        ],
      },
    ],
    schema: nutritionSchema,
  });

  console.log('[CalorieEstimation] Image result:', result);
  return result;
}
