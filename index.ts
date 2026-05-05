import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import gameRoutes from './src/routes/games'

const app = new Hono()

app.use(logger())
app.use('/*', cors())

app.route('/', gameRoutes)

export default app
