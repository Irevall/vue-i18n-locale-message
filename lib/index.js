"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const squeezer_1 = __importDefault(require("./squeezer"));
exports.squeeze = squeezer_1.default;
const infuser_1 = __importDefault(require("./infuser"));
exports.infuse = infuser_1.default;
const utils_1 = require("./utils");
exports.status = utils_1.getTranslationStatus;