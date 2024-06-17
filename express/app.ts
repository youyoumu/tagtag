import express, { Express, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const jwtSecret = process.env.JWT_SECRET || 'secret'
const prisma = new PrismaClient()
const app: Express = express()
const port = 3000

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!')
})

app.get('/users', async (req: Request, res: Response) => {
  const users = await prisma.user.findMany()
  res.send(users)
})

app.post('/users', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendStatus(400)
  }

  const { username, password } = req.body.user
    ? req.body.user
    : { username: '', password: '' }
  const { user, error } = await validateUserCreate(username, password)
  if (error.length === 0) {
    const user = await prisma.user.create({
      data: {
        username,
        password
      }
    })
    const id = user.id
    const token = jwt.sign({ id }, jwtSecret)
    return res.json({ user, token })
  } else {
    return res.status(400).json({ user, error })
  }
})

app.post('/users/sign_in', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendStatus(400)
  }

  const { username, password } = req.body.user
    ? req.body.user
    : { username: '', password: '' }
  const { user, error } = await validateUserSignIn(username, password)
  if (error.length === 0) {
    const id = user.id
    const token = jwt.sign({ id }, jwtSecret)
    return res.json({ user, token })
  } else {
    return res.status(401).json({ user, error })
  }
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})

async function validateUserCreate(username: string, password: string) {
  const error: string[] = []
  const user = {
    username,
    password
  }

  if (user.username === '') {
    error.push('Username is required')
  }
  if (user.password === '') {
    error.push('Password is required')
  }
  if (user.username.length < 3) {
    error.push('Username must be at least 3 characters')
  }
  if (user.password.length < 3) {
    error.push('Password must be at least 3 characters')
  }

  const userInDb = await prisma.user.findUnique({
    where: {
      username: user.username
    }
  })

  if (userInDb) {
    error.push('Username already exists')
  }

  return { user, error }
}

async function validateUserSignIn(username: string, password: string) {
  const error: string[] = []
  const user = {
    id: null,
    username,
    password
  }
  if (user.username === '') {
    error.push('Username is required')
  }
  if (user.password === '') {
    error.push('Password is required')
  }

  const userInDb = await prisma.user.findUnique({
    where: {
      username: user.username
    }
  })

  if (!userInDb) {
    error.push('Username not found')
  } else {
    if (userInDb.password !== user.password) {
      error.push('Wrong password')
    } else {
      return { user: userInDb, error }
    }
  }

  return { user, error }
}
