"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const squeezer_1 = __importDefault(require("../squeezer"));
const fs_1 = __importDefault(require("fs"));
const deepmerge_1 = __importDefault(require("deepmerge"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const debug_1 = require("debug");
const debug = debug_1.debug('vue-i18n-locale-message:commands:squeeze');
exports.command = 'squeeze';
exports.aliases = 'sqz';
exports.describe = 'squeeze locale messages from single-file components';
exports.builder = (args) => {
    const outputDefault = `${process.cwd()}/messages.json`;
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
        default: false,
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
    });
};
exports.handler = async (args) => {
    const targetPath = utils_1.resolve(args.target);
    let nsDictionary = {};
    let externalMessages = {};
    try {
        if (args.namespace) {
            nsDictionary = await utils_1.loadNamespaceDictionary(args.namespace);
        }
        externalMessages = utils_1.getExternalLocaleMessages(nsDictionary, args.bundleWith, args.bundleMatch);
    }
    catch (e) {
        console.warn('cannot load external locale messages failed');
    }
    const meta = squeezer_1.default(targetPath, utils_1.readSFC(targetPath), args.format);
    const messages = deepmerge_1.default(generate(meta, args.structurePrefix), externalMessages);
    writeLocaleMessages(messages, args);
};
function generate(meta, structurePrefix) {
    const { target, components } = meta;
    let messages = {};
    const assignLocales = (locales, messages) => {
        return locales.reduce((messages, locale) => {
            !messages[locale] && Object.assign(messages, { [locale]: {} });
            return messages;
        }, messages);
    };
    for (const component of Object.keys(components)) {
        const blocks = components[component];
        if (!blocks.length || !blocks[0].messages)
            continue;
        if (structurePrefix || !structurePrefix) {
            debug(`generate component = ${component}`);
            const parsed = utils_1.parsePath(target, component);
            messages = blocks.reduce((messages, block) => {
                debug(`generate current messages = ${JSON.stringify(messages)}`);
                const locales = Object.keys(block.messages);
                messages = assignLocales(locales, messages);
                locales.reduce((messages, locale) => {
                    if (block.messages[locale]) {
                        const localeMessages = messages[locale];
                        const localeBlockMessages = block.messages[locale];
                        let target = localeMessages; // eslint-disable-line
                        const hierarchy = parsed.hierarchy.concat();
                        while (hierarchy.length >= 0) {
                            const key = hierarchy.shift();
                            if (!key) {
                                break;
                            }
                            if (!target[key]) {
                                target[key] = {};
                            }
                            target = target[key];
                        }
                        Object.assign(target, localeBlockMessages);
                        return messages;
                    }
                    return messages;
                }, messages);
                return messages;
            }, messages);
        }
        // else {
        //   const blockContent = blocks[0].messages
        //   const componentName = Object.keys(blockContent)[0]
        //   const componentMessages = blockContent[componentName]
        //
        //   if (!messages[componentName]) {
        //     messages[componentName] = componentMessages
        //   } else {
        //     const
        //     messages[componentName] = { ...messages[componentName], ...componentMessages }
        //   }
        // }
    }
    return messages;
}
function writeLocaleMessages(messages, args) {
    // TODO: async implementation
    const split = args.split;
    const output = utils_1.resolve(args.output);
    if (!split) {
        fs_1.default.writeFileSync(output, utils_1.stringifyContent(messages, args.format));
    }
    else {
        splitLocaleMessages(output, messages);
    }
}
function splitLocaleMessages(path, messages) {
    const locales = Object.keys(messages);
    const write = () => {
        locales.forEach(locale => {
            fs_1.default.writeFileSync(`${path}/${locale}.json`, js_yaml_1.default.safeDump(messages, { indent: 2 }));
        });
    };
    try {
        fs_1.default.mkdirSync(path);
        write();
    }
    catch (err) {
        if (err.code === 'EEXIST') {
            write();
        }
        else {
            console.error(err.message);
            throw err;
        }
    }
}
exports.default = {
    command: exports.command,
    aliases: exports.aliases,
    describe: exports.describe,
    builder: exports.builder,
    handler: exports.handler
};
