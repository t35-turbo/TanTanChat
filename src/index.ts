import { Hono } from 'hono'
import { betterAuth } from 'better-auth'  

const app = new Hono()

app.get('/', (c) => {
  return c.text('nyanya')
})
export default app
