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
const PORT = process.env.PORT || 3001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('\n❌ OPENROUTER_API_KEY not found in .env file!');
  console.error('   Create a .env file in the project root with:');
  console.error('   OPENROUTER_API_KEY=sk-or-your-key-here\n');
  process.exit(1);
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
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3001'],
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

// OpenRouter API proxy
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, system, topic } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Limit conversation length to prevent abuse
    const trimmedMessages = messages.slice(-12);
    
    // Transform to OpenAI/OpenRouter format: system prompt goes in messages
    const openRouterMessages = system 
      ? [{ role: 'system', content: system }, ...trimmedMessages]
      : trimmedMessages;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'CFA Rapid Doubts'
      },
      body: JSON.stringify({
        model: process.env.MODEL || 'stepfun/step-3.5-flash:free',
        max_tokens: 1024,
        messages: openRouterMessages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`OpenRouter API error [${response.status}]:`, errBody);
      return res.status(response.status).json({
        error: `API error: ${response.status}`,
        detail: response.status === 429 ? 'Rate limited by OpenRouter. Wait a moment.' : 'Something went wrong.',
      });
    }

    const data = await response.json();
    
    // Transform OpenRouter's response back into the format the frontend expects (Anthropic style)
    const anthropicFormat = {
      content: [
        { text: data.choices?.[0]?.message?.content || "No response generated." }
      ]
    };
    
    res.json(anthropicFormat);
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   ⚡ CFA RAPID DOUBTS SERVER                ║
║   Theta X Research                           ║
╠══════════════════════════════════════════════╣
║   Port:  ${PORT}                                ║
║   Mode:  ${process.env.NODE_ENV || 'development'}                        ║
║   Model: ${process.env.MODEL || 'claude-sonnet-4-20250514'}  ║
╚══════════════════════════════════════════════╝
  `);
});
