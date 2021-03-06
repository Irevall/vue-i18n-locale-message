import { Arguments, Argv } from 'yargs'
import {
  resolve,
  parsePath,
  readSFC,
  loadNamespaceDictionary,
  getExternalLocaleMessages, stringifyContent
} from '../utils'
import squeeze from '../squeezer'
import fs from 'fs'
import deepmerge from 'deepmerge'

import {
  Locale,
  LocaleMessage,
  LocaleMessages,
  MetaLocaleMessage,
  NamespaceDictionary
} from '../../types'

import { debug as Debug } from 'debug'
const debug = Debug('vue-i18n-locale-message:commands:squeeze')

type SqueezeOptions = {
  target: string
  split: boolean
  bundleWith?: string
  bundleMatch?: string
  namespace?: string
  output: string,
  format: string,
  structurePrefix: boolean
}

export const command = 'squeeze'
export const aliases = 'sqz'
export const describe = 'squeeze locale messages from single-file components'

export const builder = (args: Argv): Argv<SqueezeOptions> => {
  const outputDefault = `${process.cwd()}/messages.json`
  return args
    .option('target', {
      type: 'string',
      alias: 't',
      describe: 'target path that single-file components is stored',
      demandOption: true
    })
    .option('split', {
      type: 'boolean',
      alias: 's',
      default: true,
      describe: 'split squeezed locale messages with locale'
    })
    .option('bundleWith', {
      type: 'string',
      alias: 'b',
      describe: 'target path of external locale messages that it will bundle together, can also be specified multi paths with comma delimiter'
    })
    .option('bundleMatch', {
      type: 'string',
      alias: 'm',
      describe: `option should be accepted regex filename of external locale messages, must be specified if it's directory path of external locale messages with --with-bundle`
    })
    .option('namespace', {
      type: 'string',
      alias: 'n',
      describe: 'file path that defines the namespace for external locale messages bundled together'
    })
    .option('output', {
      type: 'string',
      alias: 'o',
      default: outputDefault,
      describe: 'path to output squeezed locale messages'
    })
    .option('format', {
      type: 'string',
      alias: 'f',
      default: 'json',
      describe: 'format which will be used for input and output'
    })
    .option('structurePrefix', {
      type: 'boolean',
      alias: 'p',
      default: false,
      describe: 'export keys with prefix matching file structure'
    })
}

export const handler = async (args: Arguments<SqueezeOptions>) => {
  const targetPath = resolve(args.target)

  let nsDictionary = {} as NamespaceDictionary
  let externalMessages = {} as LocaleMessages
  try {
    if (args.namespace) {
      nsDictionary = await loadNamespaceDictionary(args.namespace)
    }
    externalMessages = getExternalLocaleMessages(nsDictionary, args.bundleWith, args.bundleMatch)
  } catch (e) {
    console.warn('cannot load external locale messages failed')
  }

  const meta = squeeze(targetPath, readSFC(targetPath), args.format)
  const messages = deepmerge(generate(meta, args.structurePrefix), externalMessages)

  writeLocaleMessages(messages, args)
}

function generate (meta: MetaLocaleMessage, structurePrefix: boolean): LocaleMessages {
  const { target, components } = meta
  let messages: LocaleMessages = {}

  const assignLocales = (locales: Locale[], messages: LocaleMessages): LocaleMessages => {
    return locales.reduce((messages, locale) => {
      !messages[locale] && Object.assign(messages, { [locale]: {}})
      return messages
    }, messages)
  }

  for (const component of Object.keys(components)) {
    const blocks = components[component]

    if (!blocks.length || !blocks[0].messages) continue

    debug(`generate component = ${component}`)
    const parsed = parsePath(target, component)
    messages = blocks.reduce((messages, block) => {
      debug(`generate current messages = ${JSON.stringify(messages)}`)
      const locales = Object.keys(block.messages)
      messages = assignLocales(locales, messages)
      locales.reduce((messages, locale) => {
        if (block.messages[locale]) {
          const localeMessages = messages[locale]
          const localeBlockMessages = block.messages[locale] as LocaleMessage[]
          let target: any = localeMessages // eslint-disable-line
          const hierarchy = structurePrefix ? parsed.hierarchy.concat() : []
          while (hierarchy.length >= 0) {
            const key = hierarchy.shift()
            if (!key) {
              break
            }
            if (!target[key]) {
              target[key] = {}
            }
            target = target[key]
          }

          Object.assign(target, deepmerge(target, localeBlockMessages))
          return messages
        }
        return messages
      }, messages)
      return messages
    }, messages)
  }

  return messages
}

function writeLocaleMessages (messages: LocaleMessages, args: Arguments<SqueezeOptions>) {
  // TODO: async implementation
  const split = args.split
  const output = resolve(args.output)
  if (!split) {
    fs.writeFileSync(output, stringifyContent(messages, args.format))
  } else {
    splitLocaleMessages(output, messages, args.format)
  }
}

function splitLocaleMessages (path: string, messages: LocaleMessages, format: string) {
  const locales: Locale[] = Object.keys(messages)
  const write = () => {
    locales.forEach(locale => {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true })
      }
      fs.writeFileSync(`${path}/${locale}.${format}`, stringifyContent(messages[locale], format))
    })
  }
  try {
    write()
  } catch (err) {
    console.error(err.message)
    throw err
  }
}

export default {
  command,
  aliases,
  describe,
  builder,
  handler
}
