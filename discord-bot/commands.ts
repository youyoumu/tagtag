import { InstallGlobalCommands } from './utils.js'
import 'dotenv/config'

const TEST_COMMAND = {
  name: 'test',
  description: 'test command',
  type: 1
}

const ALL_COMMANDS = [TEST_COMMAND]

InstallGlobalCommands(process.env.APP_ID || '', ALL_COMMANDS)
