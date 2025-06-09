import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth'; 
import { betterAuth } from 'better-auth'

const app = new Hono()

app.get('/', (c) => {
  return c.text('nyanya')
})

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

export default app
