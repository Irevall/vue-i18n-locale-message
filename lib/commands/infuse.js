"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.describe = exports.aliases = exports.command = void 0;
const utils_1 = require("../utils");
const infuser_1 = __importDefault(require("../infuser"));
const squeezer_1 = __importDefault(require("../squeezer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const deep_diff_1 = require("deep-diff");
const glob_1 = __importDefault(require("glob"));
const debug_1 = require("debug");
const debug = debug_1.debug('vue-i18n-locale-message:commands:infuse');
exports.command = 'infuse';
exports.aliases = 'inf';
exports.describe = 'infuse locale messages to single-file components';
exports.builder = (args) => {
    return args
        .option('target', {
        type: 'string',
        alias: 't',
        describe: 'target path that single-file components is stored',
        demandOption: true
    })
        .option('locales', {
        type: 'string',
        alias: 'l',
        describe: 'locale messages path to be infused',
        demandOption: true
    })
        .option('match', {
        type: 'string',
        alias: 'm',
        describe: 'option should be accepted a regex filenames, must be specified together --messages'
    })
        .option('unbundleTo', {
        type: 'string',
        alias: 'u',
        describe: `target path of external locale messages bundled with 'squeeze' command, can also be specified multi paths with comma delimiter`
    })
        .option('unbundleMatch', {
        type: 'string',
        alias: 'M',
        describe: `option should be accepted regex filename of external locale messages, must be specified if it's directory path of external locale messages with --unbundle-to`
    })
        .option('namespace', {
        type: 'string',
        alias: 'n',
        describe: 'file path that defines the namespace for external locale messages bundled together'
    })
        .option('dryRun', {
        type: 'boolean',
        alias: 'd',
        default: false,
        describe: 'run the infuse command, but do not apply them'
    });
};
exports.handler = async (args) => {
    const targetPath = utils_1.resolve(args.target);
    const messagesPath = utils_1.resolve(args.locales);
    let nsDictionary = {};
    try {
        if (args.namespace) {
            nsDictionary = await utils_1.loadNamespaceDictionary(args.namespace);
        }
    }
    catch (e) {
        console.warn('cannot load namespace dictionary');
    }
    debug('namespace dictionary:', nsDictionary);
    const sources = utils_1.readSFC(targetPath);
    const messages = readLocaleMessages(messagesPath, args.match);
    const { sfc, external } = utils_1.splitLocaleMessages(messages, nsDictionary, args.unbundleTo, args.unbundleMatch);
    debug('sfc', sfc);
    debug('external', external);
    const meta = squeezer_1.default(targetPath, sources);
    apply(sfc, meta);
    const newSources = infuser_1.default(targetPath, sources, meta);
    if (!args.dryRun) {
        writeSFC(newSources);
    }
    if (!args.dryRun && external) {
        writeExternalLocaleMessages(external);
    }
};
function readLocaleMessages(targetPath, matchRegex) {
    debug('readLocaleMessages', targetPath, matchRegex);
    if (!matchRegex) {
        const data = fs_1.default.readFileSync(targetPath, { encoding: 'utf8' });
        return JSON.parse(data);
    }
    else {
        const globPath = path_1.default.normalize(`${targetPath}/*.json`);
        const paths = glob_1.default.sync(globPath);
        return paths.reduce((messages, p) => {
            const re = new RegExp(matchRegex, 'ig');
            const filename = path_1.default.basename(p);
            const match = re.exec(filename);
            debug('regex match', match);
            if (match) {
                const data = fs_1.default.readFileSync(p, { encoding: 'utf8' });
                Object.assign(messages, { [match[1]]: JSON.parse(data) });
            }
            return messages;
        }, {});
    }
}
function removeItem(item, items) {
    const index = items.indexOf(item);
    if (index === -1) {
        return false;
    }
    items.splice(index, 1);
    return true;
}
function apply(messages, meta) {
    const { target, components } = meta;
    for (const [component, blocks] of Object.entries(components)) {
        debug(`apply component = ${component}, blocks = ${JSON.stringify(blocks)}`);
        const { hierarchy } = utils_1.parsePath(target, component);
        const collectMessages = getTargetLocaleMessages(messages, hierarchy);
        debug('collect messages', JSON.stringify(collectMessages, null, 2));
        const sourceLocales = Object.keys(collectMessages);
        const targetLocales = blocks.reduce((locales, block) => {
            if (block.locale) {
                locales.push(block.locale);
            }
            else {
                locales = Object.keys(block.messages).reduce((locales, locale) => {
                    locales.push(locale);
                    return locales;
                }, locales);
            }
            return locales;
        }, []);
        debug(`locales: source = ${sourceLocales}, target = ${targetLocales}`);
        blocks.forEach(block => {
            const { locale } = block;
            if (locale) {
                deep_diff_1.applyDiff(block.messages[locale], collectMessages[locale]);
                removeItem(locale, sourceLocales);
                removeItem(locale, targetLocales);
            }
            else {
                const locales = Object.keys(block.messages);
                locales.forEach(locale => {
                    deep_diff_1.applyDiff(block.messages[locale], collectMessages[locale]);
                    removeItem(locale, sourceLocales);
                    removeItem(locale, targetLocales);
                });
            }
        });
        debug(`locales remain: source = ${sourceLocales}, target = ${targetLocales}`);
        if (sourceLocales.length) {
            sourceLocales.forEach(locale => {
                blocks.push({
                    lang: 'json',
                    locale,
                    messages: Object.assign({}, { [locale]: collectMessages[locale] })
                });
            });
        }
        if (targetLocales.length) {
            debug('invalid target remain locales ...', targetLocales.length);
        }
    }
    return meta;
}
function getTargetLocaleMessages(messages, hierarchy) {
    return Object.keys(messages).reduce((target, locale) => {
        debug(`processing curernt: locale=${locale}, target=${JSON.stringify(target)}`);
        const obj = messages[locale];
        if (obj) {
            let o = obj; // eslint-disable-line
            let prev = null; // eslint-disable-line
            const h = hierarchy.concat();
            while (h.length > 0) {
                const key = h.shift();
                debug('processing hierarchy key: ', key);
                if (!key || !o) {
                    break;
                }
                o = o[key];
                prev = o;
                debug(`processing o = ${JSON.stringify(o)}, prev = ${JSON.stringify(prev)}`);
            }
            if (!o && !prev) {
                return target;
            }
            else {
                return Object.assign(target, { [locale]: ((!o && prev) ? prev : o) });
            }
        }
        else {
            return target;
        }
    }, {});
}
function writeSFC(sources) {
    // TODO: async implementation
    sources.forEach(({ path, content }) => {
        fs_1.default.writeFileSync(path, content);
    });
}
function writeExternalLocaleMessages(meta) {
    // TODO: async implementation
    meta.forEach(({ path, messages }) => {
        fs_1.default.writeFileSync(path, JSON.stringify(messages, null, 2));
    });
}
exports.default = {
    command: exports.command,
    aliases: exports.aliases,
    describe: exports.describe,
    builder: exports.builder,
    handler: exports.handler
};
