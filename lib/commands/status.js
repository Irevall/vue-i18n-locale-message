"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.describe = exports.aliases = exports.command = void 0;
const status_1 = require("./fails/status");
const utils_1 = require("../utils");
const debug_1 = require("debug");
const debug = debug_1.debug('vue-i18n-locale-message:commands:status');
exports.command = 'status';
exports.aliases = 'st';
exports.describe = 'indicate translation status from localization service';
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
        .option('locales', {
        type: 'string',
        alias: 'l',
        default: '',
        describe: `option for some locales of translation status, you can also be specified multi locale with comma delimiter. if it's not specified indicate all locale translation status`
    })
        .fail(status_1.fail);
};
exports.handler = async (args) => {
    const { provider, conf, locales } = args;
    debug(`status args: provider=${provider}, conf=${conf}, locales=${locales}`);
    const status = await utils_1.getTranslationStatus({ provider, conf, locales });
    debug('raw status', status);
    console.table(status);
    const completes = status.filter(st => st.percentage < 100);
    return completes.length > 0
        ? Promise.reject(new status_1.TranslationStatusError('Translation work in progress'))
        : Promise.resolve('Translation done');
};
exports.default = {
    command: exports.command,
    aliases: exports.aliases,
    describe: exports.describe,
    builder: exports.builder,
    handler: exports.handler
};
