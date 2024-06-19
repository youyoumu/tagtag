import express, { Express, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKey
} from 'discord-interactions'
import { json } from 'body-parser'

const jwtSecret = process.env.JWT_SECRET || 'secret'
const prisma = new PrismaClient()
const app: Express = express()
const port = process.env.PORT || 3000

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

app.post('/contents', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendStatus(400)
  }
  const { token, content } = req.body

  if (!token) {
    return res.sendStatus(401)
  }

  if (!content) {
    return res.sendStatus(422)
  }

  let id: number
  try {
    const decoded = jwt.verify(token, jwtSecret) as { id: number }
    id = decoded.id
    if (!id) {
      return res.sendStatus(401)
    }
  } catch (error) {
    return res.sendStatus(401)
  }

  const newContent = await prisma.content.create({
    data: {
      title: content.title || '',
      body: content.body || '',
      tags: content.tags || '',
      user_id: id
    }
  })
  res.send(newContent)
})

app.get('/contents', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendStatus(400)
  }
  const { token } = req.body
  if (!token) {
    return res.sendStatus(401)
  }
  let id: number
  try {
    const decoded = jwt.verify(token, jwtSecret) as { id: number }
    id = decoded.id
    if (!id) {
      return res.sendStatus(401)
    }
  } catch (error) {
    return res.sendStatus(401)
  }
  const contents = await prisma.content.findMany({
    where: {
      user_id: id
    }
  })
  res.send(contents)
})

app.post('/interactions', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendStatus(400)
  }

  const signature = req.get('X-Signature-Ed25519') as string
  const timestamp = req.get('X-Signature-Timestamp') as string
  const clientKey = process.env.PUBLIC_KEY || ''
  const buf = Buffer.from(JSON.stringify(req.body))
  const isValidRequest = await verifyKey(buf, signature, timestamp, clientKey)

  if (!isValidRequest) {
    return res.status(401).send('Bad request signature')
  }

  const { type, id, data } = req.body

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG })
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data

    if (name === 'test') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'test success'
        }
      })
    }

    if (name === 'save') {
      const content = await prisma.content.create({
        data: {
          title: data.options[0].value,
          body: data.options[1].value,
          tags: data.options[2].value,
          discord_user_id: req.body.member.user.id
        }
      })
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: JSON.stringify(content)
        }
      })
    }

    if (name === 'share') {
      const content = await prisma.content.findFirst({
        where: {
          title: data.options[0].value,
          discord_user_id: req.body.member.user.id
        }
      })
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: JSON.stringify(content)
        }
      })
    }
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
