import express from 'express';
import { authenticateSession } from '../middleware/auth';
import path from 'path';
import { readFile } from 'fs/promises';

const router = express.Router();
router.use(authenticateSession);

const REPLICATE_MODEL = 'black-forest-labs/flux-1.1-pro';

const STYLE_PROMPTS: Record<string, string> = {
  modern: 'Professionally staged living space with modern furniture, clean lines, neutral palette, bright natural light, interior design magazine quality',
  traditional: 'Professionally staged living space with traditional furniture, warm tones, classic decor, cozy atmosphere',
  luxury: 'Luxury staged living space with high-end furniture, designer accessories, dramatic lighting, premium finishes',
  minimalist: 'Minimalist staged living space with sparse modern furniture, white walls, abundant natural light, Scandinavian design',
  farmhouse: 'Professionally staged farmhouse-style living space with shiplap, natural wood tones, cozy textiles, and rustic modern accents',
};

async function runReplicate(imageBase64: string, prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not set');

  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: REPLICATE_MODEL,
      input: {
        prompt,
        image: `data:image/jpeg;base64,${imageBase64}`,
        num_outputs: 1,
        aspect_ratio: '4:3',
        output_format: 'webp',
        output_quality: 90,
      },
    }),
  });

  if (!startRes.ok) throw new Error(`Replicate start failed: ${await startRes.text()}`);
  const prediction = await startRes.json() as { id: string; status: string };

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await pollRes.json() as { status: string; output?: string[]; error?: string };
    if (data.status === 'succeeded' && data.output?.[0]) return data.output[0];
    if (data.status === 'failed') throw new Error(`Replicate failed: ${data.error}`);
  }
  throw new Error('Replicate prediction timed out');
}

/**
 * POST /api/listing-staging
 * Body: { photo_path: string, style?: string }
 * Returns: { staged_url: string }
 */
router.post('/', async (req, res) => {
  try {
    const { photo_path, style = 'modern' } = req.body as { photo_path: string; style?: string };

    if (!photo_path) {
      return res.status(400).json({ error: 'photo_path is required' });
    }

    // Resolve local file path
    const localPath = path.join(process.cwd(), photo_path.replace(/^\//, ''));
    const buf = await readFile(localPath);
    const imageBase64 = buf.toString('base64');

    const prompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.modern;
    const stagedUrl = await runReplicate(imageBase64, prompt);

    res.json({ staged_url: stagedUrl });
  } catch (err: any) {
    console.error('[staging-routes] POST /api/listing-staging:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
