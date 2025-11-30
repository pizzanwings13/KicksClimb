import express, { type Request, Response, NextFunction } from "express";
import serverless from "serverless-http";
import { registerRoutes } from "../server/routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function initializeApp() {
  if (initialized) return;
  await registerRoutes(app);
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  
  initialized = true;
}

const handler = serverless(app);

export default async function (req: Request, res: Response) {
  await initializeApp();
  return handler(req, res);
}
