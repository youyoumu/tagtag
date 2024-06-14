import express from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany()
  res.send(users)
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
