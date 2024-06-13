import config from 'eslint-config-standard'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [...[].concat(config), eslintConfigPrettier]
