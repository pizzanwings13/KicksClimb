import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function initializeApp() {
  if (initialized) return;
  await registerRoutes(httpServer, app);
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  
  initialized = true;
}

export default async function handler(req: Request, res: Response) {
  await initializeApp();
  return app(req, res);
}
