import express, { Express, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app: Express = express()
const port = 3000

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!')
})

app.get('/users', async (res: Response, req: Request) => {
  const users = await prisma.user.findMany()
  res.send(users)
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
