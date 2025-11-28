// api/assistant.ts
import OpenAI from 'openai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, systemPrompt, notes } = req.body;

    if (!question || !systemPrompt || !notes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    const notesText = notes
      .map((n: any) => `- ${n.title}: ${n.text || ''}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Question: ${question}\n\nRelevant notes:\n${notesText}\n\nAnswer based only on these notes.`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    return res.status(200).json({
      answer: response.choices[0].message.content || "No answer available."
    });
  } catch (error: any) {
    console.error('Assistant API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Assistant failed' 
    });
  }
}
