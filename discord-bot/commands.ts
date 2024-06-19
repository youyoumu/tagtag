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

const ALL_COMMANDS = [TEST_COMMAND, SAVE_CONTENT_COMMAND]

InstallGlobalCommands(process.env.APP_ID || '', ALL_COMMANDS)