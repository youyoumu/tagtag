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
import { customAlphabet } from 'nanoid'
import { title } from 'process'

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

app.post('/users/connect', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendStatus(400)
  }
  const { token, connection_token, platform } = req.body

  if (!token || !connection_token || !platform) {
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

  const externalAccountAuth = await prisma.externalAccountAuth.findMany({
    where: {
      token: connection_token,
      platform: platform
    }
  })

  if (externalAccountAuth.length === 0) {
    return res.sendStatus(401)
  } else {
    const externalAccountAuthLast =
      externalAccountAuth[externalAccountAuth.length - 1]

    const fifteenMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isWithinLast15Minutes =
      externalAccountAuthLast.created_at > fifteenMinutesAgo
    if (!isWithinLast15Minutes) {
      return res.sendStatus(401)
    }

    const externalAccountId = externalAccountAuthLast.external_account_id
    const platform = externalAccountAuthLast.platform

    const user = await prisma.user.findUnique({
      where: {
        id: id
      },
      include: {
        ExternalAccount: true
      }
    })

    function isAlreadyConnected() {
      let result = false
      user?.ExternalAccount.forEach((externalAccount) => {
        if (
          externalAccount.external_account_id === externalAccountId &&
          externalAccount.platform === platform
        ) {
          result = true
        }
      })
      return result
    }

    if (isAlreadyConnected()) {
      return res.send('already connected')
    }

    const externalAccount = await prisma.externalAccount.create({
      data: {
        user_id: id,
        external_account_id: externalAccountId,
        platform: platform
      }
    })
    return res.send(externalAccount)
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

  const tags: string = content.tags || ''
  const tagsArray: string[] = tags.split(' ').filter((x) => x !== '')
  const newContent = await prisma.content.create({
    data: {
      title: content.title || '',
      body: content.body || '',
      tags: tagsArray,
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
  const userId = req.body.member?.user?.id
    ? req.body.member.user.id
    : req.body.user.id

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

  const tagtagUser = await prisma.user.findMany({
    where: {
      ExternalAccount: {
        some: {
          external_account_id: userId,
          platform: 'Discord'
        }
      }
    }
  })

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
      const tags: string = data.options[2].value
      const tagsArray: string[] = tags.split(' ').filter((x) => x !== '')
      const content = await prisma.content.create({
        data: {
          title: data.options[0].value,
          body: data.options[1].value,
          tags: tagsArray,
          external_account_id: userId,
          platform: 'Discord'
        }
      })
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: content.title,
              description: content.body,
              footer: {
                text: content.tags.join(', ')
              },
              fields: [
                {
                  name: 'created at',
                  value: content.created_at
                },
                {
                  name: 'platform',
                  value: content.platform + ' - ' + content.external_account_id
                }
              ]
            }
          ]
        }
      })
    }

    if (name === 'share') {
      const content = await prisma.content.findFirst({
        where: {
          OR: [
            {
              title: data.options[0].value,
              external_account_id: userId,
              platform: 'Discord'
            },
            {
              title: data.options[0].value,
              user_id: {
                in: tagtagUser.map((user) => user.id)
              }
            }
          ]
        }
      })
      if (content) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: content.body
          }
        })
      } else {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: 'content not found'
              }
            ],
            flags: InteractionResponseFlags.EPHEMERAL
          }
        })
      }
    }

    if (name === 'details') {
      const content = await prisma.content.findFirst({
        where: {
          OR: [
            {
              title: data.options[0].value,
              external_account_id: userId,
              platform: 'Discord'
            },
            {
              title: data.options[0].value,
              user_id: {
                in: tagtagUser.map((user) => user.id)
              }
            }
          ]
        }
      })
      if (content) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: content.title,
                description: content.body,
                footer: {
                  text: content.tags.join(', ')
                },
                fields: [
                  {
                    name: 'created at',
                    value: content.created_at
                  },
                  {
                    name: 'platform',
                    value:
                      content.platform + ' - ' + content.external_account_id
                  }
                ]
              }
            ]
          }
        })
      } else {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: 'content not found'
              }
            ],
            flags: InteractionResponseFlags.EPHEMERAL
          }
        })
      }
    }

    if (name === 'search') {
      const tags: string = data.options[0].value
      const tagsArray: string[] = tags.split(' ').filter((x) => x !== '')

      const contents = await prisma.content.findMany({
        where: {
          OR: [
            {
              tags: {
                hasEvery: tagsArray
              },
              external_account_id: userId,
              platform: 'Discord'
            },
            {
              tags: {
                hasEvery: tagsArray
              },
              user_id: {
                in: tagtagUser.map((user) => user.id)
              }
            }
          ]
        }
      })
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: JSON.stringify(contents)
        }
      })
    }

    if (name === 'connect') {
      const discord_user_id = userId
      // const token = jwt.sign({ discord_user_id }, jwtSecret)
      const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 8)
      const token = nanoid()

      await prisma.externalAccountAuth.create({
        data: {
          token: token,
          external_account_id: discord_user_id,
          platform: 'Discord'
        }
      })

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          content: 'an instruction has been sent to your DM'
        }
      })

      try {
        const response = await fetch(
          `https://discord.com/api/v10/users/@me/channels`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipient_id: discord_user_id })
          }
        )

        if (!response.ok) {
          console.error('Failed to create DM channel:', response.statusText)
          throw new Error('Failed to create DM channel')
        }

        const dmChannel = await response.json()

        await fetch(
          `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: `Your connection token is: ${token}`
            })
          }
        )
      } catch (error) {
        console.error('Error sending DM:', error)
      }

      return
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
