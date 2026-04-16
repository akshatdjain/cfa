import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Crucial for accurate IP rate limiting behind Vercel
const PORT = process.env.PORT || 3001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn('\n⚠️ OPENROUTER_API_KEY not found in environment variables! API calls will fail.');
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors({
  origin: '*' // Open CORS so it strictly never blocks any valid Vercel domains
}));

app.use(express.json({ limit: '50kb' }));

// Rate limiting - 30 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CFA Rapid Doubts API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// OpenRouter API proxy with fallback models
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, system, topic } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
    }

    // Limit conversation length to prevent abuse
    const trimmedMessages = messages.slice(-12);
    
    // Transform to OpenAI/OpenRouter format: system prompt goes in messages
    const openRouterMessages = system 
      ? [{ role: 'system', content: system }, ...trimmedMessages]
      : trimmedMessages;

    // Get the actual request origin dynamically
    const referer = req.headers.referer || req.headers.origin || 'https://cfa-rapid-doubts.vercel.app';
    
    // Fallback models in order of preference (tested and working)
    // Updated with actual working free models from OpenRouter as of April 2026
    const models = [
      process.env.MODEL || 'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'google/gemma-4-26b-a4b-it:free',
      'arcee-ai/trinity-large-preview:free'
    ];
    
    let lastError = null;
    
    // Try each model until one works
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      console.log(`[Attempt ${i + 1}/${models.length}] Trying model: ${model}`);
      
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': referer,
            'X-Title': 'CFA Rapid Doubts'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1024,
            messages: openRouterMessages,
          }),
        });

        if (response.ok) {
          // Success! Return the response
          const data = await response.json();
          console.log(`✓ Success with model: ${model}`);
          
          const anthropicFormat = {
            content: [
              { text: data.choices?.[0]?.message?.content || "No response generated." }
            ],
            model_used: model // Let you know which model worked
          };
          
          return res.json(anthropicFormat);
        }
        
        // If rate limited or 404, try next model
        const errBody = await response.text();
        lastError = { status: response.status, body: errBody, model: model };
        console.error(`✗ Model ${model} failed [${response.status}]`);
        
        if (response.status === 429 || response.status === 404) {
          // Rate limited or not found, try next model
          if (i < models.length - 1) {
            console.log(`→ Falling back to next model...`);
            continue;
          }
        } else {
          // Other error (auth, etc), don't retry
          break;
        }
      } catch (fetchErr) {
        console.error(`✗ Fetch error for ${model}:`, fetchErr.message);
        lastError = { error: fetchErr.message, model: model };
        if (i < models.length - 1) continue;
      }
    }
    
    // All models failed
    console.error('⚠ All models failed. Last error:', lastError);
    return res.status(lastError?.status || 503).json({
      error: `All models unavailable`,
      detail: 'All AI models are currently rate-limited or unavailable. Please try again in a moment.',
      last_error: lastError
    });
    
  } catch (err) {
    console.error('Server error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Serve static build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║   ⚡ CFA RAPID DOUBTS SERVER                ║
  ║   Theta X Research                           ║
  ╠══════════════════════════════════════════════╣
  ║   Port:  ${PORT}                                ║
  ║   Mode:  ${process.env.NODE_ENV || 'development'}                        ║
  ║   Models: Llama 3.3 70B → Gemini → Mistral  ║
  ╚══════════════════════════════════════════════╝
    `);
  });
}

export default app;