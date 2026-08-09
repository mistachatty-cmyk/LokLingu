import { Router } from 'express';
import { openai } from '@workspace/integrations-openai-ai-server';
import { RecognizeDrawingBody } from '@workspace/api-zod';

const router = Router();

/**
 * POST /draw/recognize
 * Evaluate a canvas drawing against a target word using AI vision.
 * Returns a verdict: ACCEPT | CLOSE | REJECT
 */
router.post('/draw/recognize', async (req, res) => {
  const parsed = RecognizeDrawingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    return;
  }

  const { imageDataUrl, word, language } = parsed.data;

  // Strip the data URL prefix — OpenAI expects raw base64
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_completion_tokens: 10,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `A language learner is playing a drawing game. They were asked to WRITE (not draw a picture of) the word "${word}" in ${language}. Look at the handwritten text in this image and decide if it matches.\n\nRespond with exactly one word:\n- ACCEPT if the handwriting clearly shows "${word}"\n- CLOSE if it looks like "${word}" but is slightly messy or imprecise\n- REJECT if it does not resemble "${word}" at all\n\nOne word only:`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/webp;base64,${base64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim().toUpperCase() ?? 'REJECT';
    const verdict = raw.startsWith('ACCEPT')
      ? 'ACCEPT'
      : raw.startsWith('CLOSE')
        ? 'CLOSE'
        : 'REJECT';

    res.json({ verdict });
  } catch (err) {
    console.error('[draw/recognize] OpenAI error:', err);
    res.status(500).json({ error: 'Recognition service unavailable' });
  }
});

export default router;
