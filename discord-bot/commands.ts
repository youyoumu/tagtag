import { InstallGlobalCommands } from './utils.js'
import 'dotenv/config'

const TEST_COMMAND = {
  name: 'test',
  description: 'test command',
  type: 1
}

const SAVE_CONTENT_COMMAND = {
  name: 'save',
  type: 1,
  description: 'save content with tags',
  options: [
    {
      name: 'title',
      description: 'title of the content',
      type: 3,
      required: true
    },
    {
      name: 'body',
      description: 'the content',
      type: 3,
      required: true
    },
    {
      name: 'tags',
      description: 'space seperated tags',
      type: 3,
      required: true
    }
  ]
}

const SHARE_CONTENT_COMMAND = {
  name: 'share',
  type: 1,
  description: 'share content with title',
  options: [
    {
      name: 'title',
      description: 'title of the content',
      type: 3,
      required: true
    }
  ]
}

const SEARCH_CONTENT_COMMAND = {
  name: 'search',
  type: 1,
  description: 'search content with tags',
  options: [
    {
      name: 'tags',
      description: 'space seperated tags or title',
      type: 3,
      required: true
    }
  ]
}

const CONNECT_COMMAND = {
  name: 'connect',
  description: 'connect your discord account to tagtag',
  type: 1
}

const DETAILS_CONTENT_COMMAND = {
  name: 'details',
  type: 1,
  description: 'see content details with title',
  options: [
    {
      name: 'title',
      description: 'title of the content',
      type: 3,
      required: true
    }
  ]
}

const ALL_COMMANDS = [
  TEST_COMMAND,
  SAVE_CONTENT_COMMAND,
  SHARE_CONTENT_COMMAND,
  SEARCH_CONTENT_COMMAND,
  CONNECT_COMMAND,
  DETAILS_CONTENT_COMMAND
]

InstallGlobalCommands(process.env.APP_ID || '', ALL_COMMANDS)
