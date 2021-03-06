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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitLocaleMessages = exports.getExternalLocaleMessages = exports.loadNamespaceDictionary = exports.getTranslationStatus = exports.getRawLocaleMessages = exports.getLocaleMessages = exports.loadProviderConf = exports.loadProvider = exports.resolveProviderConf = exports.DEFUALT_CONF = exports.readSFC = exports.stringifyContent = exports.parseContent = exports.parsePath = exports.reflectSFCDescriptor = exports.isLocaleMessageDictionary = exports.resolve = exports.escape = void 0;
// import modules
const component_compiler_utils_1 = require("@vue/component-compiler-utils");
const compiler = __importStar(require("vue-template-compiler"));
const fs_1 = __importDefault(require("fs"));
const glob_1 = __importDefault(require("glob"));
const path_1 = __importDefault(require("path"));
const json5_1 = __importDefault(require("json5"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const deepmerge_1 = __importDefault(require("deepmerge"));
const util_1 = require("util");
const debug_1 = require("debug");
const debug = debug_1.debug('vue-i18n-locale-message:utils');
const readFile = util_1.promisify(fs_1.default.readFile);
const ESC = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '&': '&amp;'
};
function escapeChar(a) {
    return ESC[a] || a;
}
function escape(s) {
    return s.replace(/[<>"&]/g, escapeChar);
}
exports.escape = escape;
function resolve(...paths) {
    return path_1.default.resolve(...paths);
}
exports.resolve = resolve;
function isLocaleMessageDictionary(message) {
    return typeof message !== 'string' && !Array.isArray(message);
}
exports.isLocaleMessageDictionary = isLocaleMessageDictionary;
function reflectSFCDescriptor(basePath, components) {
    return components.map(target => {
        const { template, script, styles, customBlocks } = component_compiler_utils_1.parse({
            source: target.content,
            filename: target.path,
            compiler: compiler
        });
        return {
            ...parsePath(basePath, target.path),
            raw: target.content,
            customBlocks,
            template,
            script,
            styles
        };
    });
}
exports.reflectSFCDescriptor = reflectSFCDescriptor;
function parsePath(basePath, targetPath) {
    const { dir, name } = path_1.default.parse(targetPath);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, target] = dir.split(basePath);
    const parsedTargetPath = target.split(path_1.default.sep);
    parsedTargetPath.shift();
    debug(`parsePath: contentPath = ${targetPath}, component = ${name}, messageHierarchy = ${parsedTargetPath}`);
    return {
        contentPath: targetPath,
        component: name,
        hierarchy: [...parsedTargetPath, name]
    };
}
exports.parsePath = parsePath;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseContent(content, lang) {
    switch (lang) {
        case 'yaml':
        case 'yml':
            return js_yaml_1.default.safeLoad(content);
        case 'json5':
            return json5_1.default.parse(content);
        case 'json':
        default:
            return JSON.parse(content);
    }
}
exports.parseContent = parseContent;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stringifyContent(content, lang, options) {
    const indent = (options === null || options === void 0 ? void 0 : options.intend) || 2;
    const eof = (options === null || options === void 0 ? void 0 : options.eof) || '\n';
    let result = '';
    switch (lang) {
        case 'yaml':
        case 'yml':
            result = js_yaml_1.default.safeDump(content, { indent });
            break;
        case 'json5':
            result = json5_1.default.stringify(content, null, indent);
            break;
        case 'json':
        default:
            result = JSON.stringify(content, null, indent);
            break;
    }
    if (!result.endsWith(eof)) {
        result += eof;
    }
    return result;
}
exports.stringifyContent = stringifyContent;
function readSFC(target) {
    const targets = resolveGlob(target);
    debug('readSFC: targets = ', targets);
    // TODO: async implementation
    return targets.map(target => {
        const data = fs_1.default.readFileSync(target);
        return {
            path: target,
            content: data.toString()
        };
    });
}
exports.readSFC = readSFC;
function resolveGlob(target) {
    // TODO: async implementation
    return glob_1.default.sync(`${target}/**/*.vue`);
}
exports.DEFUALT_CONF = { provider: {} };
function resolveProviderConf(provider, conf) {
    if (conf) {
        return resolve(conf);
    }
    else {
        const parsed = path_1.default.parse(provider);
        return resolve(process.cwd(), `${parsed.base}-conf.json`);
    }
}
exports.resolveProviderConf = resolveProviderConf;
function loadProvider(provider) {
    let mod = null;
    try {
        // TODO: should validate I/F checking & dynamic importing
        const m = require(require.resolve(provider));
        debug('loaderProvider', m);
        if ('__esModule' in m) {
            mod = m.default;
        }
        else {
            mod = m;
        }
    }
    catch (e) { } // eslint-disable-line
    return mod;
}
exports.loadProvider = loadProvider;
function loadProviderConf(confPath) {
    let conf = exports.DEFUALT_CONF;
    try {
        // TODO: should validate I/F checking & dynamic importing
        conf = require(confPath);
    }
    catch (e) { } // eslint-disable-line
    return conf;
}
exports.loadProviderConf = loadProviderConf;
function getLocaleMessages(args) {
    let messages = {};
    if (args.target) {
        const targetPath = resolve(args.target);
        const parsed = path_1.default.parse(targetPath);
        const locale = args.locale ? args.locale : parsed.name;
        messages = Object.assign(messages, { [locale]: require(targetPath) });
    }
    else if (args.targetPaths) {
        const filenameMatch = args.filenameMatch;
        if (!filenameMatch) {
            // TODO: should refactor console message
            throw new Error('You need to specify together --filename-match');
        }
        const targetPaths = args.targetPaths.split(',').filter(p => p);
        targetPaths.forEach(targetPath => {
            const globedPaths = glob_1.default.sync(targetPath).map(p => resolve(p));
            globedPaths.forEach(fullPath => {
                const parsed = path_1.default.parse(fullPath);
                const re = new RegExp(filenameMatch, 'ig');
                const match = re.exec(parsed.base);
                debug('regex match', match, fullPath);
                if (match && match[1]) {
                    const locale = match[1];
                    messages = Object.assign(messages, { [locale]: require(fullPath) });
                }
                else {
                    // TODO: should refactor console message
                    console.log(`${fullPath} is not matched with ${filenameMatch}`);
                }
            });
        });
    }
    return messages;
}
exports.getLocaleMessages = getLocaleMessages;
function getRawLocaleMessages(args) {
    const messages = [];
    if (args.target) {
        const targetPath = resolve(args.target);
        const parsed = path_1.default.parse(targetPath);
        const targetFormat = parsed.ext.split('.').pop();
        const format = targetFormat || args.format;
        if (!format) {
            // TODO: should refactor console message
            console.log(`ignore ${targetPath}, due to be not specified with --format`);
        }
        else {
            messages.push({
                locale: args.locale ? args.locale : parsed.name,
                format,
                data: fs_1.default.readFileSync(targetPath)
            });
        }
    }
    else if (args.targetPaths) {
        const filenameMatch = args.filenameMatch;
        if (!filenameMatch) {
            // TODO: should refactor console message
            throw new Error('You need to specify together --filename-match');
        }
        const targetPaths = args.targetPaths.split(',').filter(p => p);
        targetPaths.forEach(targetPath => {
            const globedPaths = glob_1.default.sync(targetPath).map(p => resolve(p));
            globedPaths.forEach(fullPath => {
                const parsed = path_1.default.parse(fullPath);
                const re = new RegExp(filenameMatch, 'ig');
                const match = re.exec(parsed.base);
                debug('regex match', match, fullPath);
                if (match && match[1]) {
                    const targetFormat = parsed.ext.split('.').pop();
                    const format = targetFormat || args.format;
                    if (!format) {
                        // TODO: should refactor console message
                        console.log(`ignore ${fullPath}, due to be not specified with --format`);
                    }
                    else {
                        messages.push({
                            locale: match[1],
                            format,
                            data: fs_1.default.readFileSync(fullPath)
                        });
                    }
                }
                else {
                    // TODO: should refactor console message
                    console.log(`${fullPath} is not matched with ${filenameMatch}`);
                }
            });
        });
    }
    return messages;
}
exports.getRawLocaleMessages = getRawLocaleMessages;
async function getTranslationStatus(options) {
    var _a;
    const ProviderFactory = loadProvider(options.provider);
    if (ProviderFactory === null) {
        return Promise.reject(new Error(`Not found ${options.provider} provider`));
    }
    const confPath = resolveProviderConf(options.provider, options.conf);
    const conf = loadProviderConf(confPath) || exports.DEFUALT_CONF;
    const locales = ((_a = options.locales) === null || _a === void 0 ? void 0 : _a.split(',').filter(p => p)) || [];
    const provider = ProviderFactory(conf);
    const status = await provider.status({ locales });
    return Promise.resolve(status);
}
exports.getTranslationStatus = getTranslationStatus;
async function loadNamespaceDictionary(path) {
    const raw = await readFile(resolve(path));
    return new Promise((resolv, reject) => {
        try {
            // TODO: should be checked more strongly
            resolv(JSON.parse(raw.toString()));
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.loadNamespaceDictionary = loadNamespaceDictionary;
function getLocaleMessagePathInfo(fullPath, bundleMatch) {
    const parsed = path_1.default.parse(fullPath);
    debug('getLocaleMessagePathInfo: parsed', parsed);
    if (bundleMatch) {
        const re = new RegExp(bundleMatch, 'ig');
        const match = re.exec(fullPath);
        debug('getLocaleMessagePathInfo: regex match', match);
        return {
            locale: (match && match[1]) ? match[1] : '',
            filename: (match && match[2]) ? match[2] : ''
        };
    }
    else {
        return {
            locale: parsed.ext.split('.').pop() || ''
        };
    }
}
function getExternalLocaleMessages(dictionary, bundleWith, bundleMatch) {
    if (!bundleWith) {
        return {};
    }
    const bundleTargetPaths = bundleWith.split(',').filter(p => p);
    return bundleTargetPaths.reduce((messages, targetPath) => {
        const namespace = dictionary[targetPath] || '';
        const globedPaths = glob_1.default.sync(targetPath).map(p => resolve(p));
        return globedPaths.reduce((messages, fullPath) => {
            const { locale, filename } = getLocaleMessagePathInfo(fullPath, bundleMatch);
            if (!locale) {
                return messages;
            }
            const externalMessages = JSON.parse(fs_1.default.readFileSync(fullPath).toString());
            let workMessages = externalMessages;
            if (filename) {
                workMessages = Object.assign({}, { [filename]: workMessages });
            }
            if (namespace) {
                workMessages = Object.assign({}, { [namespace]: workMessages });
            }
            debug('getExternalLocaleMessages: workMessages', workMessages);
            if (messages[locale]) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                messages[locale] = deepmerge_1.default(messages[locale], workMessages);
            }
            else {
                messages = Object.assign(messages, { [locale]: workMessages });
            }
            debug('getExternalLocaleMessages: messages (processing)', messages);
            return messages;
        }, messages);
    }, {});
}
exports.getExternalLocaleMessages = getExternalLocaleMessages;
// TODO: should be selected more other library ...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}
function splitLocaleMessages(messages, dictionary, bundle, bundleMatch) {
    if (!bundle) {
        return { sfc: messages };
    }
    const bundleTargetPaths = bundle.split(',').filter(p => p);
    const externalLocaleMessagesParseInfo = bundleTargetPaths.reduce((info, targetPath) => {
        const namespace = dictionary[targetPath] || '';
        const globedPaths = glob_1.default.sync(targetPath).map(p => resolve(p));
        debug('splitLocaleMessages globedPaths', globedPaths);
        return globedPaths.reduce((info, fullPath) => {
            const { locale, filename } = getLocaleMessagePathInfo(fullPath, bundleMatch);
            if (!locale) {
                return info;
            }
            info.push({ path: fullPath, locale, namespace, filename });
            return info;
        }, info);
    }, []);
    debug('splitLocaleMessages: externalLocaleMessagesParseInfo:', externalLocaleMessagesParseInfo);
    debug('splitLocaleMessages: messages (before):', messages);
    const metaExternalLocaleMessages = externalLocaleMessagesParseInfo.reduce((meta, { path, locale, namespace, filename }) => {
        let targetLocaleMessage = messages[locale];
        if (namespace && isLocaleMessageDictionary(targetLocaleMessage)) {
            targetLocaleMessage = targetLocaleMessage[namespace];
        }
        if (filename && isLocaleMessageDictionary(targetLocaleMessage)) {
            targetLocaleMessage = targetLocaleMessage[filename];
        }
        meta.push({ path, messages: deepCopy(targetLocaleMessage) });
        return meta;
    }, []);
    debug('splitLocaleMessages: messages (after):', messages);
    debug('splitLocaleMessages: metaExternalLocaleMessages:', metaExternalLocaleMessages);
    return { sfc: messages, external: metaExternalLocaleMessages };
}
exports.splitLocaleMessages = splitLocaleMessages;
