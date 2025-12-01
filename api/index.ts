import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

let initialized = false;
let initError: Error | null = null;

async function initializeApp() {
  if (initialized) return;
  if (initError) throw initError;
  
  try {
    console.log('[Vercel API] Initializing routes...');
    await registerRoutes(app);
    console.log('[Vercel API] Routes registered successfully');
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[Vercel API] Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ error: message });
    });
    
    initialized = true;
  } catch (error) {
    console.error('[Vercel API] Initialization error:', error);
    initError = error as Error;
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeApp();
    
    return new Promise<void>((resolve, reject) => {
      app(req as any, res as any, (err?: any) => {
        if (err) {
          console.error('[Vercel API] Request error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Internal server error' });
          }
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error: any) {
    console.error('[Vercel API] Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to initialize API' });
    }
  }
}
