"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.command = 'push';
exports.aliases = 'ph';
exports.describe = 'push locale messages to localization service';
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
        .option('target', {
        type: 'string',
        alias: 't',
        describe: 'target path that locale messages file is stored, default push with the filename of target path as locale'
    })
        .option('locale', {
        type: 'string',
        alias: 'l',
        describe: `option for the locale of locale messages file specified with --target, if it's specified single-file`
    })
        .option('targetPaths', {
        type: 'string',
        alias: 'T',
        describe: 'target directory paths that locale messages files is stored, Can also be specified multi paths with comma delimiter'
    })
        .option('filenameMatch', {
        type: 'string',
        alias: 'm',
        describe: `option should be accepted a regex filenames, must be specified together --targets if it's directory path of locale messages`
    })
        .option('normalize', {
        type: 'string',
        alias: 'n',
        describe: 'option for the locale messages structure, you can specify the option, if you hope to normalize for the provider.'
    })
        .option('dryRun', {
        type: 'boolean',
        alias: 'd',
        default: false,
        describe: `run the push command, but do not apply to locale messages of localization service`
    });
};
exports.handler = async (args) => {
    const { dryRun, normalize } = args;
    const ProviderFactory = utils_1.loadProvider(args.provider);
    if (ProviderFactory === null) {
        // TODO: should refactor console message
        console.log(`Not found ${args.provider} provider`);
        return;
    }
    if (!args.target && !args.targetPaths) {
        // TODO: should refactor console message
        console.log('You need to specify either --target or --target-paths');
        return;
    }
    const confPath = utils_1.resolveProviderConf(args.provider, args.conf);
    const conf = utils_1.loadProviderConf(confPath) || utils_1.DEFUALT_CONF;
    try {
        const messages = utils_1.getLocaleMessages(args);
        const provider = ProviderFactory(conf);
        await provider.push({ messages, dryRun, normalize });
        // TODO: should refactor console message
        console.log('push success');
    }
    catch (e) {
        // TODO: should refactor console message
        console.error('push fail:', e.message);
    }
};
exports.default = {
    command: exports.command,
    aliases: exports.aliases,
    describe: exports.describe,
    builder: exports.builder,
    handler: exports.handler
};
