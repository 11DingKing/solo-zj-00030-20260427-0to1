import Koa from "koa";
import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";
import { config } from "./config";
import router from "./routes";
import pool from "./db";
import redis from "./redis";
import initializeDatabase from "./db/init";

const app = new Koa();

app.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  }),
);

app.use(
  bodyParser({
    jsonLimit: "10mb",
    formLimit: "10mb",
  }),
);

app.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
    const ms = Date.now() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ctx.status} - ${ms}ms`);
  } catch (error) {
    const ms = Date.now() - start;
    console.error(
      `${ctx.method} ${ctx.url} - ${ctx.status} - ${ms}ms - Error:`,
      error,
    );
    ctx.status = (error as any).statusCode || 500;
    ctx.body = { error: (error as Error).message || "服务器错误" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const startServer = async () => {
  try {
    const dbClient = await pool.connect();
    console.log("Database connected successfully");
    dbClient.release();

    await initializeDatabase();

    await redis.ping();
    console.log("Redis connected successfully");

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
