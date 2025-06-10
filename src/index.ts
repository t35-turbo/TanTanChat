import { Hono } from "hono";
import { auth } from "./lib/auth";

const app = new Hono();
const PORT = process.env.PORT || 3001;

app.get("/", (c) => {
  return c.text("nyanya");
});

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));
app.get("/api/heartbeat", (c) => c.text("OK"));

export default {
  port: PORT,
  fetch: app.fetch,
};
