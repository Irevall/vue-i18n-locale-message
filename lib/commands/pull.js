"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.describe = exports.aliases = exports.command = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const debug_1 = require("debug");
const debug = debug_1.debug('vue-i18n-locale-message:commands:pull');
const mkdirPromisify = util_1.promisify(fs.mkdir);
const writeFilePromisify = util_1.promisify(fs.writeFile);
const utils_1 = require("../utils");
exports.command = 'pull';
exports.aliases = 'pl';
exports.describe = 'pull locale messages from localization service';
exports.builder = (args) => {
    return args
        .option('provider', {
        type: 'string',
        alias: 'p',
        describe: 'the target localization service provider',
        demandOption: true
    })
        .option('conf', {
        type: 'string',
        alias: 'c',
        describe: 'the json file configration of localization service provider. If omitted, use the suffix file name with `-conf` for provider name of --provider (e.g. <provider>-conf.json).'
    })
        .option('output', {
        type: 'string',
        alias: 'o',
        describe: 'the path to output that pulled locale messages',
        demandOption: true
    })
        .option('locales', {
        type: 'string',
        alias: 'l',
        default: '',
        describe: `option for some locales of locale messages, you can also be specified multi locale with comma delimiter. if it's not specified pull all locale messages`
    })
        .option('normalize', {
        type: 'string',
        alias: 'n',
        describe: 'option for the locale messages structure, you can specify the option, if you hope to normalize for the provider.'
    })
        .option('format', {
        type: 'string',
        alias: 'f',
        default: 'json',
        describe: 'option for the locale messages format, default `json`'
    })
        .option('dryRun', {
        type: 'boolean',
        alias: 'd',
        default: false,
        describe: 'run the pull command, but do not pull to locale messages of localization service'
    });
};
exports.handler = async (args) => {
    var _a;
    const { dryRun, normalize, format } = args;
    const ProviderFactory = utils_1.loadProvider(args.provider);
    if (ProviderFactory === null) {
        // TODO: should refactor console message
        console.log(`Not found ${args.provider} provider`);
        return;
    }
    if (!args.output) {
        // TODO: should refactor console message
        console.log('You need to specify --output');
        return;
    }
    const confPath = utils_1.resolveProviderConf(args.provider, args.conf);
    const conf = utils_1.loadProviderConf(confPath) || utils_1.DEFUALT_CONF;
    try {
        const locales = ((_a = args.locales) === null || _a === void 0 ? void 0 : _a.split(',').filter(p => p)) || [];
        const provider = ProviderFactory(conf);
        const messages = await provider.pull({ locales, dryRun, normalize, format });
        await applyPullLocaleMessages(args.output, messages, args.dryRun);
        // TODO: should refactor console message
        console.log('pull success');
    }
    catch (e) {
        console.error('pull fail', e);
        return;
    }
};
async function applyPullLocaleMessages(output, messages, dryRun) {
    const locales = Object.keys(messages);
    debug('applyPullLocaleMessages', messages, locales, dryRun);
    // wrap mkdir with dryRun
    const mkdir = async (output) => {
        return !dryRun
            ? mkdirPromisify(path.resolve(output), { recursive: true })
            : Promise.resolve();
    };
    // wrap writeFile with dryRun
    const writeFile = async (output, locale, message) => {
        const localePath = path.resolve(output, `${locale}.json`);
        console.log(`write '${locale}' messages to ${localePath}`);
        return !dryRun
            ? writeFilePromisify(localePath, JSON.stringify(message, null, 2))
            : Promise.resolve();
    };
    // run!
    await mkdir(output);
    for (const locale of locales) {
        await writeFile(output, locale, messages[locale]);
    }
}
exports.default = {
    command: exports.command,
    aliases: exports.aliases,
    describe: exports.describe,
    builder: exports.builder,
    handler: exports.handler
};
