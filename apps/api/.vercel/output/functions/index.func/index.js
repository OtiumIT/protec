"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/.pnpm/dotenv@17.2.3/node_modules/dotenv/package.json
var require_package = __commonJS({
  "../../node_modules/.pnpm/dotenv@17.2.3/node_modules/dotenv/package.json"(exports2, module2) {
    module2.exports = {
      name: "dotenv",
      version: "17.2.3",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        pretest: "npm run lint && npm run dts-check",
        test: "tap run tests/**/*.js --allow-empty-coverage --disable-coverage --timeout=60000",
        "test:coverage": "tap run tests/**/*.js --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      homepage: "https://github.com/motdotla/dotenv#readme",
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@types/node": "^18.11.3",
        decache: "^4.6.2",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-version": "^9.5.0",
        tap: "^19.2.0",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: false
      }
    };
  }
});

// ../../node_modules/.pnpm/dotenv@17.2.3/node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "../../node_modules/.pnpm/dotenv@17.2.3/node_modules/dotenv/lib/main.js"(exports2, module2) {
    var fs = require("fs");
    var path2 = require("path");
    var os = require("os");
    var crypto3 = require("crypto");
    var packageJson = require_package();
    var version = packageJson.version;
    var TIPS = [
      "\u{1F510} encrypt with Dotenvx: https://dotenvx.com",
      "\u{1F510} prevent committing .env to code: https://dotenvx.com/precommit",
      "\u{1F510} prevent building .env in docker: https://dotenvx.com/prebuild",
      "\u{1F4E1} add observability to secrets: https://dotenvx.com/ops",
      "\u{1F465} sync secrets across teammates & machines: https://dotenvx.com/ops",
      "\u{1F5C2}\uFE0F backup and recover secrets: https://dotenvx.com/ops",
      "\u2705 audit secrets and track compliance: https://dotenvx.com/ops",
      "\u{1F504} add secrets lifecycle management: https://dotenvx.com/ops",
      "\u{1F511} add access controls to secrets: https://dotenvx.com/ops",
      "\u{1F6E0}\uFE0F  run anywhere with `dotenvx run -- yourcommand`",
      "\u2699\uFE0F  specify custom .env file path with { path: '/custom/path/.env' }",
      "\u2699\uFE0F  enable debug logging with { debug: true }",
      "\u2699\uFE0F  override existing env vars with { override: true }",
      "\u2699\uFE0F  suppress all logs with { quiet: true }",
      "\u2699\uFE0F  write to custom object with { processEnv: myObject }",
      "\u2699\uFE0F  load multiple .env files with { path: ['.env.local', '.env'] }"
    ];
    function _getRandomTip() {
      return TIPS[Math.floor(Math.random() * TIPS.length)];
    }
    function parseBoolean(value) {
      if (typeof value === "string") {
        return !["false", "0", "no", "off", ""].includes(value.toLowerCase());
      }
      return Boolean(value);
    }
    function supportsAnsi() {
      return process.stdout.isTTY;
    }
    function dim(text) {
      return supportsAnsi() ? `\x1B[2m${text}\x1B[0m` : text;
    }
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse2(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match2;
      while ((match2 = LINE.exec(lines)) != null) {
        const key = match2[1];
        let value = match2[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      options = options || {};
      const vaultPath = _vaultPath(options);
      options.path = vaultPath;
      const result = DotenvModule.configDotenv(options);
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.error(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _log(message) {
      console.log(`[dotenv@${version}] ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path2.resolve(process.cwd(), ".env.vault");
      }
      if (fs.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path2.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || options && options.debug);
      const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (debug || !quiet) {
        _log("Loading env from encrypted .env.vault");
      }
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path2.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || options && options.debug);
      let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("No encoding is specified. UTF-8 is used by default");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path3 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs.readFileSync(path3, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${path3} ${e.message}`);
          }
          lastError = e;
        }
      }
      const populated = DotenvModule.populate(processEnv, parsedAll, options);
      debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug);
      quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet);
      if (debug || !quiet) {
        const keysCount = Object.keys(populated).length;
        const shortPaths = [];
        for (const filePath of optionPaths) {
          try {
            const relative = path2.relative(process.cwd(), filePath);
            shortPaths.push(relative);
          } catch (e) {
            if (debug) {
              _debug(`Failed to load ${filePath} ${e.message}`);
            }
            lastError = e;
          }
        }
        _log(`injecting env (${keysCount}) from ${shortPaths.join(",")} ${dim(`-- tip: ${_getRandomTip()}`)}`);
      }
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config3(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto3.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      const populated = {};
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
            populated[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
          populated[key] = parsed[key];
        }
      }
      return populated;
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config: config3,
      decrypt,
      parse: parse2,
      populate
    };
    module2.exports.configDotenv = DotenvModule.configDotenv;
    module2.exports._configVault = DotenvModule._configVault;
    module2.exports._parseVault = DotenvModule._parseVault;
    module2.exports.config = DotenvModule.config;
    module2.exports.decrypt = DotenvModule.decrypt;
    module2.exports.parse = DotenvModule.parse;
    module2.exports.populate = DotenvModule.populate;
    module2.exports = DotenvModule;
  }
});

// api/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/dns-ipv4.ts
var import_node_dns = __toESM(require("node:dns"));
import_node_dns.default.setDefaultResultOrder("ipv4first");

// api/index.ts
var import_path3 = __toESM(require("path"));
var import_dotenv2 = __toESM(require_main());

// ../../node_modules/.pnpm/@hono+node-server@1.19.9_hono@4.11.5/node_modules/@hono/node-server/dist/vercel.mjs
var import_http2 = require("http2");
var import_http22 = require("http2");
var import_stream = require("stream");
var import_crypto = __toESM(require("crypto"), 1);
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request2 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      ;
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request2(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= import_stream.Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = import_stream.Readable.toWeb(incoming);
    }
  }
  return new Request2(url, init);
};
var getRequestCache = Symbol("getRequestCache");
var requestCache = Symbol("requestCache");
var incomingKey = Symbol("incomingKey");
var urlKey = Symbol("urlKey");
var headersKey = Symbol("headersKey");
var abortControllerKey = Symbol("abortControllerKey");
var getAbortController = Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.setPrototypeOf(requestPrototype, Request2.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof import_http22.Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      const url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof import_http22.Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof import_http22.Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  const url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url.href;
  return req;
};
var responseCache = Symbol("responseCache");
var getResponseCache = Symbol("getResponseCache");
var cacheKey = Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      headers ||= init?.headers || { "content-type": "text/plain; charset=UTF-8" };
      this[cacheKey] = [init?.status || 200, body, headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(cache[2]);
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
if (typeof global.crypto === "undefined") {
  global.crypto = import_crypto.default;
}
var outgoingEnded = Symbol("outgoingEnded");
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  if (header instanceof Headers) {
    header = buildOutgoingHttpHeaders(header);
  }
  if (typeof body === "string") {
    header["Content-Length"] = Buffer.byteLength(body);
  } else if (body instanceof Uint8Array) {
    header["Content-Length"] = body.byteLength;
  } else if (body instanceof Blob) {
    header["Content-Length"] = body.size;
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  ;
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve2) => setTimeout(resolve2));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      ;
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  ;
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request2) {
    Object.defineProperty(global, "Request", {
      value: Request2
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof import_http2.Http2ServerRequest) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    incoming.destroy();
                    outgoing.destroy();
                  });
                }
              });
            }
          };
        }
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                incoming.destroy();
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var handle = (app2) => {
  return getRequestListener(app2.fetch);
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  /**
   * Returns the response object associated with the exception.
   * If a response object is not provided, a new response is created with the error message and status code.
   * @returns The response object.
   */
  getResponse() {
    if (this.res) {
      const newResponse = new Response(this.res.body, {
        status: this.status,
        headers: this.res.headers
      });
      return newResponse;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/utils/url.js
var splitPath = (path2) => {
  const paths = path2.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path: path2 } = extractGroupsFromPath(routePath);
  const paths = splitPath(path2);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path2) => {
  const groups = [];
  path2 = path2.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path: path2 };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match2[2]) {
        patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey2, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey2] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path2 = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path2.includes("%25") ? path2.replace(/%25/g, "%2525") : path2);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path2) => {
  if (path2.charCodeAt(path2.length - 1) !== 63 || !path2.includes(":")) {
    return null;
  }
  const segments = path2.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path2 = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path2;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  };
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path2, ...handlers) => {
      for (const p of [path2].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path2, app2) {
    const subApp = this.basePath(path2);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path2) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path2);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path2, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path2);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path2, "*"), handler);
    return this;
  }
  #addRoute(method, path2, handler) {
    method = method.toUpperCase();
    path2 = mergePath(this._basePath, path2);
    const r = { basePath: this._basePath, path: path2, method, handler };
    this.router.add(method, path2, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path2 = this.getPath(request, { env });
    const matchResult = this.router.match(method, path2);
    const c = new Context(request, {
      path: path2,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path2) {
  const matchers = this.buildAllMatchers();
  const match2 = (method2, path22) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path22];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path22.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  };
  this.match = match2;
  return match2(method, path2);
}

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path2, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path2 = path2.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path2.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path2) {
  return wildcardRegExpCache[path2] ??= new RegExp(
    path2 === "*" ? "" : `^${path2.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path2, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path2] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path2, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path2) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path2) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path2)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path2, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path2 === "/*") {
      path2 = "*";
    }
    const paramCount = (path2.match(/\/:/g) || []).length;
    if (/\*$/.test(path2)) {
      const re = buildWildcardRegExp(path2);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path2] ||= findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        });
      } else {
        middleware[method][path2] ||= findMiddleware(middleware[method], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path2) || [path2];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path22 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path22] ||= [
            ...findMiddleware(middleware[m], path22) || findMiddleware(middleware[METHOD_NAME_ALL], path22) || []
          ];
          routes[m][path22].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path2) => [path2, r[method][path2]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path2) => [path2, r[METHOD_NAME_ALL][path2]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path2, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path2, handler]);
  }
  match(method, path2) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path2);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path2, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path2);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path2) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path2);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path2, handler) {
    const results = checkOptionalParameter(path2);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path2, handler);
  }
  match(method, path2) {
    return this.#node.search(method, path2);
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = (cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  return response.formData();
};

// ../../node_modules/.pnpm/hono@4.11.5/node_modules/hono/dist/validator/validator.js
var jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/;
var urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var validator = (target, validationFunc) => {
  return async (c, next) => {
    let value = {};
    const contentType = c.req.header("Content-Type");
    switch (target) {
      case "json":
        if (!contentType || !jsonRegex.test(contentType)) {
          break;
        }
        try {
          value = await c.req.json();
        } catch {
          const message = "Malformed JSON in request body";
          throw new HTTPException(400, { message });
        }
        break;
      case "form": {
        if (!contentType || !(multipartRegex.test(contentType) || urlencodedRegex.test(contentType))) {
          break;
        }
        let formData;
        if (c.req.bodyCache.formData) {
          formData = await c.req.bodyCache.formData;
        } else {
          try {
            const arrayBuffer = await c.req.arrayBuffer();
            formData = await bufferToFormData(arrayBuffer, contentType);
            c.req.bodyCache.formData = formData;
          } catch (e) {
            let message = "Malformed FormData request.";
            message += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`;
            throw new HTTPException(400, { message });
          }
        }
        const form = {};
        formData.forEach((value2, key) => {
          if (key.endsWith("[]")) {
            ;
            (form[key] ??= []).push(value2);
          } else if (Array.isArray(form[key])) {
            ;
            form[key].push(value2);
          } else if (key in form) {
            form[key] = [form[key], value2];
          } else {
            form[key] = value2;
          }
        });
        value = form;
        break;
      }
      case "query":
        value = Object.fromEntries(
          Object.entries(c.req.queries()).map(([k, v]) => {
            return v.length === 1 ? [k, v[0]] : [k, v];
          })
        );
        break;
      case "param":
        value = c.req.param();
        break;
      case "header":
        value = c.req.header();
        break;
      case "cookie":
        value = getCookie(c);
        break;
    }
    const res = await validationFunc(value, c);
    if (res instanceof Response) {
      return res;
    }
    c.req.addValidatedData(target, res);
    return await next();
  };
};

// ../../node_modules/.pnpm/@hono+zod-validator@0.2.2_hono@4.11.5_zod@3.25.76/node_modules/@hono/zod-validator/dist/esm/index.js
var zValidator = (target, schema, hook) => (
  // @ts-expect-error not typed well
  validator(target, async (value, c) => {
    const result = await schema.safeParseAsync(value);
    if (hook) {
      const hookResult = await hook({ data: value, ...result }, c);
      if (hookResult) {
        if (hookResult instanceof Response) {
          return hookResult;
        }
        if ("response" in hookResult) {
          return hookResult.response;
        }
      }
    }
    if (!result.success) {
      return c.json(result, 400);
    }
    return result.data;
  })
);

// src/shared/utils/password.ts
var import_bcrypt = __toESM(require("bcrypt"));
var SALT_ROUNDS = 10;
async function hashPassword(password) {
  return import_bcrypt.default.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return import_bcrypt.default.compare(password, hash);
}

// src/shared/utils/jwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
var REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "your-refresh-secret-key";
var REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
function generateAccessToken(payload) {
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}
function generateRefreshToken(payload) {
  return import_jsonwebtoken.default.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN
  });
}
function verifyAccessToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch (error) {
    if (error instanceof import_jsonwebtoken.default.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof import_jsonwebtoken.default.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}
function verifyRefreshToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    if (error instanceof import_jsonwebtoken.default.TokenExpiredError) {
      throw new Error("Refresh token expired");
    }
    if (error instanceof import_jsonwebtoken.default.JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }
}

// src/shared/utils/logger.ts
function logOperation(context) {
  const logEntry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...context
  };
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(logEntry));
  } else {
    console.log("[LOG]", logEntry);
  }
}
function logSensitiveOperation(action, userId, companyId, metadata) {
  logOperation({
    userId,
    companyId: companyId || void 0,
    action,
    metadata: {
      ...metadata,
      sensitive: true
    }
  });
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt2, alg) {
  if (!jwtRegex.test(jwt2))
    return false;
  try {
    const [header] = jwt2.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;

// src/shared/utils/error-handler.ts
function errorHandler2(error, c) {
  if (error instanceof ZodError) {
    return c.json(
      {
        error: {
          message: "Validation error",
          code: "VALIDATION_ERROR",
          details: error.errors
        }
      },
      400
    );
  }
  if (error instanceof Error && "code" in error) {
    const errorCode = error.code;
    if (errorCode === "EHOSTUNREACH" || errorCode === "ENOTFOUND" || errorCode === "ETIMEDOUT" || errorCode === "ECONNREFUSED" || errorCode === "DATABASE_CONNECTION_ERROR") {
      return c.json(
        {
          error: {
            message: "N\xE3o foi poss\xEDvel conectar ao banco de dados. Verifique a configura\xE7\xE3o de DATABASE_URL no arquivo .env",
            code: "DATABASE_CONNECTION_ERROR",
            details: process.env.NODE_ENV === "development" ? error.message : void 0
          }
        },
        500
      );
    }
  }
  if (error instanceof Error && (error.message.includes("does not exist") || error.message.includes("relation") && error.message.includes("not found"))) {
    const tableHint = error.message.match(/relation "([^"]+)"/)?.[1] ?? error.message.match(/relation '([^']+)'/)?.[1] ?? error.message.match(/"([^"]+)" does not exist/)?.[1] ?? error.message.match(/'([^']+)' does not exist/)?.[1];
    const message = tableHint ? `Tabela "${tableHint}" n\xE3o encontrada. Execute: pnpm run migrate (em apps/api).` : "Tabela n\xE3o encontrada no banco de dados. Execute: pnpm run migrate (em apps/api).";
    return c.json(
      {
        error: {
          message,
          code: "TABLE_NOT_FOUND",
          details: { tableOrRelation: tableHint ?? void 0, raw: error.message }
        }
      },
      500
    );
  }
  if (error instanceof Error && error.message.includes("company_id")) {
    return c.json(
      {
        error: {
          message: "Tenant isolation violation",
          code: "TENANT_ISOLATION_ERROR",
          details: error.message
        }
      },
      500
    );
  }
  if (error instanceof Error && "code" in error) {
    const err = error;
    const statusCode = typeof err.statusCode === "number" ? err.statusCode : getStatusCodeFromErrorCode(err.code);
    return c.json(
      {
        error: {
          message: error.message,
          code: error.code || "UNKNOWN_ERROR"
        }
      },
      statusCode
    );
  }
  console.error("Unhandled error:", error);
  console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
  console.error("Error details:", {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : typeof error
  });
  return c.json(
    {
      error: {
        message: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR",
        details: process.env.NODE_ENV === "development" ? error instanceof Error ? error.stack : String(error) : void 0
      }
    },
    500
  );
}
function getStatusCodeFromErrorCode(code) {
  const statusMap = {
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    VALIDATION_ERROR: 400,
    CONFLICT: 409,
    PAYMENT_REQUIRED: 402,
    MODULE_NOT_ACTIVE: 402,
    SUBSCRIPTION_INACTIVE: 402,
    USER_LIMIT_REACHED: 409,
    EMAIL_ALREADY_EXISTS: 409,
    SUBSCRIPTION_NOT_FOUND: 402
  };
  return statusMap[code] || 500;
}
var AppError = class extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "AppError";
  }
};

// src/modules/auth/auth.service.ts
var DEFAULT_PLAN_NAME = "Free";
var AuthService = class {
  constructor(authRepo2, companyService4, userRepo3, subscriptionRepo5, planRepo6) {
    this.authRepo = authRepo2;
    this.companyService = companyService4;
    this.userRepo = userRepo3;
    this.subscriptionRepo = subscriptionRepo5;
    this.planRepo = planRepo6;
  }
  /**
   * Cadastrar escritório de contabilidade (tenant) e usuário responsável (admin).
   * Cria: company (com schema tenant), assinatura no plano Free, primeiro usuário admin.
   */
  async register(data) {
    const freePlan = await this.planRepo.findByName(DEFAULT_PLAN_NAME);
    if (!freePlan) {
      throw new AppError(
        `Plano padr\xE3o "${DEFAULT_PLAN_NAME}" n\xE3o encontrado. Execute o seed do banco.`,
        "DEFAULT_PLAN_NOT_FOUND",
        500
      );
    }
    const name = (data.company.trade_name?.trim() || data.company.legal_name.trim()).slice(0, 255);
    const cnpjNormalized = data.company.cnpj.replace(/\D/g, "");
    const company = await this.companyService.create({
      name,
      legal_name: data.company.legal_name,
      trade_name: data.company.trade_name || void 0,
      cnpj: cnpjNormalized,
      phone: data.company.phone || void 0,
      contact_email: data.user.email,
      contact_name: data.user.name
    });
    await this.subscriptionRepo.create(company.id, {
      planId: freePlan.id,
      freePlanStartedAt: /* @__PURE__ */ new Date()
    });
    const passwordHash = await hashPassword(data.user.password);
    const user = await this.userRepo.create(company.id, {
      name: data.user.name,
      email: data.user.email,
      password: passwordHash,
      role: "admin"
    });
    const tokens = this.generateTokens({
      userId: user.id,
      companyId: company.id,
      email: user.email,
      role: user.role
    });
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepo.createRefreshToken(user.id, tokens.refresh, expiresAt);
    logSensitiveOperation("user_registered", user.id, company.id, { email: user.email });
    return { user, company, tokens };
  }
  /**
   * Login
   */
  async login(email, password, companyId) {
    let user;
    user = await this.authRepo.findByEmailOnly(email);
    if (!user && companyId) {
      user = await this.authRepo.findByEmail(email, companyId);
    }
    if (user && user.tenant_id === null) {
    } else if (user && user.tenant_id) {
      companyId = user.tenant_id;
    }
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const passwordHash = await this.authRepo.findPasswordHash(user.id, user.tenant_id);
    if (!passwordHash) {
      throw new Error("Invalid credentials");
    }
    const isValid2 = await verifyPassword(password, passwordHash);
    if (!isValid2) {
      throw new Error("Invalid credentials");
    }
    const tokens = this.generateTokens({
      userId: user.id,
      companyId: user.tenant_id || null,
      email: user.email,
      role: user.role
    });
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepo.createRefreshToken(user.id, tokens.refresh, expiresAt);
    logSensitiveOperation("user_logged_in", user.id, user.tenant_id || "super_admin");
    return { user, tokens };
  }
  /**
   * Renovar access token usando refresh token
   */
  async refreshToken(token) {
    const refreshToken = await this.authRepo.findRefreshToken(token);
    if (!refreshToken) {
      throw new Error("Invalid refresh token");
    }
    const payload = verifyRefreshToken(token);
    const accessToken = generateAccessToken({
      userId: payload.userId,
      companyId: payload.companyId,
      email: payload.email,
      role: payload.role
    });
    return { accessToken };
  }
  /**
   * Logout - invalidar refresh token
   */
  async logout(token) {
    await this.authRepo.deleteRefreshToken(token);
  }
  /**
   * Validar token JWT
   */
  validateToken(token) {
    return verifyRefreshToken(token);
  }
  /**
   * Gerar tokens (access + refresh)
   */
  generateTokens(payload) {
    return {
      access: generateAccessToken(payload),
      refresh: generateRefreshToken(payload)
    };
  }
};

// src/db/client.ts
var import_dotenv = __toESM(require_main());
var import_path = require("path");
var import_async_hooks = require("async_hooks");
var import_node_dns2 = __toESM(require("node:dns"));
var import_pg = require("pg");
import_node_dns2.default.setDefaultResultOrder("ipv4first");
if (!process.env.DATABASE_URL) {
  const envPath = (0, import_path.resolve)(process.cwd(), "../../.env");
  (0, import_dotenv.config)({ path: envPath });
}
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("\u274C DATABASE_URL n\xE3o est\xE1 configurado!");
  console.error("\u{1F4A1} Configure no arquivo .env:");
  console.error("   DATABASE_URL=postgresql://postgres:SENHA@db.PROJECT_REF.supabase.co:5432/postgres");
  process.exit(1);
}
if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
  console.error("\u274C DATABASE_URL deve come\xE7ar com postgresql:// ou postgres://");
  process.exit(1);
}
var isSupabase = connectionString.includes("supabase.co");
var pool = new import_pg.Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 1e4,
  connectionTimeoutMillis: 3e4,
  ...isSupabase && {
    ssl: { rejectUnauthorized: false }
  }
});
pool.on("error", (err) => {
  console.error("\u274C Erro inesperado no pool de conex\xF5es:", err.message);
  console.error("   Tipo:", err.constructor.name);
  if (err.code === "EHOSTUNREACH" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED") {
    console.error("\n\u{1F4A1} Poss\xEDveis solu\xE7\xF5es:");
    console.error("   1. Verifique sua conex\xE3o com a internet");
    console.error("   2. Verifique se a DATABASE_URL est\xE1 correta no .env");
    console.error("   3. Se estiver usando Supabase, verifique se o projeto est\xE1 ativo");
    console.error("   4. Tente usar IPv4 ao inv\xE9s de IPv6 (verifique a connection string)");
    console.error("   5. Verifique se h\xE1 firewall bloqueando a conex\xE3o");
  }
  if (process.env.NODE_ENV !== "production") {
    console.error("\n\u26A0\uFE0F  Continuando, mas conex\xF5es podem falhar...");
  }
});
var tenantSchemaStorage = new import_async_hooks.AsyncLocalStorage();
async function runWithTenantClient(companyId, fn) {
  const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
  return tenantSchemaStorage.run(schemaName, fn);
}
async function query(text, params) {
  const start = Date.now();
  const schemaName = tenantSchemaStorage.getStore();
  if (schemaName) {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schemaName}", public`);
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === "development" && duration > 1e3) {
        console.log("Slow query:", { text, duration, rows: result.rowCount });
      }
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } finally {
      await client.query("RESET search_path").catch(() => {
      });
      client.release();
    }
  }
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "development" && duration > 1e3) {
      console.log("Slow query:", { text, duration, rows: result.rowCount });
    }
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (error) {
    if (error.code === "EHOSTUNREACH" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
      const maskedUrl = connectionString?.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@") || "connection string n\xE3o dispon\xEDvel";
      console.error("\u274C Erro de conex\xE3o com o banco de dados:");
      console.error(`   C\xF3digo: ${error.code}`);
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Connection String (mascarada): ${maskedUrl}`);
      console.error("\n\u{1F4A1} Poss\xEDveis solu\xE7\xF5es:");
      console.error("   1. Verifique sua conex\xE3o com a internet");
      console.error("   2. Verifique se a DATABASE_URL est\xE1 correta no arquivo .env");
      console.error("   3. Se estiver usando Supabase, verifique se o projeto est\xE1 ativo");
      console.error("   4. Tente usar a connection string do pooler (porta 6543) ao inv\xE9s da direta");
      console.error("   5. Verifique se h\xE1 firewall ou proxy bloqueando a conex\xE3o");
      console.error("   6. Se o erro mencionar IPv6, tente usar IPv4 ou o pooler do Supabase");
      console.error("\n\u{1F4D6} Veja COMO_ENCONTRAR_CONNECTION_STRING.md para mais informa\xE7\xF5es");
      const friendlyError = new Error(
        `N\xE3o foi poss\xEDvel conectar ao banco de dados. Verifique a configura\xE7\xE3o de DATABASE_URL no arquivo .env. Erro: ${error.code || error.message}`
      );
      friendlyError.code = error.code || "DATABASE_CONNECTION_ERROR";
      throw friendlyError;
    }
    console.error("Database query error:", {
      code: error.code,
      message: error.message,
      query: text.substring(0, 100),
      paramsCount: params?.length || 0
    });
    throw error;
  }
}
function getClient() {
  return pool.connect();
}

// src/shared/repositories/base.repository.ts
var BaseRepository = class {
  /**
   * Executar query com validação de company_id
   * @param sql - Query SQL
   * @param params - Parâmetros da query (companyId deve estar incluído quando necessário)
   * @param requireCompanyId - Se true, valida que companyId está nos params
   */
  async query(sql, params = [], requireCompanyId = true) {
    const lowerSql = sql.toLowerCase().replace(/\s+/g, " ").trim();
    const isInsertSettingTenantOrCompany = lowerSql.startsWith("insert") && (lowerSql.includes("company_id") || lowerSql.includes("tenant_id"));
    if (requireCompanyId && !isInsertSettingTenantOrCompany) {
      const requiresValidation = this.requiresCompanyId(sql);
      if (requiresValidation) {
        const hasCompanyIdInWhere = lowerSql.includes("company_id =") || lowerSql.includes("company_id is null") || lowerSql.includes("company_id is not null");
        const hasTenantIdInWhere = lowerSql.includes("tenant_id =") || lowerSql.includes("tenant_id is null") || lowerSql.includes("tenant_id is not null");
        const hasCompanyIdFilter = hasCompanyIdInWhere || hasTenantIdInWhere || lowerSql.startsWith("insert") && (lowerSql.includes("company_id") || lowerSql.includes("tenant_id"));
        if (!hasCompanyIdFilter) {
          const error = new Error(
            'Query must include company_id or tenant_id filter for tenant isolation. Add "AND company_id = $X" (ou tenant_id para users) or use requireCompanyId: false.'
          );
          console.error("[BaseRepository.query] Validation failed:", {
            sql: sql.substring(0, 150),
            requireCompanyId,
            requiresValidation,
            hasCompanyIdFilter
          });
          throw error;
        }
      }
    }
    try {
      return await query(sql, params);
    } catch (error) {
      console.error("[BaseRepository.query] Database error:", {
        sql: sql.substring(0, 200),
        // Primeiros 200 caracteres para não poluir logs
        params: params.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  /**
   * Verificar se a query requer filtro de company_id
   * 
   * Tabelas do schema 'public' que requerem company_id:
   * - users (usuários pertencem a uma company)
   * - subscriptions (assinaturas pertencem a uma company)
   * - tenant_modules (módulos ativos por tenant)
   * 
   * Tabelas do schema 'tenant_{id}' que NÃO requerem company_id (isoladas por schema):
   * - clients, fiscal_files, extracted_fiscal_data, rating_validations,
   *   tax_simulations, edicts, opportunities
   */
  requiresCompanyId(sql) {
    const lowerSql = sql.toLowerCase();
    const publicTablesRequiringCompanyId = ["users", "subscriptions", "tenant_modules"];
    const tenantTables = [
      "clients",
      "fiscal_files",
      "extracted_fiscal_data",
      "rating_validations",
      "tax_simulations",
      "edicts",
      "opportunities",
      "in_2306_simulations",
      "irpf_alta_renda",
      "properties",
      "property_transactions",
      "property_monthly_totals"
    ];
    if (tenantTables.some((table) => lowerSql.includes(table))) {
      return false;
    }
    return publicTablesRequiringCompanyId.some((table) => lowerSql.includes(table));
  }
  /**
   * Helper para construir WHERE clause com company_id
   */
  buildWhereClause(baseWhere = "", companyId) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    if (baseWhere) {
      conditions.push(baseWhere);
    }
    if (companyId) {
      conditions.push(`company_id = $${paramIndex}`);
      params.push(companyId);
      paramIndex++;
    }
    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
      params
    };
  }
};

// src/modules/auth/auth.repository.ts
var AuthRepository = class extends BaseRepository {
  /**
   * Buscar usuário por email e tenant_id
   */
  async findByEmail(email, tenantId) {
    const result = await this.query(
      "SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE email = $1 AND tenant_id = $2",
      [email, tenantId]
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar usuário por email (sem filtro de tenant - usado no login antes de identificar tenant)
   */
  async findByEmailOnly(email) {
    const result = await query(
      "SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar senha hash do usuário
   */
  async findPasswordHash(userId, tenantId) {
    if (tenantId === null) {
      const result2 = await query(
        "SELECT password_hash FROM public.users WHERE id = $1 AND tenant_id IS NULL",
        [userId]
      );
      return result2.rows[0]?.password_hash || null;
    }
    const result = await this.query(
      "SELECT password_hash FROM public.users WHERE id = $1 AND tenant_id = $2",
      [userId, tenantId]
    );
    return result.rows[0]?.password_hash || null;
  }
  /**
   * Criar refresh token
   */
  async createRefreshToken(userId, token, expiresAt) {
    const result = await this.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, token, expires_at, created_at",
      [userId, token, expiresAt],
      false
      // refresh_tokens não requer company_id diretamente
    );
    return result.rows[0];
  }
  /**
   * Buscar refresh token
   */
  async findRefreshToken(token) {
    const result = await this.query(
      "SELECT id, user_id, token, expires_at, created_at FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
      [token],
      false
    );
    return result.rows[0] || null;
  }
  /**
   * Deletar refresh token
   */
  async deleteRefreshToken(token) {
    await this.query(
      "DELETE FROM refresh_tokens WHERE token = $1",
      [token],
      false
    );
  }
  /**
   * Deletar todos os refresh tokens de um usuário
   */
  async deleteRefreshTokensByUser(userId) {
    await this.query(
      "DELETE FROM refresh_tokens WHERE user_id = $1",
      [userId],
      false
    );
  }
};

// src/modules/companies/company.repository.ts
var CompanyRepository = class extends BaseRepository {
  /**
   * Buscar empresa por ID
   * Nota: Companies não requerem filtro de company_id (são o próprio tenant)
   */
  async findById(id) {
    const result = await this.query(
      `SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies WHERE id = $1`,
      [id],
      false
      // Companies não requerem filtro de tenant
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar empresa por domain
   */
  async findByDomain(domain) {
    const result = await this.query(
      `SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies WHERE domain = $1`,
      [domain],
      false
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar empresa por CNPJ
   */
  async findByCnpj(cnpj) {
    const result = await this.query(
      `SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies WHERE cnpj = $1`,
      [cnpj],
      false
    );
    return result.rows[0] || null;
  }
  /**
   * Criar empresa
   * @param data - Dados da empresa
   * @param client - Client opcional para usar em transação
   */
  async create(data, client) {
    const sql = `INSERT INTO companies (
                   name, domain, cnpj, legal_name, trade_name, email, phone,
                   contact_name, contact_email, contact_phone, tax_regime,
                   state_registration, municipal_registration, cnae,
                   zip_code, address_street, address_number, address_complement,
                   address_neighborhood, address_city, address_state, notes
                 ) 
                 VALUES (
                   $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                   $15, $16, $17, $18, $19, $20, $21, $22
                 ) 
                 RETURNING id, name, domain, cnpj, legal_name, trade_name, email, phone,
                           contact_name, contact_email, contact_phone, tax_regime,
                           state_registration, municipal_registration, cnae,
                           zip_code, address_street, address_number, address_complement,
                           address_neighborhood, address_city, address_state, notes,
                           created_at, updated_at`;
    const params = [
      data.name,
      data.domain || null,
      data.cnpj || null,
      data.legal_name || null,
      data.trade_name || null,
      data.email || null,
      data.phone || null,
      data.contact_name || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.tax_regime || null,
      data.state_registration || null,
      data.municipal_registration || null,
      data.cnae || null,
      data.zip_code || null,
      data.address_street || null,
      data.address_number || null,
      data.address_complement || null,
      data.address_neighborhood || null,
      data.address_city || null,
      data.address_state || null,
      data.notes || null
    ];
    if (client) {
      const result = await client.query(sql, params);
      return result.rows[0];
    } else {
      const result = await this.query(sql, params, false);
      return result.rows[0];
    }
  }
  /**
   * Listar todas as empresas (para super_admin)
   */
  async findAll() {
    const result = await this.query(
      `SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies ORDER BY created_at DESC`,
      [],
      false
    );
    return result.rows;
  }
  /**
   * Atualizar empresa
   */
  async update(id, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    const fields = [
      "name",
      "domain",
      "cnpj",
      "legal_name",
      "trade_name",
      "email",
      "phone",
      "contact_name",
      "contact_email",
      "contact_phone",
      "tax_regime",
      "state_registration",
      "municipal_registration",
      "cnae",
      "zip_code",
      "address_street",
      "address_number",
      "address_complement",
      "address_neighborhood",
      "address_city",
      "address_state",
      "notes"
    ];
    for (const field of fields) {
      if (data[field] !== void 0) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(data[field]);
      }
    }
    if (updates.length === 0) {
      return this.findById(id);
    }
    params.push(id);
    const result = await this.query(
      `UPDATE companies 
       SET ${updates.join(", ")}, updated_at = NOW() 
       WHERE id = $${paramIndex++} 
       RETURNING id, name, domain, cnpj, legal_name, trade_name, email, phone,
                 contact_name, contact_email, contact_phone, tax_regime,
                 state_registration, municipal_registration, cnae,
                 zip_code, address_street, address_number, address_complement,
                 address_neighborhood, address_city, address_state, notes,
                 created_at, updated_at`,
      params,
      false
    );
    return result.rows[0];
  }
};

// src/db/schema-manager.ts
var import_promises = require("fs/promises");
var import_path2 = require("path");

// src/db/tenant-migrations.ts
var TENANT_MIGRATION_FILES = [
  "008_tenant_clients.sql",
  "009_client_tax_regime.sql",
  "010_fiscal_files.sql",
  "011_extracted_data.sql",
  "021_rating_validations.sql",
  "024_judicial_processes.sql",
  "025_in_2306_simulations.sql",
  "029_irpf_alta_renda.sql",
  "034_irpf_alta_renda_add_company_id.sql",
  "036_properties.sql",
  "038_property_monthly_totals.sql",
  "040_irpf_alta_renda_payload_json.sql"
];
function getTenantMigrationVersion(filename) {
  return parseInt(filename.split("_")[0], 10);
}

// src/db/schema-manager.ts
var MIGRATIONS_DIR = (0, import_path2.join)(__dirname, "migrations");
async function createTenantSchema(companyId, client) {
  const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
  try {
    if (client) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    } else {
      await query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    }
    console.log(`\u2705 Schema ${schemaName} criado com sucesso`);
  } catch (error) {
    console.error(`\u274C Erro ao criar schema ${schemaName}:`, error);
    throw error;
  }
}
async function applyTenantMigrations(companyId, client) {
  const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
  const useClient = client || await getClient();
  const shouldRelease = !client;
  try {
    await useClient.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".schema_migrations (
        version INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const executedMigrations = await useClient.query(
      `SELECT version FROM "${schemaName}".schema_migrations ORDER BY version`
    );
    const executedVersions = new Set(executedMigrations.rows.map((m) => m.version));
    const tenantMigrations = [];
    for (const file of TENANT_MIGRATION_FILES) {
      const version = getTenantMigrationVersion(file);
      if (!executedVersions.has(version)) {
        const sql = await (0, import_promises.readFile)((0, import_path2.join)(MIGRATIONS_DIR, file), "utf-8");
        tenantMigrations.push({ filename: file, version, sql });
      }
    }
    if (tenantMigrations.length === 0) {
      console.log(`\u2705 Nenhuma migration de tenant pendente para ${schemaName}`);
      return;
    }
    console.log(`\u{1F4E6} ${tenantMigrations.length} migration(s) de tenant pendente(s) para ${schemaName}`);
    if (!client) {
      await useClient.query("BEGIN");
    }
    try {
      await useClient.query(`SET search_path TO "${schemaName}", public`);
      for (const migration of tenantMigrations) {
        console.log(`\u23F3 Executando: ${migration.filename} no schema ${schemaName}`);
        await useClient.query(migration.sql);
        await useClient.query(
          `INSERT INTO "${schemaName}".schema_migrations (version, filename) VALUES ($1, $2)`,
          [migration.version, migration.filename]
        );
        console.log(`\u2705 ${migration.filename} executada com sucesso no schema ${schemaName}`);
      }
      if (!client) {
        await useClient.query("COMMIT");
      }
      console.log(`\u2705 Todas as migrations de tenant foram aplicadas no schema ${schemaName}`);
    } catch (error) {
      if (!client) {
        await useClient.query("ROLLBACK");
      }
      throw error;
    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  } catch (error) {
    console.error(`\u274C Erro ao aplicar migrations de tenant no schema ${schemaName}:`, error);
    throw error;
  }
}

// src/modules/companies/company.service.ts
var CompanyService = class {
  constructor(companyRepo6) {
    this.companyRepo = companyRepo6;
  }
  /**
   * Criar empresa e seu schema de tenant
   */
  async create(data) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      if (data.domain) {
        const existingDomain = await client.query(
          "SELECT id FROM companies WHERE domain = $1 FOR UPDATE",
          [data.domain]
        );
        if (existingDomain.rows.length > 0) {
          await client.query("ROLLBACK");
          throw new AppError("Domain already exists", "DOMAIN_ALREADY_EXISTS", 409);
        }
      }
      if (data.cnpj) {
        const existingCnpj = await client.query(
          "SELECT id FROM companies WHERE cnpj = $1 FOR UPDATE",
          [data.cnpj]
        );
        if (existingCnpj.rows.length > 0) {
          await client.query("ROLLBACK");
          throw new AppError("CNPJ already exists", "CNPJ_ALREADY_EXISTS", 409);
        }
      } else {
        const lockKey = `company_${data.name}_${data.email || ""}`.substring(0, 100);
        await client.query(`SELECT pg_advisory_lock(hashtext($1))`, [lockKey]);
        try {
          const existingByName = await client.query(
            "SELECT id FROM companies WHERE name = $1 AND (email = $2 OR ($2 IS NULL AND email IS NULL)) AND (cnpj IS NULL OR cnpj = '') FOR UPDATE",
            [data.name, data.email || null]
          );
          if (existingByName.rows.length > 0) {
            await client.query("ROLLBACK");
            throw new AppError("Company with same name and email already exists", "COMPANY_ALREADY_EXISTS", 409);
          }
        } finally {
          await client.query(`SELECT pg_advisory_unlock(hashtext($1))`, [lockKey]);
        }
      }
      const company = await this.companyRepo.create(data, client);
      const schemaName = `tenant_${company.id.replace(/-/g, "_")}`;
      const schemaExists = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schemaName]
      );
      if (schemaExists.rows.length === 0) {
        await createTenantSchema(company.id, client);
        await applyTenantMigrations(company.id, client);
      } else {
        console.warn(`\u26A0\uFE0F Schema ${schemaName} j\xE1 existe, pulando cria\xE7\xE3o`);
      }
      await client.query("COMMIT");
      console.log(`\u2705 Company ${company.id} criada com schema tenant_${company.id}`);
      return company;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("\u274C Erro ao criar company:", error);
      if (error.code === "23505") {
        if (error.constraint?.includes("cnpj")) {
          throw new AppError("CNPJ already exists", "CNPJ_ALREADY_EXISTS", 409);
        }
        if (error.constraint?.includes("domain")) {
          throw new AppError("Domain already exists", "DOMAIN_ALREADY_EXISTS", 409);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
  /**
   * Atualizar empresa
   */
  async update(id, data) {
    const company = await this.companyRepo.findById(id);
    if (!company) {
      throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
    }
    if (data.domain && data.domain !== company.domain) {
      const existing = await this.companyRepo.findByDomain(data.domain);
      if (existing) {
        throw new AppError("Domain already exists", "DOMAIN_ALREADY_EXISTS", 409);
      }
    }
    return this.companyRepo.update(id, data);
  }
  /**
   * Buscar empresa por ID
   */
  async getById(id) {
    const company = await this.companyRepo.findById(id);
    if (!company) {
      throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
    }
    return company;
  }
  /**
   * Buscar empresa por domain
   */
  async getByDomain(domain) {
    const company = await this.companyRepo.findByDomain(domain);
    if (!company) {
      throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
    }
    return company;
  }
};

// src/modules/users/user.repository.ts
var UserRepository = class extends BaseRepository {
  /**
   * Buscar usuário por ID e tenant_id
   */
  async findById(id, tenantId) {
    const result = await this.query(
      "SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE id = $1 AND tenant_id = $2",
      [id, tenantId]
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar usuário por email e tenant_id
   */
  async findByEmail(email, tenantId) {
    const result = await this.query(
      "SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE email = $1 AND tenant_id = $2",
      [email, tenantId]
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar usuário por email globalmente (para verificar duplicatas de super_admin)
   */
  async findByEmailGlobal(email) {
    const result = await this.query(
      "SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE email = $1",
      [email],
      false
      // Não requer filtro de tenant
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar todos os usuários com um email específico (para debug)
   */
  async findAllByEmail(email) {
    const result = await this.query(
      "SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE email = $1 ORDER BY created_at DESC",
      [email],
      false
      // Não requer filtro de tenant
    );
    return result.rows;
  }
  /**
   * Criar usuário
   */
  async create(tenantId, data) {
    const result = await this.query(
      `INSERT INTO users (email, name, password_hash, tenant_id, role, status) 
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'active')) 
       RETURNING id, email, name, tenant_id, role, COALESCE(status, 'active') as status, created_at, updated_at`,
      [data.email, data.name, data.password, tenantId, data.role || "user", "active"],
      false
    );
    const createdUser = result.rows[0];
    if (!createdUser.status || createdUser.status !== "active") {
      console.warn(`[UserRepository.create] Usu\xE1rio criado com status inesperado: ${createdUser.status || "undefined"}, for\xE7ando 'active'`);
      await this.query(
        "UPDATE users SET status = $1 WHERE id = $2 AND tenant_id = $3",
        ["active", createdUser.id, tenantId]
      );
      createdUser.status = "active";
    }
    console.log(`[UserRepository.create] Usu\xE1rio criado: ${createdUser.email}, status: ${createdUser.status}, tenant_id: ${tenantId}`);
    return createdUser;
  }
  /**
   * Atualizar usuário
   */
  async update(id, tenantId, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (data.name !== void 0) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.email !== void 0) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.role !== void 0) {
      updates.push(`role = $${paramIndex++}`);
      params.push(data.role);
    }
    if (data.status !== void 0) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (updates.length === 0) {
      return this.findById(id, tenantId);
    }
    params.push(id, tenantId);
    const result = await this.query(
      `UPDATE users 
       SET ${updates.join(", ")}, updated_at = NOW() 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} 
       RETURNING id, email, name, tenant_id, role, status, created_at, updated_at`,
      params
    );
    return result.rows[0];
  }
  /**
   * Deletar usuário
   */
  async delete(id, tenantId) {
    await this.query(
      "DELETE FROM users WHERE id = $1 AND tenant_id = $2",
      [id, tenantId]
    );
  }
  /**
   * Contar usuários por tenant (para validação de seats)
   */
  async countByCompany(tenantId) {
    const result = await this.query(
      "SELECT COUNT(*) as count FROM users WHERE tenant_id = $1",
      [tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  }
  /**
   * Listar usuários por tenant (com paginação)
   */
  async findByCompany(tenantId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let whereClause = "tenant_id = $1";
    if (options.role) {
      whereClause += " AND role = $2";
      params.push(options.role);
    }
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const usersResult = await this.query(
      `SELECT id, email, name, tenant_id, role, status, created_at, updated_at 
       FROM users 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return {
      users: usersResult.rows,
      total
    };
  }
  /**
   * Criar super_admin (sem tenant_id)
   */
  async createSuperAdmin(data) {
    const result = await this.query(
      `INSERT INTO users (email, name, password_hash, tenant_id, role, status) 
       VALUES ($1, $2, $3, NULL, 'super_admin', 'active') 
       RETURNING id, email, name, tenant_id, role, status, created_at, updated_at`,
      [data.email, data.name, data.password],
      false
      // Não requer filtro de tenant
    );
    return result.rows[0];
  }
  /**
   * Listar todos os super_admins
   */
  async findSuperAdmins() {
    try {
      console.log("[UserRepository.findSuperAdmins] Executing query with requireCompanyId: false");
      const result = await this.query(
        `SELECT 
          id, 
          email, 
          name, 
          tenant_id, 
          role, 
          COALESCE(status, 'active') as status, 
          created_at, 
          updated_at 
         FROM users 
         WHERE role = 'super_admin' AND tenant_id IS NULL 
         ORDER BY created_at DESC`,
        [],
        false
        // Não requer filtro de tenant
      );
      console.log("[UserRepository.findSuperAdmins] Query executed successfully, found", result.rows.length, "users");
      return result.rows;
    } catch (error) {
      console.error("[UserRepository.findSuperAdmins] Error executing query:", error);
      console.error("[UserRepository.findSuperAdmins] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0
      });
      throw error;
    }
  }
};

// src/modules/subscriptions/subscription.repository.ts
var SubscriptionRepository = class extends BaseRepository {
  /**
   * Buscar assinatura por company_id
   */
  async findByCompany(companyId) {
    const result = await this.query(
      `SELECT id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at
       FROM subscriptions 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [companyId]
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar assinatura por Stripe subscription ID
   */
  async findByStripeId(stripeSubscriptionId) {
    const result = await this.query(
      `SELECT id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at
       FROM subscriptions 
       WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId],
      false
      // Não requer company_id nesta query específica
    );
    return result.rows[0] || null;
  }
  /**
   * Criar assinatura
   */
  async create(companyId, data) {
    const result = await this.query(
      `INSERT INTO subscriptions (company_id, plan_id, status, stripe_subscription_id, stripe_customer_id, free_plan_started_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at`,
      [
        companyId,
        data.planId,
        "active",
        data.stripeSubscriptionId || null,
        data.stripeCustomerId || null,
        data.freePlanStartedAt ?? null
      ],
      false
      // INSERT define company_id nos VALUES; validação de filtro é para SELECT/UPDATE
    );
    return result.rows[0];
  }
  /**
   * Atualizar assinatura
   */
  async update(companyId, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (data.planId !== void 0) {
      updates.push(`plan_id = $${paramIndex++}`);
      params.push(data.planId);
    }
    if (data.status !== void 0) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.currentPeriodStart !== void 0) {
      updates.push(`current_period_start = $${paramIndex++}`);
      params.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== void 0) {
      updates.push(`current_period_end = $${paramIndex++}`);
      params.push(data.currentPeriodEnd);
    }
    if (data.stripeSubscriptionId !== void 0) {
      updates.push(`stripe_subscription_id = $${paramIndex++}`);
      params.push(data.stripeSubscriptionId);
    }
    if (data.stripeCustomerId !== void 0) {
      updates.push(`stripe_customer_id = $${paramIndex++}`);
      params.push(data.stripeCustomerId);
    }
    if (data.canceledAt !== void 0) {
      updates.push(`canceled_at = $${paramIndex++}`);
      params.push(data.canceledAt);
    }
    if (data.freePlanStartedAt !== void 0) {
      updates.push(`free_plan_started_at = $${paramIndex++}`);
      params.push(data.freePlanStartedAt);
    }
    if (updates.length === 0) {
      return this.findByCompany(companyId);
    }
    params.push(companyId);
    const result = await this.query(
      `UPDATE subscriptions 
       SET ${updates.join(", ")}, updated_at = NOW() 
       WHERE company_id = $${paramIndex++} 
       RETURNING id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at`,
      params
    );
    return result.rows[0];
  }
  /**
   * Atualizar apenas status
   */
  async updateStatus(companyId, status) {
    return this.update(companyId, { status });
  }
};

// src/modules/plans/plan.repository.ts
var PlanRepository = class extends BaseRepository {
  /**
   * Buscar plano por ID
   * Nota: Planos não requerem filtro de company_id (são globais)
   */
  async findById(id) {
    const result = await this.query(
      "SELECT id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at FROM plans WHERE id = $1",
      [id],
      false
      // Planos não requerem filtro de tenant
    );
    if (result.rows.length === 0) return null;
    const plan = result.rows[0];
    plan.features = Array.isArray(plan.features) ? plan.features : plan.features ? Object.values(plan.features) : [];
    return plan;
  }
  /**
   * Buscar plano por nome (ex.: 'Free' para plano padrão de novos tenants)
   * Nota: Planos não requerem filtro de company_id (são globais)
   */
  async findByName(name) {
    const result = await this.query(
      `SELECT id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at 
       FROM plans WHERE name = $1 LIMIT 1`,
      [name],
      false
    );
    if (result.rows.length === 0) return null;
    const plan = result.rows[0];
    plan.features = Array.isArray(plan.features) ? plan.features : plan.features ? Object.values(plan.features) : [];
    return plan;
  }
  /**
   * Listar todos os planos (apenas ativos - listagem pública)
   * Usa DISTINCT ON para evitar duplicatas por nome (mantém o mais antigo)
   */
  async findAll() {
    const result = await this.query(
      `SELECT DISTINCT ON (name) 
        id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at 
       FROM plans 
       WHERE (status IS NULL OR status = 'active')
       ORDER BY name, created_at ASC`,
      [],
      false
      // Planos não requerem filtro de tenant
    );
    return result.rows.map((plan) => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : plan.features ? Object.values(plan.features) : []
    }));
  }
  /**
   * Listar todos os planos para admin (ativos + inativos - gestão)
   */
  async findAllForAdmin() {
    const result = await this.query(
      `SELECT DISTINCT ON (name) 
        id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at 
       FROM plans 
       ORDER BY name, created_at ASC`,
      [],
      false
    );
    return result.rows.map((plan) => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : plan.features ? Object.values(plan.features) : []
    }));
  }
  /**
   * Criar plano
   */
  async create(data) {
    const featuresObj = data.features.reduce((acc, feature, index) => {
      acc[index] = feature;
      return acc;
    }, {});
    const maxClients = data.maxClients ?? 0;
    const result = await this.query(
      `INSERT INTO plans (name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed) 
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) 
       RETURNING id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, created_at, updated_at`,
      [
        data.name,
        data.maxUsers,
        maxClients,
        data.price,
        data.billingCycle,
        JSON.stringify(featuresObj),
        data.isCustom || false,
        data.isManaged || false
      ],
      false
    );
    const plan = result.rows[0];
    plan.features = data.features;
    return plan;
  }
  /**
   * Atualizar plano
   */
  async update(id, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (data.name !== void 0) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.maxUsers !== void 0) {
      updates.push(`max_users = $${paramIndex++}`);
      params.push(data.maxUsers);
    }
    if (data.maxClients !== void 0) {
      updates.push(`max_clients = $${paramIndex++}`);
      params.push(data.maxClients);
    }
    if (data.price !== void 0) {
      updates.push(`price = $${paramIndex++}`);
      params.push(data.price);
    }
    if (data.billingCycle !== void 0) {
      updates.push(`billing_cycle = $${paramIndex++}`);
      params.push(data.billingCycle);
    }
    if (data.features !== void 0) {
      const featuresObj = data.features.reduce((acc, feature, index) => {
        acc[index] = feature;
        return acc;
      }, {});
      updates.push(`features = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(featuresObj));
    }
    if (data.isCustom !== void 0) {
      updates.push(`is_custom = $${paramIndex++}`);
      params.push(data.isCustom);
    }
    if (data.isManaged !== void 0) {
      updates.push(`is_managed = $${paramIndex++}`);
      params.push(data.isManaged);
    }
    if (data.status !== void 0) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (updates.length === 0) {
      return this.findById(id);
    }
    params.push(id);
    const result = await this.query(
      `UPDATE plans 
       SET ${updates.join(", ")}, updated_at = NOW() 
       WHERE id = $${paramIndex++} 
       RETURNING id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, created_at, updated_at`,
      params,
      false
    );
    const plan = result.rows[0];
    plan.features = Array.isArray(plan.features) ? plan.features : plan.features ? Object.values(plan.features) : [];
    return plan;
  }
  /**
   * Deletar plano
   */
  async delete(id) {
    await this.query(
      "DELETE FROM plans WHERE id = $1",
      [id],
      false
    );
  }
};

// src/middleware/auth.middleware.ts
async function authMiddleware(c, next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      {
        error: {
          message: "Authorization header missing or invalid",
          code: "UNAUTHORIZED"
        }
      },
      401
    );
  }
  const token = authHeader.substring(7);
  try {
    const payload = verifyAccessToken(token);
    let result;
    if (payload.companyId === null || payload.companyId === void 0) {
      result = await query(
        "SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE id = $1 AND tenant_id IS NULL",
        [payload.userId]
      );
    } else {
      result = await query(
        "SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE id = $1 AND tenant_id = $2",
        [payload.userId, payload.companyId]
      );
    }
    if (result.rows.length === 0) {
      return c.json(
        {
          error: {
            message: "User not found",
            code: "USER_NOT_FOUND"
          }
        },
        401
      );
    }
    const user = result.rows[0];
    c.set("user", user);
    c.set("jwt", payload);
    await next();
  } catch (error) {
    if (error instanceof Error && error.message === "Token expired") {
      return c.json(
        {
          error: {
            message: "Token expired",
            code: "TOKEN_EXPIRED"
          }
        },
        401
      );
    }
    return c.json(
      {
        error: {
          message: "Invalid token",
          code: "INVALID_TOKEN"
        }
      },
      401
    );
  }
}

// ../../packages/shared/src/types/edital.ts
var SALARIO_MINIMO_2025 = 1412;
var EDITAIS = [
  // Edital PGDAU 11/2025 - CAPAG
  {
    code: "PGDAU-11-2025",
    name: "Edital PGDAU n\xBA 11/2025",
    description: "Transa\xE7\xE3o por Capacidade de Pagamento (CAPAG)",
    startDate: "2025-01-01",
    endDate: "2026-01-30",
    extended: true,
    modality: "CAPAG",
    paymentTerms: {
      entryPercent: 6,
      entryInstallments: 12,
      maxInstallments: 114,
      minInstallmentAmount: 1e4
      // R$ 100,00
    },
    discountRules: {
      A: {
        // Rating A: apenas entrada facilitada, sem descontos
        principal: 0,
        interest: 0,
        fees: 0,
        maxTotalDiscount: 0
      },
      B: {
        // Rating B: apenas entrada facilitada, sem descontos
        principal: 0,
        interest: 0,
        fees: 0,
        maxTotalDiscount: 0
      },
      C: {
        // Rating C: descontos sobre juros e multas, limitado a 65% do valor total
        principal: 0,
        interest: 100,
        // 100% desconto sobre juros
        fees: 100,
        // 100% desconto sobre multas
        maxTotalDiscount: 65
        // Limitado a 65% do valor total da dívida
      },
      D: {
        // Rating D: descontos sobre juros e multas, limitado a 65% do valor total
        principal: 0,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 65
      }
    },
    eligibility: {
      maxAmount: 45e8,
      // R$ 45 milhões (em centavos)
      requiresRating: true,
      allowedRatings: ["A", "B", "C", "D"]
    },
    notes: "Edital mais importante de 2025. Prazo prorrogado at\xE9 30/01/2026. Para ME/EPP/MEI/Recupera\xE7\xE3o Judicial, desconto pode chegar a 70%.",
    officialLink: "https://www.gov.br/pgfn/pt-br/servicos/orientacoes-contribuintes/acordo-de-transacao/edital-pgdau-11-2025"
  },
  // Edital PGDAU 11/2025 - Pequeno Valor
  {
    code: "PGDAU-11-2025-PEQUENO-VALOR",
    name: "Edital PGDAU n\xBA 11/2025 - Pequeno Valor",
    description: "Transa\xE7\xE3o de Pequeno Valor",
    startDate: "2025-01-01",
    endDate: "2026-01-30",
    extended: true,
    modality: "PEQUENO_VALOR",
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 5,
      maxInstallments: 55,
      minInstallmentAmount: 2500
      // R$ 25,00 para MEI
    },
    discountRules: {
      // Descontos progressivos independente de rating
      A: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 }
        ]
      },
      B: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 }
        ]
      },
      C: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 }
        ]
      },
      D: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 }
        ]
      }
    },
    eligibility: {
      maxAmount: 60 * SALARIO_MINIMO_2025 * 100,
      // 60 SM em centavos
      minAmount: 2500,
      // R$ 25,00 para MEI
      allowedCompanyTypes: ["MEI", "ME", "EPP"]
    },
    notes: "Focado em pessoas f\xEDsicas e microempresas. Descontos progressivos baseados no prazo escolhido."
  },
  // Edital PGDAU 11/2025 - Débitos Irrecuperáveis
  {
    code: "PGDAU-11-2025-IRRECUPERAVEIS",
    name: "Edital PGDAU n\xBA 11/2025 - D\xE9bitos Irrecuper\xE1veis",
    description: "Transa\xE7\xE3o de D\xE9bitos Irrecuper\xE1veis",
    startDate: "2025-01-01",
    endDate: "2026-01-30",
    extended: true,
    modality: "IRRECUPERAVEIS",
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 12,
      maxInstallments: 114
    },
    discountRules: {
      A: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70
      },
      B: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70
      },
      C: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70
      },
      D: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70
      }
    },
    eligibility: {
      minYearsInscribed: 15
      // Requer comprovação: dívida há mais de 15 anos, devedor falido ou empresa com atividades encerradas
    },
    notes: "Descontos m\xE1ximos permitidos por lei. Requer comprova\xE7\xE3o de situa\xE7\xE3o espec\xEDfica."
  },
  // Editais de Contencioso - Tese IPI
  {
    code: "PGFN-52-2025",
    name: "Edital PGFN n\xBA 52/2025",
    description: 'Transa\xE7\xE3o no Contencioso - Conceito de "Pra\xE7a" para c\xE1lculo do IPI',
    startDate: "2025-01-01",
    endDate: "2025-11-28",
    modality: "CONTENCIOSO",
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 60
    },
    discountRules: {
      A: { principal: 65, maxTotalDiscount: 65 },
      B: { principal: 65, maxTotalDiscount: 65 },
      C: { principal: 65, maxTotalDiscount: 65 },
      D: { principal: 65, maxTotalDiscount: 65 }
    },
    eligibility: {
      requiresJudicialProcess: true,
      legalThesis: "IPI - Conceito de Pra\xE7a entre empresas interdependentes"
    },
    notes: "Desconto at\xE9 65% independente de rating. Contribuinte desiste da a\xE7\xE3o judicial."
  },
  // Editais de Contencioso - Preço de Transferência
  {
    code: "PGFN-53-2025",
    name: "Edital PGFN n\xBA 53/2025",
    description: "Transa\xE7\xE3o no Contencioso - Pre\xE7o de Transfer\xEAncia (PRL)",
    startDate: "2025-01-01",
    endDate: "2025-11-28",
    modality: "CONTENCIOSO",
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 60
    },
    discountRules: {
      A: { principal: 65, maxTotalDiscount: 65 },
      B: { principal: 65, maxTotalDiscount: 65 },
      C: { principal: 65, maxTotalDiscount: 65 },
      D: { principal: 65, maxTotalDiscount: 65 }
    },
    eligibility: {
      requiresJudicialProcess: true,
      legalThesis: "Pre\xE7o de Transfer\xEAncia (PRL)"
    },
    notes: "Desconto at\xE9 65% independente de rating. Contribuinte desiste da a\xE7\xE3o judicial."
  },
  // Editais de Contencioso - IRPJ/CSLL Desmutualização
  {
    code: "PGFN-54-2025",
    name: "Edital PGFN n\xBA 54/2025",
    description: "Transa\xE7\xE3o no Contencioso - IRPJ/CSLL sobre ganhos na desmutualiza\xE7\xE3o",
    startDate: "2025-01-01",
    endDate: "2025-12-29",
    modality: "CONTENCIOSO",
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 60
    },
    discountRules: {
      A: { principal: 65, maxTotalDiscount: 65 },
      B: { principal: 65, maxTotalDiscount: 65 },
      C: { principal: 65, maxTotalDiscount: 65 },
      D: { principal: 65, maxTotalDiscount: 65 }
    },
    eligibility: {
      requiresJudicialProcess: true,
      legalThesis: "IRPJ/CSLL - Ganhos na desmutualiza\xE7\xE3o da Bovespa/BM&F"
    },
    notes: "Desconto at\xE9 65% independente de rating. Contribuinte desiste da a\xE7\xE3o judicial."
  },
  // Programa Desenrola Rural
  {
    code: "PGFN-3-2025",
    name: "Edital PGFN n\xBA 3/2025 - Desenrola Rural",
    description: "Programa Desenrola Rural",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    modality: "DESENROLA_RURAL",
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 12,
      maxInstallments: 120
    },
    discountRules: {
      A: { principal: 50, maxTotalDiscount: 50 },
      B: { principal: 50, maxTotalDiscount: 50 },
      C: { principal: 60, maxTotalDiscount: 60 },
      D: { principal: 60, maxTotalDiscount: 60 }
    },
    eligibility: {
      allowedCompanyTypes: ["REGULAR"]
      // Focado em produtores rurais e cooperativas
    },
    notes: "Focado no setor do agroneg\xF3cio. D\xEDvidas inscritas na D\xEDvida Ativa da Uni\xE3o e do FGTS."
  },
  // Programa de Transação Integral (PTI)
  {
    code: "PTI-2025",
    name: "Programa de Transa\xE7\xE3o Integral (PTI)",
    description: "Modalidade PRJ - Potencial Razo\xE1vel de Recupera\xE7\xE3o do Cr\xE9dito Judicializado",
    startDate: "2025-09-01",
    endDate: "2025-12-31",
    modality: "PTI",
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 84
    },
    discountRules: {
      A: { principal: 50, maxTotalDiscount: 50 },
      B: { principal: 50, maxTotalDiscount: 50 },
      C: { principal: 60, maxTotalDiscount: 60 },
      D: { principal: 60, maxTotalDiscount: 60 }
    },
    eligibility: {
      requiresJudicialProcess: true
      // Créditos ainda não inscritos em dívida ativa (em discussão judicial)
    },
    notes: "Lan\xE7ado em setembro/2025. Permite transacionar cr\xE9ditos ainda n\xE3o inscritos em d\xEDvida ativa."
  }
];

// ../../packages/shared/src/schemas/user.schema.ts
var UserSchema = external_exports.object({
  id: external_exports.string().uuid(),
  email: external_exports.string().email(),
  name: external_exports.string().min(3),
  tenant_id: external_exports.string().uuid().nullable(),
  role: external_exports.string(),
  created_at: external_exports.date(),
  updated_at: external_exports.date()
});
var CreateUserSchema = external_exports.object({
  email: external_exports.string().email(),
  name: external_exports.string().min(3),
  password: external_exports.string().min(8),
  role: external_exports.string().optional()
});
var UpdateUserSchema = external_exports.object({
  name: external_exports.string().min(3).optional(),
  email: external_exports.string().email().optional(),
  role: external_exports.string().optional(),
  status: external_exports.enum(["active", "inactive"]).optional()
});

// ../../packages/shared/src/schemas/company.schema.ts
var CompanySchema = external_exports.object({
  id: external_exports.string().uuid(),
  name: external_exports.string().min(3),
  domain: external_exports.string().optional(),
  cnpj: external_exports.string().optional(),
  legal_name: external_exports.string().optional(),
  trade_name: external_exports.string().optional(),
  email: external_exports.string().email().optional(),
  phone: external_exports.string().optional(),
  contact_name: external_exports.string().optional(),
  contact_email: external_exports.string().email().optional(),
  contact_phone: external_exports.string().optional(),
  tax_regime: external_exports.enum(["simples_nacional", "lucro_presumido", "lucro_real", "outros"]).optional(),
  state_registration: external_exports.string().optional(),
  municipal_registration: external_exports.string().optional(),
  cnae: external_exports.string().optional(),
  zip_code: external_exports.string().optional(),
  address_street: external_exports.string().optional(),
  address_number: external_exports.string().optional(),
  address_complement: external_exports.string().optional(),
  address_neighborhood: external_exports.string().optional(),
  address_city: external_exports.string().optional(),
  address_state: external_exports.string().optional(),
  notes: external_exports.string().optional(),
  created_at: external_exports.date(),
  updated_at: external_exports.date()
});
var CreateCompanySchema = external_exports.object({
  name: external_exports.string().min(3),
  domain: external_exports.string().optional(),
  cnpj: external_exports.string().min(14).max(18).optional(),
  legal_name: external_exports.string().optional(),
  trade_name: external_exports.string().optional(),
  email: external_exports.string().email().optional(),
  phone: external_exports.string().optional(),
  contact_name: external_exports.string().optional(),
  contact_email: external_exports.string().email().optional(),
  contact_phone: external_exports.string().optional(),
  tax_regime: external_exports.enum(["simples_nacional", "lucro_presumido", "lucro_real", "outros"]).optional(),
  state_registration: external_exports.string().optional(),
  municipal_registration: external_exports.string().optional(),
  cnae: external_exports.string().optional(),
  zip_code: external_exports.string().optional(),
  address_street: external_exports.string().optional(),
  address_number: external_exports.string().optional(),
  address_complement: external_exports.string().optional(),
  address_neighborhood: external_exports.string().optional(),
  address_city: external_exports.string().optional(),
  address_state: external_exports.string().max(2).optional(),
  notes: external_exports.string().optional()
});
var UpdateCompanySchema = CreateCompanySchema.partial();

// ../../packages/shared/src/schemas/auth.schema.ts
var LoginSchema = external_exports.object({
  email: external_exports.string().email(),
  password: external_exports.string().min(8)
});
var cnpjDigits = external_exports.string().transform((v) => v.replace(/\D/g, ""));
var RegisterSchema = external_exports.object({
  /** Dados do escritório de contabilidade (tenant) */
  company: external_exports.object({
    legal_name: external_exports.string().min(3, "Raz\xE3o social deve ter no m\xEDnimo 3 caracteres"),
    trade_name: external_exports.string().max(255).optional().transform((s) => s?.trim() || void 0),
    cnpj: cnpjDigits.pipe(external_exports.string().length(14, "CNPJ deve ter 14 d\xEDgitos")),
    phone: external_exports.string().max(20).optional()
  }),
  /** Usuário responsável (admin do tenant) */
  user: external_exports.object({
    name: external_exports.string().min(3, "Nome deve ter no m\xEDnimo 3 caracteres"),
    email: external_exports.string().email("E-mail inv\xE1lido"),
    password: external_exports.string().min(8, "Senha deve ter no m\xEDnimo 8 caracteres")
  })
});
var RefreshTokenSchema = external_exports.object({
  token: external_exports.string().min(1)
});
var LogoutSchema = external_exports.object({
  token: external_exports.string().min(1)
});

// ../../packages/shared/src/schemas/module.schema.ts
var ActivateModuleSchema = external_exports.object({
  moduleId: external_exports.string().uuid(),
  enabledUntil: external_exports.date().optional()
});
var DeactivateModuleSchema = external_exports.object({
  moduleId: external_exports.string().uuid()
});
var AddModuleToPlanSchema = external_exports.object({
  moduleId: external_exports.string().uuid(),
  isDefault: external_exports.boolean().default(true)
});
var PlanIdParamSchema = external_exports.object({
  planId: external_exports.string().uuid()
});

// ../../packages/shared/src/schemas/subscription.schema.ts
var CreateSubscriptionSchema = external_exports.object({
  planId: external_exports.string().uuid()
});
var UpdateSubscriptionSchema = external_exports.object({
  planId: external_exports.string().uuid().optional(),
  status: external_exports.enum(["active", "past_due", "canceled", "trialing"]).optional()
});
var CancelSubscriptionSchema = external_exports.object({
  reason: external_exports.string().optional()
});

// ../../packages/shared/src/schemas/plan.schema.ts
var PlanSchema = external_exports.object({
  id: external_exports.string().uuid(),
  name: external_exports.string().min(3),
  max_users: external_exports.number().min(1),
  max_clients: external_exports.number().min(0).optional(),
  price: external_exports.number().min(0),
  billing_cycle: external_exports.enum(["monthly", "yearly"]),
  features: external_exports.array(external_exports.string()),
  is_custom: external_exports.boolean().optional(),
  is_managed: external_exports.boolean().optional(),
  created_at: external_exports.date(),
  updated_at: external_exports.date()
});
var CreatePlanSchema = external_exports.object({
  name: external_exports.string().min(3),
  maxUsers: external_exports.number().min(1),
  maxClients: external_exports.number().min(0).optional(),
  price: external_exports.number().min(0),
  billingCycle: external_exports.enum(["monthly", "yearly"]),
  features: external_exports.array(external_exports.string()),
  isCustom: external_exports.boolean().optional(),
  isManaged: external_exports.boolean().optional()
});
var UpdatePlanSchema = external_exports.object({
  name: external_exports.string().min(3).optional(),
  maxUsers: external_exports.number().min(1).optional(),
  maxClients: external_exports.number().min(0).optional(),
  price: external_exports.number().min(0).optional(),
  billingCycle: external_exports.enum(["monthly", "yearly"]).optional(),
  features: external_exports.array(external_exports.string()).optional(),
  isCustom: external_exports.boolean().optional(),
  isManaged: external_exports.boolean().optional(),
  status: external_exports.enum(["active", "inactive"]).optional()
});

// ../../packages/shared/src/schemas/client.schema.ts
var CreateClientSchema = external_exports.object({
  name: external_exports.string().min(3),
  cnpj: external_exports.string().min(14).max(18),
  email: external_exports.string().email().optional(),
  tax_regime: external_exports.enum(["simples_nacional", "lucro_presumido", "lucro_real", "outros"]).optional(),
  cnae: external_exports.string().max(10).optional(),
  state_registration: external_exports.string().max(50).optional(),
  municipal_registration: external_exports.string().max(50).optional(),
  notes: external_exports.string().optional()
});
var UpdateClientSchema = external_exports.object({
  name: external_exports.string().min(3).optional(),
  cnpj: external_exports.string().min(14).max(18).optional(),
  email: external_exports.string().email().optional(),
  status: external_exports.enum(["active", "inactive"]).optional(),
  tax_regime: external_exports.enum(["simples_nacional", "lucro_presumido", "lucro_real", "outros"]).optional(),
  cnae: external_exports.string().max(10).optional(),
  state_registration: external_exports.string().max(50).optional(),
  municipal_registration: external_exports.string().max(50).optional(),
  notes: external_exports.string().optional()
});

// ../../packages/shared/src/schemas/fiscal-file.schema.ts
var UploadFiscalFileSchema = external_exports.object({
  client_id: external_exports.string().uuid(),
  competence: external_exports.string().regex(/^\d{4}-\d{2}$/, "Competence must be in format YYYY-MM"),
  file_type: external_exports.enum(["sped", "ecd", "pgdas", "xml", "pdf", "txt", "outros"])
});
var UpdateFiscalFileStatusSchema = external_exports.object({
  status: external_exports.enum(["uploaded", "processing", "processed", "error"]).optional(),
  processing_error: external_exports.string().nullable().optional(),
  metadata: external_exports.record(external_exports.any()).nullable().optional()
});
var ListFiscalFilesQuerySchema = external_exports.object({
  client_id: external_exports.string().uuid().optional(),
  competence: external_exports.string().regex(/^\d{4}-\d{2}$/, "Competence must be in format YYYY-MM").optional(),
  status: external_exports.enum(["uploaded", "processing", "processed", "error"]).optional(),
  page: external_exports.coerce.number().int().positive().default(1),
  limit: external_exports.coerce.number().int().positive().max(100).default(20)
});
var FiscalFileIdParamSchema = external_exports.object({
  id: external_exports.string().uuid()
});
var ClientIdParamSchema = external_exports.object({
  client_id: external_exports.string().uuid()
});
var DownloadFiscalFileQuerySchema = external_exports.object({
  expires_in: external_exports.coerce.number().int().positive().max(86400).default(3600)
  // Máximo 24 horas
});

// ../../packages/shared/src/schemas/billing.schema.ts
var StripeWebhookSchema = external_exports.object({
  id: external_exports.string(),
  type: external_exports.string(),
  data: external_exports.object({
    object: external_exports.any()
    // Objeto pode variar dependendo do tipo de evento
  }),
  created: external_exports.number().optional()
});
var BillingPortalSessionSchema = external_exports.object({
  returnUrl: external_exports.string().url()
});
var BillingCheckoutSessionSchema = external_exports.object({
  planId: external_exports.string().uuid(),
  successUrl: external_exports.string().url(),
  cancelUrl: external_exports.string().url()
});

// ../../packages/shared/src/schemas/rating-validator.schema.ts
function round2(value) {
  return Math.round(value * 100) / 100;
}
function deepRoundNumbers(value) {
  if (value === null) return null;
  if (typeof value === "number") return round2(value);
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(deepRoundNumbers);
  if (typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = deepRoundNumbers(value[key]);
    }
    return out;
  }
  return value;
}
var numberRounded = external_exports.number().transform(round2);
var monetaryValue = numberRounded.pipe(external_exports.number().nonnegative().multipleOf(0.01)).or(external_exports.literal(0));
var AtivoCirculanteSchema = external_exports.object({
  caixa_equivalentes: monetaryValue.default(0),
  aplicacoes_financeiras: monetaryValue.default(0),
  contas_receber: monetaryValue.default(0),
  estoques: monetaryValue.default(0),
  tributos_recuperar: monetaryValue.default(0),
  despesas_antecipadas: monetaryValue.default(0),
  outros_ativos_circulantes: monetaryValue.default(0)
});
var RealizavelLongoPrazoSchema = external_exports.object({
  contas_receber_lp: monetaryValue.default(0),
  emprestimos_concedidos: monetaryValue.default(0),
  outros_creditos_lp: monetaryValue.default(0)
});
var AtivoNaoCirculanteSchema = external_exports.object({
  realizavel_longo_prazo: RealizavelLongoPrazoSchema.default({}),
  investimentos: monetaryValue.default(0),
  imobilizado: monetaryValue.default(0),
  intangivel: monetaryValue.default(0),
  outros_ativos_nao_circulantes: monetaryValue.default(0)
});
var PassivoCirculanteSchema = external_exports.object({
  fornecedores: monetaryValue.default(0),
  emprestimos_financiamentos: monetaryValue.default(0),
  obrigacoes_trabalhistas: monetaryValue.default(0),
  tributos_pagar: monetaryValue.default(0),
  contas_pagar: monetaryValue.default(0),
  provisoes: monetaryValue.default(0),
  outros_passivos_circulantes: monetaryValue.default(0)
});
var PassivoNaoCirculanteSchema = external_exports.object({
  emprestimos_financiamentos_lp: monetaryValue.default(0),
  obrigacoes_trabalhistas_lp: monetaryValue.default(0),
  tributos_pagar_lp: monetaryValue.default(0),
  provisoes_lp: monetaryValue.default(0),
  outros_passivos_nao_circulantes: monetaryValue.default(0)
});
var PatrimonioLiquidoSchema = external_exports.object({
  capital_social: monetaryValue.default(0),
  reservas_capital: monetaryValue.default(0),
  reservas_lucros: monetaryValue.default(0),
  lucros_prejuizos_acumulados: numberRounded.pipe(external_exports.number().multipleOf(0.01)),
  // Pode ser negativo
  outros_ajustes: monetaryValue.default(0)
});
var signedMonetary = numberRounded.pipe(external_exports.number().multipleOf(0.01));
var DRESchema = external_exports.object({
  receita_bruta: signedMonetary.default(0),
  deducoes_vendas: signedMonetary.default(0),
  receita_liquida: signedMonetary.optional(),
  // Calculado automaticamente se não fornecido
  custos_vendas: signedMonetary.default(0),
  despesas_operacionais: signedMonetary.default(0),
  resultado_financeiro: signedMonetary.default(0),
  outros_resultados: signedMonetary.default(0)
}).optional();
var SimulateRatingSchemaRaw = external_exports.object({
  // Balanço Patrimonial (campos granulares)
  ativo_circulante: AtivoCirculanteSchema,
  ativo_nao_circulante: AtivoNaoCirculanteSchema,
  passivo_circulante: PassivoCirculanteSchema,
  passivo_nao_circulante: PassivoNaoCirculanteSchema,
  patrimonio_liquido: PatrimonioLiquidoSchema,
  // Totais diretos (opcionais - quando o sistema já possui o valor calculado)
  ativo_circulante_total: monetaryValue.optional(),
  realizavel_longo_prazo_total: monetaryValue.optional(),
  passivo_circulante_total: monetaryValue.optional(),
  passivo_nao_circulante_total: monetaryValue.optional(),
  patrimonio_liquido_total: monetaryValue.optional(),
  // DRE (opcional)
  dre: DRESchema,
  // Metadados
  competencia: external_exports.string().regex(/^\d{4}-\d{2}$/, "Compet\xEAncia deve ser no formato AAAA-MM (ex.: 2025-01)"),
  client_id: external_exports.union([external_exports.string().uuid(), external_exports.literal("")]).optional().transform((v) => v === "" || v == null ? void 0 : v),
  rating_real: external_exports.enum(["A", "B", "C", "D"]).optional(),
  save_simulation: external_exports.boolean().optional().default(false)
});
var SimulateRatingSchema = external_exports.preprocess(
  (data) => data != null && typeof data === "object" ? deepRoundNumbers(data) : data,
  SimulateRatingSchemaRaw
);
var RatingSimulationResponseSchema = external_exports.object({
  // Valores agregados calculados
  calculated_values: external_exports.object({
    ativo_circulante_total: external_exports.number(),
    realizavel_longo_prazo_total: external_exports.number(),
    passivo_circulante_total: external_exports.number(),
    passivo_nao_circulante_total: external_exports.number(),
    patrimonio_liquido_total: external_exports.number(),
    ativo_total: external_exports.number(),
    passivo_total: external_exports.number()
  }),
  // Indicadores calculados
  indicators: external_exports.object({
    liquidez_corrente: external_exports.number(),
    liquidez_geral: external_exports.number(),
    solvencia: external_exports.number()
  }),
  // Ratings
  rating_estimado: external_exports.enum(["A", "B", "C", "D"]),
  rating_real: external_exports.enum(["A", "B", "C", "D"]).optional(),
  // Análise
  has_discrepancy: external_exports.boolean(),
  discrepancy_details: external_exports.object({
    rating_estimado: external_exports.enum(["A", "B", "C", "D"]),
    rating_real: external_exports.enum(["A", "B", "C", "D"]),
    message: external_exports.string()
  }).optional(),
  // Metadados
  validation_id: external_exports.string().uuid().optional(),
  // ID se foi salvo
  is_simulation: external_exports.boolean()
});
var ListRatingValidationsQuerySchema = external_exports.object({
  client_id: external_exports.string().uuid().optional(),
  competence: external_exports.string().regex(/^\d{4}-\d{2}$/, "Competence must be in format YYYY-MM").optional(),
  is_simulation: external_exports.coerce.boolean().optional(),
  rating_estimado: external_exports.enum(["A", "B", "C", "D"]).optional(),
  page: external_exports.coerce.number().int().positive().default(1),
  limit: external_exports.coerce.number().int().positive().max(100).default(20)
});
var RatingValidationIdParamSchema = external_exports.object({
  id: external_exports.string().uuid()
});
var RatingValidatorFiscalFileIdParamSchema = external_exports.object({
  fiscal_file_id: external_exports.string().uuid()
});
var ValidateFromDataSchema = external_exports.object({
  competence: external_exports.string().regex(/^\d{4}-\d{2}$/, "Competence must be in format YYYY-MM"),
  rating_real: external_exports.enum(["A", "B", "C", "D"]).optional()
});

// ../../packages/shared/src/schemas/ecd-extracted.schema.ts
var optionalNum = external_exports.number().optional();
var optionalStr = external_exports.string().optional();
var EcdDocumentoInfoSchema = external_exports.object({
  tipo: optionalStr,
  versao_leiaute: optionalStr,
  natureza_livro: optionalStr,
  numero_ordem: optionalNum,
  periodo_escrituracao: external_exports.object({
    inicio: external_exports.string().optional(),
    fim: external_exports.string().optional()
  }).optional(),
  data_autenticacao: optionalStr,
  hash_arquivo: optionalStr
});
var EcdSignatarioSchema = external_exports.object({
  nome: optionalStr,
  qualificacao: optionalStr,
  cpf: optionalStr,
  responsavel_legal: external_exports.boolean().optional()
});
var EcdEntidadeSchema = external_exports.object({
  nome: optionalStr,
  cnpj: optionalStr,
  signatarios: external_exports.array(EcdSignatarioSchema).optional()
});
var EcdAtivoCirculanteSchema = external_exports.object({
  total: optionalNum,
  contas: external_exports.record(external_exports.string(), external_exports.number()).optional()
});
var EcdAtivoNaoCirculanteSchema = external_exports.object({
  total: optionalNum,
  realizavel_a_longo_prazo: optionalNum,
  emprestimos_socios: optionalNum,
  depositos_judiciais: optionalNum,
  investimentos: optionalNum,
  imobilizado: optionalNum,
  intangivel: optionalNum,
  outros: optionalNum
}).passthrough();
var EcdPassivoCirculanteSchema = external_exports.object({
  total: optionalNum,
  fornecedores: optionalNum,
  parcelamento_iptu: optionalNum,
  emprestimos_financiamentos: optionalNum,
  obrigacoes_trabalhistas: optionalNum,
  tributos_pagar: optionalNum,
  contas_pagar: optionalNum,
  provisoes: optionalNum,
  outros: optionalNum
}).passthrough();
var EcdPassivoNaoCirculanteSchema = external_exports.object({
  total: optionalNum,
  obrigacoes_tributarias_longo_prazo: optionalNum,
  obrigacoes_coligadas: optionalNum,
  provisoes: optionalNum,
  emprestimos_financiamentos_lp: optionalNum,
  outros: optionalNum
}).passthrough();
var EcdPatrimonioLiquidoSchema = external_exports.object({
  total: optionalNum,
  capital_social: optionalNum,
  reservas: optionalNum,
  reservas_capital: optionalNum,
  reservas_lucros: optionalNum,
  prejuizos_acumulados: optionalNum,
  lucros_prejuizos_acumulados: optionalNum,
  outros_ajustes: optionalNum
}).passthrough();
var EcdDreSchema = external_exports.object({
  receita_liquida: optionalNum,
  receita_bruta: optionalNum,
  deducoes_vendas: optionalNum,
  lucro_bruto: optionalNum,
  custos_vendas: optionalNum,
  despesas_operacionais: optionalNum,
  despesas_financeiras: optionalNum,
  resultado_liquido_periodo: optionalNum,
  resultado_financeiro: optionalNum,
  outros_resultados: optionalNum
}).passthrough();
var EcdDemonstrativoContabilSchema = external_exports.object({
  balanco_patrimonial: external_exports.object({
    ativo: external_exports.object({
      circulante: EcdAtivoCirculanteSchema.optional(),
      nao_circulante: EcdAtivoNaoCirculanteSchema.optional(),
      total_geral: optionalNum
    }).optional(),
    passivo: external_exports.object({
      circulante: EcdPassivoCirculanteSchema.optional(),
      nao_circulante: EcdPassivoNaoCirculanteSchema.optional()
    }).optional(),
    patrimonio_liquido: EcdPatrimonioLiquidoSchema.optional()
  }).optional(),
  dre: EcdDreSchema.optional()
});
var EcdExtractedSchema = external_exports.object({
  documento_info: EcdDocumentoInfoSchema.optional(),
  entidade: EcdEntidadeSchema.optional(),
  demonstrativo_contabil: EcdDemonstrativoContabilSchema.optional()
});
function n(v) {
  if (v == null || typeof v !== "number" || Number.isNaN(v)) return 0;
  return v;
}
function round22(value) {
  return Math.round(value * 100) / 100;
}
function ecdExtractedToSimulateRatingInput(ecd, competence) {
  const bp = ecd.demonstrativo_contabil?.balanco_patrimonial;
  const at = bp?.ativo;
  const ac = at?.circulante;
  const anc = at?.nao_circulante;
  const pass = bp?.passivo;
  const pc = pass?.circulante;
  const pnc = pass?.nao_circulante;
  const pl = bp?.patrimonio_liquido;
  const dre = ecd.demonstrativo_contabil?.dre;
  const acTotal = n(ac?.total);
  const acContas = ac?.contas ?? {};
  const ancTotal = n(anc?.total);
  const rlp = n(anc?.realizavel_a_longo_prazo) + n(anc?.emprestimos_socios) + n(anc?.depositos_judiciais);
  const pcTotal = n(pc?.total);
  const pncTotal = n(pnc?.total);
  let comp = competence ?? "";
  if (!comp && ecd.documento_info?.periodo_escrituracao?.fim) {
    const fim = ecd.documento_info.periodo_escrituracao.fim;
    comp = fim.slice(0, 7);
  }
  if (!comp) comp = "";
  const round = round22;
  return {
    ativo_circulante: {
      caixa_equivalentes: round(n(acContas["caixa_equivalentes"] ?? acContas["caixa"])),
      aplicacoes_financeiras: round(n(acContas["aplicacoes_financeiras"] ?? acContas["aplicacoes"])),
      contas_receber: round(n(acContas["contas_receber"] ?? acContas["clientes"])),
      estoques: round(n(acContas["estoques"])),
      tributos_recuperar: round(n(acContas["tributos_recuperar"] ?? acContas["tributos_a_recuperar"])),
      despesas_antecipadas: round(n(acContas["despesas_antecipadas"])),
      outros_ativos_circulantes: round(
        acTotal > 0 ? Math.max(
          0,
          acTotal - n(acContas["caixa"]) - n(acContas["caixa_equivalentes"]) - n(acContas["aplicacoes"]) - n(acContas["aplicacoes_financeiras"]) - n(acContas["clientes"]) - n(acContas["contas_receber"]) - n(acContas["estoques"]) - n(acContas["tributos_recuperar"]) - n(acContas["tributos_a_recuperar"]) - n(acContas["despesas_antecipadas"]) - n(acContas["outros_creditos"])
        ) : n(acContas["outros_creditos"] ?? acContas["outros_ativos_circulantes"])
      )
    },
    ativo_nao_circulante: {
      realizavel_longo_prazo: {
        contas_receber_lp: round(rlp * 0.5),
        emprestimos_concedidos: round(n(anc?.emprestimos_socios)),
        outros_creditos_lp: round(Math.max(0, rlp - n(anc?.emprestimos_socios)))
      },
      investimentos: round(n(anc?.investimentos)),
      imobilizado: round(n(anc?.imobilizado)),
      intangivel: round(n(anc?.intangivel)),
      outros_ativos_nao_circulantes: round(
        Math.max(0, ancTotal - rlp - n(anc?.investimentos) - n(anc?.imobilizado) - n(anc?.intangivel))
      )
    },
    passivo_circulante: {
      fornecedores: round(n(pc?.fornecedores)),
      emprestimos_financiamentos: round(n(pc?.emprestimos_financiamentos)),
      obrigacoes_trabalhistas: round(n(pc?.obrigacoes_trabalhistas)),
      tributos_pagar: round(n(pc?.tributos_pagar)),
      contas_pagar: round(n(pc?.contas_pagar)),
      provisoes: round(n(pc?.provisoes)),
      outros_passivos_circulantes: round(
        Math.max(
          0,
          pcTotal - n(pc?.fornecedores) - n(pc?.parcelamento_iptu) - n(pc?.emprestimos_financiamentos) - n(pc?.obrigacoes_trabalhistas) - n(pc?.tributos_pagar) - n(pc?.contas_pagar) - n(pc?.provisoes)
        ) || n(pc?.parcelamento_iptu)
      )
    },
    passivo_nao_circulante: {
      emprestimos_financiamentos_lp: round(n(pnc?.emprestimos_financiamentos_lp)),
      obrigacoes_trabalhistas_lp: round(n(pnc?.obrigacoes_trabalhistas_lp)),
      tributos_pagar_lp: round(n(pnc?.obrigacoes_tributarias_longo_prazo ?? pnc?.tributos_pagar_lp)),
      provisoes_lp: round(n(pnc?.provisoes)),
      outros_passivos_nao_circulantes: round(
        Math.max(
          0,
          pncTotal - n(pnc?.obrigacoes_tributarias_longo_prazo) - n(pnc?.tributos_pagar_lp) - n(pnc?.obrigacoes_coligadas) - n(pnc?.provisoes) - n(pnc?.emprestimos_financiamentos_lp)
        ) || n(pnc?.obrigacoes_coligadas)
      )
    },
    patrimonio_liquido: {
      capital_social: round(n(pl?.capital_social)),
      reservas_capital: round(n(pl?.reservas_capital ?? pl?.reservas)),
      reservas_lucros: round(n(pl?.reservas_lucros)),
      lucros_prejuizos_acumulados: round(n(pl?.prejuizos_acumulados ?? pl?.lucros_prejuizos_acumulados)),
      outros_ajustes: round(n(pl?.outros_ajustes))
    },
    competencia: comp,
    dre: dre ? {
      receita_bruta: round(n(dre.receita_bruta)),
      deducoes_vendas: round(n(dre.deducoes_vendas)),
      receita_liquida: round(n(dre.receita_liquida)) || void 0,
      custos_vendas: round(n(dre.custos_vendas)),
      despesas_operacionais: round(n(dre.despesas_operacionais)),
      resultado_financeiro: round(
        n(dre.resultado_financeiro) !== 0 ? n(dre.resultado_financeiro) : n(dre.despesas_financeiras) !== 0 ? -Math.abs(n(dre.despesas_financeiras)) : 0
      ),
      outros_resultados: round(n(dre.outros_resultados))
    } : void 0
  };
}

// ../../packages/shared/src/schemas/edital.schema.ts
var TransactionModalitySchema = external_exports.enum([
  "CAPAG",
  "PEQUENO_VALOR",
  "CONTENCIOSO",
  "IRRECUPERAVEIS",
  "DESENROLA_RURAL",
  "PTI"
]);
var RatingSchema = external_exports.enum(["A", "B", "C", "D"]);
var ProgressiveDiscountSchema = external_exports.object({
  maxMonths: external_exports.number().int().positive(),
  discount: external_exports.number().min(0).max(100)
});
var DiscountRulesSchema = external_exports.object({
  principal: external_exports.number().min(0).max(100).optional(),
  interest: external_exports.number().min(0).max(100).optional(),
  fees: external_exports.number().min(0).max(100).optional(),
  charges: external_exports.number().min(0).max(100).optional(),
  maxTotalDiscount: external_exports.number().min(0).max(100).optional(),
  progressive: external_exports.array(ProgressiveDiscountSchema).optional()
});
var PaymentTermsSchema = external_exports.object({
  entryPercent: external_exports.number().min(0).max(100),
  entryInstallments: external_exports.number().int().positive(),
  maxInstallments: external_exports.number().int().positive(),
  minInstallmentAmount: external_exports.number().int().nonnegative().optional()
});
var EligibilityCriteriaSchema = external_exports.object({
  maxAmount: external_exports.number().int().nonnegative().optional(),
  // em centavos
  minAmount: external_exports.number().int().nonnegative().optional(),
  // em centavos
  requiresRating: external_exports.boolean().optional(),
  allowedRatings: external_exports.array(RatingSchema).optional(),
  allowedCompanyTypes: external_exports.array(external_exports.enum(["REGULAR", "MEI", "ME", "EPP", "RECUPERACAO_JUDICIAL", "SANTA_CASA"])).optional(),
  minYearsInscribed: external_exports.number().int().nonnegative().optional(),
  requiresJudicialProcess: external_exports.boolean().optional(),
  legalThesis: external_exports.string().optional()
});
var DiscountRulesByRatingSchema = external_exports.record(RatingSchema, DiscountRulesSchema);
var EditalBaseSchema = external_exports.object({
  code: external_exports.string().min(1).max(100),
  name: external_exports.string().min(1).max(255),
  description: external_exports.string().optional(),
  start_date: external_exports.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"),
  end_date: external_exports.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"),
  extended: external_exports.boolean().optional().default(false),
  modality: TransactionModalitySchema,
  payment_terms: PaymentTermsSchema,
  discount_rules: DiscountRulesByRatingSchema,
  eligibility: EligibilityCriteriaSchema,
  notes: external_exports.string().optional(),
  official_link: external_exports.string().url().optional().or(external_exports.literal("")),
  active: external_exports.boolean().optional().default(true)
});
var CreateEditalSchema = EditalBaseSchema.refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate >= startDate;
}, {
  message: "end_date must be greater than or equal to start_date",
  path: ["end_date"]
});
var UpdateEditalSchema = EditalBaseSchema.partial().extend({
  code: external_exports.string().min(1).max(100).optional()
  // Código não pode ser alterado
});
var ListEditaisQuerySchema = external_exports.object({
  modality: TransactionModalitySchema.optional(),
  active: external_exports.coerce.boolean().optional(),
  page: external_exports.coerce.number().int().positive().default(1),
  limit: external_exports.coerce.number().int().positive().max(100).default(20)
});
var EditalIdParamSchema = external_exports.object({
  id: external_exports.string().uuid()
});

// ../../packages/shared/src/schemas/judicial-process.schema.ts
var LegalThesisSchema = external_exports.enum([
  "IPI_PRACA",
  // IPI - Conceito de Praça entre empresas interdependentes
  "PRL",
  // Preço de Transferência (PRL)
  "IRPJ_CSLL_DESMUTUALIZACAO"
  // IRPJ/CSLL sobre ganhos na desmutualização
]);
var CreateJudicialProcessSchema = external_exports.object({
  client_id: external_exports.string().uuid(),
  process_number: external_exports.string().min(1).max(50),
  court: external_exports.string().max(255).optional(),
  legal_thesis: LegalThesisSchema,
  case_value: external_exports.number().nonnegative().optional(),
  start_date: external_exports.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // YYYY-MM-DD
  status: external_exports.enum(["active", "suspended", "closed"]).default("active"),
  notes: external_exports.string().optional()
});
var UpdateJudicialProcessSchema = external_exports.object({
  process_number: external_exports.string().min(1).max(50).optional(),
  court: external_exports.string().max(255).optional(),
  legal_thesis: LegalThesisSchema.optional(),
  case_value: external_exports.number().nonnegative().optional(),
  start_date: external_exports.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: external_exports.enum(["active", "suspended", "closed"]).optional(),
  notes: external_exports.string().optional()
});

// ../../packages/shared/src/schemas/simulador-in-2306.schema.ts
var monetaryValue2 = external_exports.number().nonnegative().multipleOf(0.01).or(external_exports.literal(0));
var ReceitasTrimestreSchema = external_exports.object({
  produtos_mercadorias: monetaryValue2.optional().default(0),
  servicos: monetaryValue2.optional().default(0),
  servicos_favorecida: monetaryValue2.optional().default(0),
  servicos_hospitalares: monetaryValue2.optional().default(0),
  demais_receitas: monetaryValue2.optional().default(0)
});
var DeducoesTrimestreSchema = external_exports.object({
  pis_cofins_zero: monetaryValue2.optional().default(0),
  icms_destacado: monetaryValue2.optional().default(0)
}).optional().default({});
var RetencoesTrimestreSchema = external_exports.object({
  irrf: monetaryValue2.optional().default(0),
  orgaos_publicos: monetaryValue2.optional().default(0)
}).optional().default({});
var SimulateTributarioIN2306InputSchema = external_exports.object({
  ano: external_exports.number().int().min(2020).max(2030),
  trimestres: external_exports.array(ReceitasTrimestreSchema).length(4),
  deducoes_trimestrais: external_exports.array(DeducoesTrimestreSchema).length(4).optional(),
  retencoes_trimestrais: external_exports.array(RetencoesTrimestreSchema).length(4).optional(),
  aplicar_equiparacao_hospitalar: external_exports.boolean().optional().default(false),
  client_id: external_exports.string().uuid().optional(),
  save_simulation: external_exports.boolean().optional().default(false),
  title: external_exports.string().max(255).optional()
});
var SimulateIN2306InputSchema = external_exports.object({
  competence: external_exports.string().regex(/^\d{4}-\d{2}$/, "Compet\xEAncia deve ser YYYY-MM"),
  client_id: external_exports.string().uuid().optional(),
  save_simulation: external_exports.boolean().optional().default(false),
  title: external_exports.string().max(255).optional(),
  valor_total: monetaryValue2.optional().default(0),
  valor_entrada: monetaryValue2.optional().default(0),
  numero_parcelas: external_exports.number().int().min(1).max(360).optional().default(1),
  tipo_calculo: external_exports.enum(["parcelamento", "refinanciamento", "simulacao"]).optional().default("simulacao"),
  opcoes: external_exports.record(external_exports.unknown()).optional()
});
var CenarioTrimestreSchema = external_exports.object({
  trimestre: external_exports.number().int().min(1).max(4),
  receita_bruta: external_exports.number(),
  receita_excedente_limite: external_exports.number().optional(),
  base_calculo_irpj: external_exports.number(),
  base_calculo_csll: external_exports.number(),
  irpj: external_exports.number(),
  irpj_adicional: external_exports.number().optional(),
  csll: external_exports.number(),
  irpj_a_rec: external_exports.number(),
  csll_a_rec: external_exports.number(),
  pis_a_rec: external_exports.number().optional(),
  cofins_a_rec: external_exports.number().optional()
});
var CenarioAnualSchema = external_exports.object({
  receita_bruta_total: external_exports.number(),
  irpj_total: external_exports.number(),
  irpj_adicional_total: external_exports.number().optional(),
  csll_total: external_exports.number(),
  irpj_a_rec_total: external_exports.number(),
  csll_a_rec_total: external_exports.number(),
  pis_a_rec_total: external_exports.number().optional(),
  cofins_a_rec_total: external_exports.number().optional(),
  trimestres: external_exports.array(CenarioTrimestreSchema)
});
var SimuladorTributarioResponseSchema = external_exports.object({
  ano: external_exports.number(),
  cenario_2025: CenarioAnualSchema,
  cenario_2026: CenarioAnualSchema,
  cenario_equiparacao: CenarioAnualSchema.optional(),
  comparativo: external_exports.object({
    imposto_a_maior_2026_vs_2025: external_exports.number(),
    imposto_a_maior_2026_vs_equiparacao: external_exports.number().optional(),
    economia_equiparacao_vs_2026: external_exports.number().optional()
  }),
  memoria_calculo: external_exports.record(external_exports.unknown()).optional()
});
var IN2306SimulationResponseSchema = external_exports.object({
  simulation_id: external_exports.string().uuid().optional(),
  input_data: external_exports.record(external_exports.unknown()),
  result_data: external_exports.object({
    valor_total: external_exports.number(),
    valor_entrada: external_exports.number(),
    valor_financiado: external_exports.number(),
    numero_parcelas: external_exports.number(),
    valor_parcela: external_exports.number().optional(),
    parcelas: external_exports.array(external_exports.object({
      numero: external_exports.number(),
      valor: external_exports.number(),
      vencimento: external_exports.string().optional()
    })).optional(),
    resumo: external_exports.record(external_exports.unknown()).optional()
  }).or(external_exports.record(external_exports.unknown())),
  is_simulation: external_exports.boolean()
});
var ListIN2306SimulationsQuerySchema = external_exports.object({
  client_id: external_exports.string().uuid().optional(),
  competence: external_exports.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: external_exports.coerce.number().int().positive().default(1),
  limit: external_exports.coerce.number().int().positive().max(100).default(20)
});
var IN2306SimulationIdParamSchema = external_exports.object({
  id: external_exports.string().uuid()
});

// ../../packages/shared/src/schemas/irpf-alta-renda.schema.ts
var monetaryValue3 = external_exports.number().nonnegative().multipleOf(0.01).or(external_exports.literal(0));
var ContribuinteSchema = external_exports.object({
  nome: external_exports.string().min(1, "Nome \xE9 obrigat\xF3rio").max(255),
  cpf: external_exports.string().min(11, "CPF inv\xE1lido").max(14)
});
var RendimentoPJSchema = external_exports.object({
  fonte: external_exports.string().max(255).optional(),
  cnpj: external_exports.string().max(18).optional(),
  valor: monetaryValue3
});
var RendimentoPFAluguelSchema = external_exports.object({
  mes: external_exports.string().max(20).optional(),
  valor: monetaryValue3
});
var RendimentoIsentoDividendoSchema = external_exports.object({
  cnpj_fonte: external_exports.string().max(18).optional(),
  nome_fonte: external_exports.string().max(255).optional(),
  valor: monetaryValue3,
  codigo: external_exports.enum(["09", "13"]).optional()
});
var OutrosRendimentosSchema = external_exports.object({
  aplicacoes_financeiras_exclusiva: monetaryValue3.default(0),
  juros_capital_proprio: monetaryValue3.default(0),
  poupanca_lci_lca: monetaryValue3.default(0)
});
var PatrimonioImobiliarioSchema = external_exports.object({
  descricao: external_exports.string().max(255).optional(),
  valor_atual: monetaryValue3
});
var OutroIsentoQueEntraBaseSchema = external_exports.object({
  descricao: external_exports.string().max(255),
  tipo_ativo: external_exports.enum(["outro_isento", "lucro_exterior", "renda_eventual"]).default("outro_isento"),
  valor: monetaryValue3
});
var RendimentoTributadoLei7713Schema = external_exports.object({
  descricao: external_exports.string().max(255),
  valor_bruto: monetaryValue3,
  irrf: monetaryValue3.default(0),
  aliquota_irrf_percentual: external_exports.number().nonnegative().max(100).optional().default(15)
});
var MemoriaLegalExclusaoSchema = external_exports.object({
  item: external_exports.string(),
  valor: monetaryValue3,
  base_legal: external_exports.string(),
  motivo: external_exports.string()
});
var ImpactoIncrementalCategoriaSchema = external_exports.object({
  categoria: external_exports.string(),
  valor: monetaryValue3,
  percentual_base: external_exports.number()
});
var OtimizacaoIsentoVsTributadoSchema = external_exports.object({
  valor_migrado: monetaryValue3,
  bcc_cenario_atual: monetaryValue3,
  bcc_cenario_otimizado: monetaryValue3,
  imposto_complementar_atual: monetaryValue3,
  imposto_complementar_otimizado: monetaryValue3,
  irrf_compensavel_estimado: monetaryValue3,
  rendimento_liquido_cenario_isento: monetaryValue3,
  rendimento_liquido_cenario_tributado: monetaryValue3,
  ganho_liquido_estimado: monetaryValue3,
  observacao: external_exports.string().optional()
});
var CenarioPfTributacaoExclusivaSchema = external_exports.object({
  imposto_total: monetaryValue3,
  irrf: monetaryValue3,
  rendimento_liquido: monetaryValue3
});
var CenarioPfEntraBaseSchema = external_exports.object({
  imposto_total: monetaryValue3,
  irrf_compensavel: monetaryValue3,
  rendimento_liquido: monetaryValue3
});
var ComparativoPfPjSchema = external_exports.object({
  rendimento_bruto: monetaryValue3,
  /** PF tributação exclusiva (Lei 7.713): CDB, JCP — não entra na BCC, só IRRF */
  cenario_pf_tributacao_exclusiva: CenarioPfTributacaoExclusivaSchema,
  /** PF aplicação entra na base: impacto IRPFM + IRRF compensável */
  cenario_pf_entra_base: CenarioPfEntraBaseSchema,
  /** Mantido para compatibilidade; aponta para cenario_pf_tributacao_exclusiva (cenário típico) */
  cenario_pf: external_exports.object({
    imposto_total: monetaryValue3,
    irrf_compensavel: monetaryValue3,
    rendimento_liquido: monetaryValue3
  }),
  cenario_pj: external_exports.object({
    irpj: monetaryValue3,
    adicional_irpj: monetaryValue3,
    csll: monetaryValue3,
    carga_efetiva_percentual: external_exports.number(),
    rendimento_liquido: monetaryValue3
  }),
  /** % a mais de imposto na PJ em relação ao líquido PF (tributação exclusiva, cenário típico) */
  diferenca_percentual_pj_mais_caro: external_exports.number()
});
var DadosIrpfAltaRendaSchema = external_exports.object({
  contribuinte: ContribuinteSchema,
  // ── Legado (formulário manual) ──────────────────────────────────────────────
  /** Soma de todos os rendimentos tributáveis (PJ + PF). Calculado automaticamente quando os arrays ricos estiverem presentes. */
  rendimentos_tributaveis: monetaryValue3,
  /** Array combinado de rendimentos isentos (códigos 09 e 13). Calculado automaticamente quando os arrays ricos estiverem presentes. */
  rendimentos_isentos_dividendos: external_exports.array(RendimentoIsentoDividendoSchema).default([]),
  // ── Campos ricos (extração PDF) ─────────────────────────────────────────────
  /** Rendimentos tributáveis de PJ (salário, pró-labore) – ficha "Recebidos de PJ" */
  tributaveis_pj: external_exports.array(RendimentoPJSchema).optional(),
  /** Rendimentos tributáveis de PF (aluguéis, carnê-leão) – ficha "Recebidos de PF" */
  tributaveis_pf_alugueis: external_exports.array(RendimentoPFAluguelSchema).optional(),
  /** Rendimentos isentos – código 09 (Lucros e dividendos) */
  isentos_lucros_dividendos: external_exports.array(RendimentoIsentoDividendoSchema).optional(),
  /** Rendimentos isentos – código 13 (Sócio ME/EPP Simples Nacional) */
  isentos_simples_nacional: external_exports.array(RendimentoIsentoDividendoSchema).optional(),
  /** Outros rendimentos exclusivos de tributação (não entram na BCC) */
  outros_rendimentos: OutrosRendimentosSchema.optional(),
  /** Imóveis que geram renda de aluguel (bens e direitos) */
  patrimonio_imobiliario: external_exports.array(PatrimonioImobiliarioSchema).optional(),
  // ── Lei 15.270/2025 ────────────────────────────────────────────────────────
  /** Lucros/dividendos aprovados até 31/12/2025 — excluídos da base (Art. 16-A § 1º XII) */
  lucros_aprovados_ate_31dez2025: monetaryValue3.optional().default(0),
  /** IR retido na fonte (pró-labore, salários) — deduzido do imposto mínimo (Art. 16-A § 3º II) */
  imposto_ja_pago_retencao_fonte: monetaryValue3.optional().default(0),
  /** IR carnê-leão — deduzido do imposto mínimo (Art. 16-A § 3º III) */
  imposto_ja_pago_carne_leao: monetaryValue3.optional().default(0),
  /** IR sobre aplicações financeiras (tributação exclusiva) — deduzido (Art. 16-A § 3º IV) */
  imposto_ja_pago_aplicacoes: monetaryValue3.optional().default(0),
  /** Retenção 10% sobre dividendos > R$ 50k/mês (Art. 6º-A) — deduzido (Art. 16-A § 5º) */
  imposto_antecipado_dividendos: monetaryValue3.optional().default(0),
  /** Ganho de capital excluído da base (Art. 16-A § 1º I — exceto bolsa/mercado organizado) */
  ganho_capital_excluido: monetaryValue3.optional().default(0),
  /** Rendimentos de FIIs excluídos (Art. 16-A § 1º V-j — FIIs com 100+ cotistas) */
  rendimentos_fiis_excluidos: monetaryValue3.optional().default(0),
  /** Outros excluídos (Art. 16-A § 1º) como CRI, CRA, LCI, LCA, LIG, poupança e debêntures de infraestrutura */
  outros_excluidos_art_16a: monetaryValue3.optional().default(0),
  /** Isentos que entram na base mínima, fora dos códigos 09 e 13 */
  outros_isentos_que_entram_base: external_exports.array(OutroIsentoQueEntraBaseSchema).optional().default([]),
  /** Rendimentos tributados exclusivamente na fonte sob Lei 7.713 (IRRF pode reduzir imposto a complementar) */
  rendimentos_tributados_exclusivamente_lei_7713: external_exports.array(RendimentoTributadoLei7713Schema).optional().default([]),
  /** Indica se o contribuinte optou pelo ajuste anual para rendimentos do art. 12-A da Lei 7.713 */
  optou_ajuste_anual_lei_7713: external_exports.boolean().optional().default(false),
  /** Rendimentos de aplicações financeiras já existentes na PJ (diagnóstico PF vs PJ) */
  rendimentos_aplicacoes_financeiras_pj: monetaryValue3.optional().default(0),
  /** Alíquota IRRF % para comparativo PF vs PJ: CDB curto/JCP 15, CDB longo (>720d) 22,5, FII 20. Default 15. */
  aliquota_irrf_comparativo_percentual: external_exports.number().min(0).max(100).optional().default(15),
  /** Valor hipotético para comparativo PF vs PJ (sobrescreve cálculo automático a partir de aplicações). */
  valor_hipotetico_comparativo_pf_pj: monetaryValue3.optional()
});
var SimulateIrpfAltaRendaInputSchema = external_exports.object({
  ano: external_exports.number().int().min(2020).max(2035),
  dados: DadosIrpfAltaRendaSchema
});
var SimulateAndSaveIrpfAltaRendaInputSchema = SimulateIrpfAltaRendaInputSchema.extend({
  company_id: external_exports.string().uuid().optional(),
  title: external_exports.string().max(255).optional(),
  tipo_importacao: external_exports.enum(["pdf", "dec_dbk", "manual"]).optional().default("manual"),
  arquivo_nome: external_exports.string().max(500).nullable().optional(),
  declaracao_completa: external_exports.record(external_exports.unknown()).nullable().optional(),
  diagnostico: external_exports.object({
    completude: external_exports.enum(["alta", "media", "baixa"]).optional(),
    avisos: external_exports.array(external_exports.string()).optional()
  }).nullable().optional(),
  parser_version: external_exports.number().int().optional()
});
var UpdateIrpfAltaRendaInputSchema = external_exports.object({
  ano: external_exports.number().int().min(2020).max(2035),
  dados: DadosIrpfAltaRendaSchema,
  title: external_exports.string().max(255).optional(),
  company_id: external_exports.string().uuid().optional().nullable()
});
var FaixaAltaRendaSchema = external_exports.enum(["isento", "progressiva", "fixa_10"]);
var IrpfAltaRendaSimulacaoResponseSchema = external_exports.object({
  ano: external_exports.number(),
  base_calculo_combinada: external_exports.number(),
  faixa: FaixaAltaRendaSchema,
  aliquota_percentual: external_exports.number(),
  /** Imposto mínimo calculado (antes das deduções) */
  imposto_minimo: external_exports.number().optional(),
  /** Soma das deduções (IR já pago) */
  deducoes_imposto_ja_pago: external_exports.number().optional(),
  /** Imposto a complementar (valor final a pagar) — Art. 16-A § 3º e § 4º */
  imposto_estimado: external_exports.number(),
  risco_retencao_mensal: external_exports.boolean(),
  risco_retencao_detalhe: external_exports.string().optional(),
  /** Sugestões dinâmicas de planejamento (holding, segregação) com base nos dados da simulação */
  sugestoes_planejamento: external_exports.array(external_exports.string()).optional(),
  /** Visão resumida de composição da renda para dashboards */
  composicao_renda: external_exports.object({
    tributaveis: external_exports.number(),
    isentos_que_entram_base: external_exports.number(),
    dividendos_09_13: external_exports.number().optional(),
    isentos_excluidos: external_exports.number(),
    tributacao_exclusiva_lei_7713: external_exports.number().optional()
  }).optional(),
  /** Contribuição de cada grupo para a base de cálculo combinada */
  impacto_incremental_base: external_exports.array(ImpactoIncrementalCategoriaSchema).optional(),
  /** Comparação entre manter isento que entra na base e migrar para ativo tributado com IRRF compensável */
  otimizacao_isento_vs_tributado: OtimizacaoIsentoVsTributadoSchema.optional(),
  /** Explicação jurídica das exclusões aplicadas no cálculo */
  memoria_legal_exclusoes: external_exports.array(MemoriaLegalExclusaoSchema).optional(),
  /** Comparativo custo tributário PF vs PJ (Lucro Presumido) para mesma aplicação */
  comparativo_pf_pj: ComparativoPfPjSchema.optional(),
  memoria_calculo: external_exports.record(external_exports.unknown()).optional(),
  /** Aviso quando ano &lt; 2027: Lei 15.270/2025 vigente a partir do ano-calendário 2026 (declaração 2027) */
  aviso_ano_fora_vigencia: external_exports.string().optional()
});
var IrpfAltaRendaPayloadJsonSchema = external_exports.object({
  tipo_importacao: external_exports.enum(["pdf", "dec_dbk", "manual"]),
  arquivo_nome: external_exports.string().nullable().optional(),
  ano: external_exports.number(),
  dados: DadosIrpfAltaRendaSchema,
  resultado_simulacao: IrpfAltaRendaSimulacaoResponseSchema,
  declaracao_completa: external_exports.record(external_exports.unknown()).nullable().optional(),
  diagnostico: external_exports.object({
    completude: external_exports.enum(["alta", "media", "baixa"]).optional(),
    avisos: external_exports.array(external_exports.string()).optional()
  }).nullable().optional(),
  parser_version: external_exports.number().int().optional()
}).passthrough();
var ReportSummaryIrpfAltaRendaInputSchema = SimulateIrpfAltaRendaInputSchema.extend({
  scenario_name: external_exports.string().max(120).optional()
});
var ReportSummaryIrpfAltaRendaResponseSchema = external_exports.object({
  scenario_name: external_exports.string(),
  gerado_em: external_exports.string(),
  resumo_executivo: external_exports.object({
    faixa: FaixaAltaRendaSchema,
    aliquota_percentual: external_exports.number(),
    imposto_a_complementar: external_exports.number(),
    economia_potencial_otimizacao: external_exports.number().optional()
  }),
  composicao: external_exports.object({
    tributaveis: external_exports.number(),
    isentos_que_entram_base: external_exports.number(),
    isentos_excluidos: external_exports.number()
  }),
  comparativo_otimizacao: OtimizacaoIsentoVsTributadoSchema.optional(),
  memoria_legal_exclusoes: external_exports.array(MemoriaLegalExclusaoSchema).default([]),
  recomendacoes_priorizadas: external_exports.array(external_exports.string()).default([])
});
var ListIrpfAltaRendaQuerySchema = external_exports.object({
  company_id: external_exports.string().uuid().optional(),
  ano: external_exports.coerce.number().int().min(2020).max(2035).optional(),
  page: external_exports.coerce.number().int().positive().default(1),
  limit: external_exports.coerce.number().int().positive().max(100).default(20)
});
var IrpfAltaRendaIdParamSchema = external_exports.object({
  id: external_exports.string().uuid()
});

// ../../packages/shared/src/schemas/declaracao-irpf-completa.schema.ts
var valorMonetario = external_exports.number().nonnegative().default(0);
var IdentificacaoDeclaranteSchema = external_exports.object({
  nome: external_exports.string().default(""),
  cpf: external_exports.string().default(""),
  data_nascimento: external_exports.string().optional(),
  titulo_eleitor: external_exports.string().optional(),
  exercicio: external_exports.number().int().min(2020).max(2035).default((/* @__PURE__ */ new Date()).getFullYear()),
  ano_calendario: external_exports.number().int().min(2020).max(2035).default((/* @__PURE__ */ new Date()).getFullYear()),
  tipo_declaracao: external_exports.enum(["completa", "simplificada"]).optional(),
  cnpj_empresa_optante_simples: external_exports.string().optional(),
  codigo_receita: external_exports.string().optional(),
  situacao_final: external_exports.string().optional()
});
var DependenteSchema = external_exports.object({
  nome: external_exports.string().default(""),
  cpf: external_exports.string().default(""),
  parentesco: external_exports.string().optional(),
  data_nascimento: external_exports.string().optional()
});
var RendimentoPJItemSchema = external_exports.object({
  cnpj: external_exports.string().optional(),
  nome_fonte: external_exports.string().optional(),
  codigo: external_exports.string().optional(),
  valor: valorMonetario,
  competencia: external_exports.string().optional()
});
var RendimentoPFItemSchema = external_exports.object({
  cpf_pagador: external_exports.string().optional(),
  nome_pagador: external_exports.string().optional(),
  descricao: external_exports.string().optional(),
  valor: valorMonetario,
  mes: external_exports.string().optional()
});
var RendimentoIsentoItemSchema = external_exports.object({
  codigo: external_exports.string().default(""),
  // 01, 03, 06, 09, 13, etc.
  descricao: external_exports.string().optional(),
  cnpj_fonte: external_exports.string().optional(),
  nome_fonte: external_exports.string().optional(),
  valor: valorMonetario,
  /** Classificação para Lei 15.270: nenhum | ganho_capital | fii_qualificado | lucros_31dez2025 | lhi_cri_lig_lcd */
  tipo_exclusao_art_16a: external_exports.string().optional()
});
var RendimentoExclusivaItemSchema = external_exports.object({
  codigo: external_exports.string().optional(),
  // 06 aplicações, 10 JCP, etc.
  descricao: external_exports.string().optional(),
  cnpj_fonte: external_exports.string().optional(),
  nome_fonte: external_exports.string().optional(),
  valor: valorMonetario,
  irrf: valorMonetario.optional()
  // IR retido na fonte (ex.: aplicações código 06)
});
var BemDireitoSchema = external_exports.object({
  codigo: external_exports.string().optional(),
  // 01 imóvel urbano, 11 imóvel rural, 12 terreno, 02 veículo, etc.
  descricao: external_exports.string().optional(),
  situacao_31dez: external_exports.string().optional(),
  valor_atual: valorMonetario,
  participacao_percentual: valorMonetario.optional()
});
var DividaOnusSchema = external_exports.object({
  codigo: external_exports.string().optional(),
  descricao: external_exports.string().optional(),
  cnpj_cpf_credor: external_exports.string().optional(),
  valor: valorMonetario
});
var ResumoDeclaracaoSchema = external_exports.object({
  base_calculo_ir: valorMonetario,
  imposto_devido: valorMonetario,
  imposto_pago_retencao: valorMonetario,
  imposto_ja_pago_carne_leao: valorMonetario.optional(),
  imposto_a_restituir: valorMonetario,
  imposto_a_pagar: valorMonetario,
  deducao_simplificada: valorMonetario.optional()
});
var PagamentoEfetuadoSchema = external_exports.object({
  tipo: external_exports.string().optional(),
  codigo_receita: external_exports.string().optional(),
  valor: valorMonetario,
  competencia: external_exports.string().optional()
});
var DoacaoDeducaoSchema = external_exports.object({
  descricao: external_exports.string().optional(),
  valor: valorMonetario
});
var Lei15270ClassificacaoSchema = external_exports.object({
  /** Ganho de capital excluído (Art. 16-A § 1º I — exceto bolsa/mercado organizado) */
  ganho_capital_excluido: valorMonetario.optional().default(0),
  /** Rendimentos de FIIs qualificados (Art. 16-A § 1º V-j — 100+ cotistas) */
  rendimentos_fiis_excluidos: valorMonetario.optional().default(0),
  /** Lucros/dividendos aprovados até 31/12/2025 (Art. 16-A § 1º XII) */
  lucros_aprovados_ate_31dez2025: valorMonetario.optional().default(0),
  /** Outros excluídos (LHI, CRI, LIG, LCD — Art. 16-A § 1º) */
  outros_excluidos_art_16a: valorMonetario.optional().default(0)
});
var DeclaracaoIrpfCompletaSchema = external_exports.object({
  identificacao: IdentificacaoDeclaranteSchema.default({}),
  dependentes: external_exports.array(DependenteSchema).default([]),
  rendimentos_tributaveis_pj: external_exports.object({
    total: valorMonetario,
    itens: external_exports.array(RendimentoPJItemSchema).default([])
  }).default({ total: 0, itens: [] }),
  rendimentos_tributaveis_pf: external_exports.object({
    total: valorMonetario,
    itens: external_exports.array(RendimentoPFItemSchema).default([])
  }).default({ total: 0, itens: [] }),
  rendimentos_tributaveis_outros: external_exports.object({
    total: valorMonetario,
    itens: external_exports.array(external_exports.object({ descricao: external_exports.string().optional(), valor: valorMonetario })).default([])
  }).default({ total: 0, itens: [] }),
  rendimentos_isentos_nao_tributaveis: external_exports.object({
    total: valorMonetario,
    itens: external_exports.array(RendimentoIsentoItemSchema).default([])
  }).default({ total: 0, itens: [] }),
  rendimentos_tributacao_exclusiva_definitiva: external_exports.object({
    total: valorMonetario,
    itens: external_exports.array(RendimentoExclusivaItemSchema).default([])
  }).default({ total: 0, itens: [] }),
  bens_direitos: external_exports.object({
    total: valorMonetario,
    itens: external_exports.array(BemDireitoSchema).default([])
  }).default({ total: 0, itens: [] }),
  dividas_onus: external_exports.object({
    total: valorMonetario,
    itens: external_exports.array(DividaOnusSchema).default([])
  }).default({ total: 0, itens: [] }),
  resumo: ResumoDeclaracaoSchema.optional().default({
    base_calculo_ir: 0,
    imposto_devido: 0,
    imposto_pago_retencao: 0,
    imposto_a_restituir: 0,
    imposto_a_pagar: 0
  }),
  pagamentos_efetuados: external_exports.array(PagamentoEfetuadoSchema).default([]),
  doacoes_deducoes: external_exports.array(DoacaoDeducaoSchema).default([]),
  informacoes_complementares: external_exports.string().optional(),
  /** Classificações Lei 15.270/2025 (Art. 16-A § 1º) — preenchido pela extração ou import */
  lei_15_270_classificacao: Lei15270ClassificacaoSchema.optional().default({
    ganho_capital_excluido: 0,
    rendimentos_fiis_excluidos: 0,
    lucros_aprovados_ate_31dez2025: 0,
    outros_excluidos_art_16a: 0
  }),
  // Metadados da extração
  extraido_em: external_exports.string().optional(),
  fonte: external_exports.enum(["pdf_daa", "formulario", "api", "dec_dbk"]).optional()
}).passthrough();

// ../../packages/shared/src/schemas/property.schema.ts
var monetaryValue4 = external_exports.number().nonnegative().multipleOf(0.01).or(external_exports.literal(0));
var TipoLocacaoSchema = external_exports.enum(["fixa", "flexivel"]);
var TransactionTipoSchema = external_exports.enum([
  "receita",
  "despesa_dedutivel",
  "custo_operacional"
]);
var TransactionCategoriaSchema = external_exports.enum([
  "aluguel",
  "diarias",
  "iptu",
  "condominio",
  "taxa_imobiliaria",
  "taxa_plataforma",
  "reforma",
  "mobilia",
  "limpeza",
  "energia",
  "internet",
  "taxa_intermediacao",
  "outros"
]);
var ModoEntradaSchema = external_exports.enum(["detalhado", "reduzido"]);
var CreatePropertySchema = external_exports.object({
  client_id: external_exports.string().uuid(),
  tipo_locacao: TipoLocacaoSchema,
  identificador: external_exports.string().min(1).max(255),
  modo_entrada: ModoEntradaSchema.optional().default("detalhado")
});
var UpdatePropertySchema = external_exports.object({
  client_id: external_exports.string().uuid().optional(),
  tipo_locacao: TipoLocacaoSchema.optional(),
  identificador: external_exports.string().min(1).max(255).optional(),
  modo_entrada: ModoEntradaSchema.optional()
});
var PropertyMonthlyTotalSchema = external_exports.object({
  mes_referencia: external_exports.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
  receita_longa: monetaryValue4,
  receita_short: monetaryValue4,
  despesas_dedutiveis: monetaryValue4,
  custos_operacionais: monetaryValue4
});
var UpsertMonthlyTotalsSchema = external_exports.object({
  property_id: external_exports.string().uuid().optional(),
  ano: external_exports.number().int().min(2020).max(2030),
  meses: external_exports.array(PropertyMonthlyTotalSchema).min(1).max(12)
});
var PropertyTransactionSchema = external_exports.object({
  mes_referencia: external_exports.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
  tipo: TransactionTipoSchema,
  categoria: TransactionCategoriaSchema,
  valor: monetaryValue4,
  observacao: external_exports.string().max(500).optional()
});
var BatchPropertyTransactionSchema = external_exports.object({
  property_id: external_exports.string().uuid(),
  transactions: external_exports.array(PropertyTransactionSchema).min(1)
});
var PerfilLocacaoReformaSchema = external_exports.enum(["residencial_comum", "hospedagem_temporada"]);
var OpcoesReformaSchema = external_exports.object({
  /** Alíquota nominal estimada do IVA (IBS+CBS). Em 2027/2028 sugere-se 9% (só CBS); 2029+ 26,5% a 28%. */
  aliquota_ibs_cbs_estimada: external_exports.number().min(0).max(100).optional().default(26.5),
  /** Redutor para locação residencial (reforma): 70 = alíquota efetiva = nominal × 30%. Padrão 70. */
  redutor_locacao_pct: external_exports.number().min(0).max(100).optional(),
  /** Redutor para curta temporada / hospedagem: 50%. Usado quando perfil é hospedagem ou quando receita curto > longo. */
  redutor_short_stay_pct: external_exports.number().min(0).max(100).optional().default(50),
  /** Contrato firmado antes de 16/01/2025? Regime de transição Art. 487 LC 214/25: opção 3,65% sobre faturamento bruto. */
  contrato_antes_16012025: external_exports.boolean().optional().default(false),
  /** Perfil: residencial_comum (70%) ou hospedagem_temporada (50%). Se não informado, deriva de receita curto vs longo. */
  perfil_locacao: PerfilLocacaoReformaSchema.optional()
});
var SimulateStandaloneMesSchema = external_exports.object({
  mes_referencia: external_exports.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
  // Receitas
  receita_aluguel_tradicional: monetaryValue4.optional().default(0),
  receita_aluguel_curto: monetaryValue4.optional().default(0),
  receita_garagem: monetaryValue4.optional().default(0),
  receita_outras: monetaryValue4.optional().default(0),
  // Despesas dedutíveis (Lei 7.713/88 - PF)
  iptu: monetaryValue4.optional().default(0),
  condominio: monetaryValue4.optional().default(0),
  seguro_imovel: monetaryValue4.optional().default(0),
  juros_financiamento: monetaryValue4.optional().default(0),
  manutencao_conservacao: monetaryValue4.optional().default(0),
  outras_dedutiveis: monetaryValue4.optional().default(0),
  // Custos operacionais (Reforma IBS/CBS e análise)
  reformas_melhorias: monetaryValue4.optional().default(0),
  mobilia_equipamentos: monetaryValue4.optional().default(0),
  limpeza_higienizacao: monetaryValue4.optional().default(0),
  comissao_corretagem: monetaryValue4.optional().default(0),
  taxa_plataforma: monetaryValue4.optional().default(0),
  outros_custos: monetaryValue4.optional().default(0)
});
var SimulateStandaloneInputSchema = external_exports.object({
  ano: external_exports.number().int().min(2020).max(2030),
  meses: external_exports.array(SimulateStandaloneMesSchema).length(12),
  opcoes_reforma: OpcoesReformaSchema.optional()
});
var SimulatePropertyTaxInputSchema = external_exports.object({
  ano: external_exports.number().int().min(2020).max(2030),
  property_ids: external_exports.array(external_exports.string().uuid()).min(1),
  aliquota_efetiva_dirpf: external_exports.number().min(0).max(100).optional(),
  aplicar_presuncao_16_servicos: external_exports.boolean().optional().default(false),
  opcoes_reforma: OpcoesReformaSchema.optional()
});
var CenarioPFSchema = external_exports.object({
  receita_bruta_total: external_exports.number(),
  despesas_dedutiveis_total: external_exports.number(),
  base_calculo_total: external_exports.number(),
  imposto_total: external_exports.number(),
  aliquota_efetiva_anual: external_exports.number(),
  trimestres: external_exports.array(external_exports.object({
    trimestre: external_exports.number(),
    receita: external_exports.number(),
    despesas_dedutiveis: external_exports.number(),
    base_calculo: external_exports.number(),
    imposto: external_exports.number()
  }))
});
var CenarioPJSchema = external_exports.object({
  receita_bruta_total: external_exports.number(),
  base_presumida_irpj: external_exports.number(),
  base_presumida_csll: external_exports.number(),
  irpj: external_exports.number(),
  irpj_adicional: external_exports.number().optional(),
  irpj_postergado: external_exports.number().optional(),
  csll: external_exports.number(),
  pis: external_exports.number(),
  cofins: external_exports.number(),
  imposto_total: external_exports.number(),
  aliquota_efetiva: external_exports.number(),
  aplicou_in_2306: external_exports.boolean(),
  trimestres: external_exports.array(external_exports.object({
    trimestre: external_exports.number(),
    receita: external_exports.number(),
    base_irpj: external_exports.number(),
    base_csll: external_exports.number(),
    presuncao_irpj_pct: external_exports.number().optional(),
    irpj: external_exports.number(),
    irpj_adicional: external_exports.number().optional(),
    irpj_postergado: external_exports.number().optional(),
    csll: external_exports.number(),
    pis: external_exports.number(),
    cofins: external_exports.number()
  }))
});
var CenarioReforma2027Schema = external_exports.object({
  receita_bruta_total: external_exports.number(),
  custos_operacionais_total: external_exports.number(),
  creditos_ibs_cbs: external_exports.number(),
  ibs_cbs_sobre_receita: external_exports.number(),
  ibs_cbs_liquido: external_exports.number(),
  imposto_total: external_exports.number(),
  aliquota_efetiva: external_exports.number(),
  /** Alíquota nominal IBS/CBS (antes do redutor locação), para exibição */
  aliquota_nominal_ibs_cbs: external_exports.number().optional(),
  /** Redutor aplicado para locação (ex.: 70), para exibição */
  redutor_locacao_aplicado_pct: external_exports.number().optional(),
  /** Na ótica PF em 2027: IR (Carnê-Leão) continua; imposto_total = ir_pf + ibs_cbs_liquido */
  ir_pf: external_exports.number().optional(),
  /** Regime transição Art. 487: valor do imposto a 3,65% sobre receita bruta */
  imposto_transicao_365: external_exports.number().optional(),
  /** true se foi aplicado o regime de transição (3,65%) por ser menor que o regime normal */
  aplicou_transicao_art487: external_exports.boolean().optional(),
  /** true quando foi aplicado redutor 50% na parte short stay (hospedagem/temporada) */
  redutor_diferenciado_short: external_exports.boolean().optional()
});
var BreakEvenSchema = external_exports.object({
  valor_mensal_break_even: external_exports.number(),
  descricao: external_exports.string()
});
var EmbasamentoLegalSchema = external_exports.object({
  cenario: external_exports.enum(["pf", "pj", "reforma"]),
  norma: external_exports.string(),
  artigo: external_exports.string().optional(),
  descricao: external_exports.string()
});
var FluxoCaixaSchema = external_exports.object({
  property_id: external_exports.string().uuid(),
  identificador: external_exports.string(),
  receita_total: external_exports.number(),
  despesas_total: external_exports.number(),
  impostos_pf: external_exports.number(),
  impostos_pj: external_exports.number(),
  lucro_liquido_pf: external_exports.number(),
  lucro_liquido_pj: external_exports.number()
});
var PropertyTaxSimulationResponseSchema = external_exports.object({
  ano: external_exports.number(),
  cenarios: external_exports.object({
    pf: CenarioPFSchema,
    pj: CenarioPJSchema,
    /** Reforma 2027 (IBS/CBS) na ótica Pessoa Física – mesma base de cálculo, para comparação */
    reforma_2027_pf: CenarioReforma2027Schema.optional(),
    /** Reforma 2027 (IBS/CBS) na ótica Pessoa Jurídica – substitui PIS/COFINS na atividade */
    reforma_2027_pj: CenarioReforma2027Schema.optional(),
    /** @deprecated use reforma_2027_pf / reforma_2027_pj */
    reforma_2027: CenarioReforma2027Schema.optional()
  }),
  break_even: BreakEvenSchema.optional(),
  fluxo_caixa: external_exports.array(FluxoCaixaSchema),
  memoria_calculo: external_exports.record(external_exports.unknown()).optional(),
  /** Embasamentos legais por cenário (PF, PJ, Reforma 2027) */
  embasamentos_legais: external_exports.array(EmbasamentoLegalSchema).optional()
});
var ListPropertiesQuerySchema = external_exports.object({
  client_id: external_exports.string().uuid().optional(),
  page: external_exports.coerce.number().int().positive().default(1),
  limit: external_exports.coerce.number().int().positive().max(100).default(20)
});
var ListTransactionsQuerySchema = external_exports.object({
  ano: external_exports.coerce.number().int().optional(),
  mes: external_exports.string().regex(/^\d{4}-\d{2}$/).optional()
});
var PropertyIdParamSchema = external_exports.object({
  id: external_exports.string().uuid()
});
var TransactionIdParamSchema = external_exports.object({
  id: external_exports.string().uuid(),
  txId: external_exports.string().uuid()
});

// src/modules/auth/auth.routes.ts
var authRoutes = new Hono2();
var authRepo = new AuthRepository();
var companyRepo = new CompanyRepository();
var companyService = new CompanyService(companyRepo);
var userRepo = new UserRepository();
var subscriptionRepo = new SubscriptionRepository();
var planRepo = new PlanRepository();
var authService = new AuthService(
  authRepo,
  companyService,
  userRepo,
  subscriptionRepo,
  planRepo
);
authRoutes.post(
  "/register",
  zValidator("json", RegisterSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await authService.register(data);
      return c.json(
        {
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role,
              tenant_id: result.user.tenant_id
            },
            company: result.company,
            tokens: result.tokens
          }
        },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
authRoutes.post(
  "/login",
  zValidator("json", LoginSchema),
  async (c) => {
    try {
      const { email, password } = c.req.valid("json");
      const companyId = c.req.header("X-Tenant-ID");
      const result = await authService.login(email, password, companyId);
      return c.json({
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            tenant_id: result.user.tenant_id
          },
          tokens: result.tokens
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid credentials") {
        return c.json(
          {
            error: {
              message: "Invalid email or password",
              code: "INVALID_CREDENTIALS"
            }
          },
          401
        );
      }
      return errorHandler2(error, c);
    }
  }
);
authRoutes.post(
  "/refresh",
  zValidator("json", RefreshTokenSchema),
  async (c) => {
    try {
      const { token } = c.req.valid("json");
      const result = await authService.refreshToken(token);
      return c.json({
        data: {
          accessToken: result.accessToken
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid refresh token")) {
        return c.json(
          {
            error: {
              message: "Invalid or expired refresh token",
              code: "INVALID_REFRESH_TOKEN"
            }
          },
          401
        );
      }
      return errorHandler2(error, c);
    }
  }
);
authRoutes.post(
  "/logout",
  authMiddleware,
  zValidator("json", LogoutSchema),
  async (c) => {
    try {
      const { token } = c.req.valid("json");
      await authService.logout(token);
      return c.json({
        data: {
          success: true
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
authRoutes.get(
  "/me",
  authMiddleware,
  async (c) => {
    try {
      const user = c.get("user");
      return c.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id
          }
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);

// src/modules/users/user.service.ts
var UserService = class {
  constructor(userRepo3, subscriptionService3) {
    this.userRepo = userRepo3;
    this.subscriptionService = subscriptionService3;
  }
  /**
   * Criar usuário com validação de seats
   */
  async create(companyId, data) {
    const subscription = await this.subscriptionService.getByCompany(companyId);
    if (!subscription) {
      throw new AppError("No active subscription found", "SUBSCRIPTION_NOT_FOUND", 402);
    }
    const currentUsers = await this.userRepo.countByCompany(companyId);
    if (currentUsers >= subscription.plan.max_users) {
      throw new AppError("User limit reached", "USER_LIMIT_REACHED", 409);
    }
    const existingUser = await this.userRepo.findByEmail(data.email, companyId);
    if (existingUser) {
      const statusInfo = existingUser.status === "inactive" ? " (usu\xE1rio inativo)" : "";
      throw new AppError(
        `Email j\xE1 existe neste tenant${statusInfo}. Verifique a lista de usu\xE1rios, incluindo usu\xE1rios inativos.`,
        "EMAIL_ALREADY_EXISTS",
        409
      );
    }
    const existingSuperAdmin = await this.userRepo.findByEmailGlobal(data.email);
    if (existingSuperAdmin && existingSuperAdmin.tenant_id === null) {
      throw new AppError("Email j\xE1 existe como super admin e n\xE3o pode ser usado em tenants", "EMAIL_ALREADY_EXISTS", 409);
    }
    const allUsersWithEmail = await this.userRepo.findAllByEmail(data.email);
    if (allUsersWithEmail.length > 0) {
      console.log(
        `[UserService.create] Email ${data.email} encontrado em outros tenants:`,
        allUsersWithEmail.map((u) => ({ id: u.id, tenant_id: u.tenant_id, role: u.role, status: u.status }))
      );
    }
    const passwordHash = await hashPassword(data.password);
    const user = await this.userRepo.create(companyId, {
      ...data,
      password: passwordHash
    });
    if (!user.status || user.status !== "active") {
      console.warn(`[UserService.create] Usu\xE1rio criado com status inesperado: ${user.status || "undefined"}, for\xE7ando 'active'`);
      user.status = "active";
    }
    logSensitiveOperation("user_created", user.id, companyId, {
      email: user.email,
      role: user.role,
      status: user.status
    });
    console.log(`[UserService.create] Usu\xE1rio criado com sucesso: ${user.email}, status: ${user.status}, tenant_id: ${companyId}`);
    return user;
  }
  /**
   * Atualizar usuário com validação de permissões
   */
  async update(id, companyId, data, currentUser) {
    const user = await this.userRepo.findById(id, companyId);
    if (!user) {
      throw new AppError("User not found", "USER_NOT_FOUND", 404);
    }
    if (id !== currentUser.id && currentUser.role !== "admin") {
      throw new AppError("Insufficient permissions", "FORBIDDEN", 403);
    }
    if (data.role === "super_admin" && currentUser.role !== "super_admin") {
      throw new AppError("Cannot set role to super_admin", "FORBIDDEN", 403);
    }
    const updatedUser = await this.userRepo.update(id, companyId, data);
    logSensitiveOperation("user_updated", id, companyId, {
      updated_by: currentUser.id,
      changes: data
    });
    return updatedUser;
  }
  /**
   * Deletar usuário
   */
  async delete(id, companyId, currentUser) {
    const user = await this.userRepo.findById(id, companyId);
    if (!user) {
      throw new AppError("User not found", "USER_NOT_FOUND", 404);
    }
    if (id === currentUser.id) {
      throw new AppError("Cannot delete yourself", "FORBIDDEN", 403);
    }
    if (currentUser.role !== "admin") {
      throw new AppError("Insufficient permissions", "FORBIDDEN", 403);
    }
    await this.userRepo.delete(id, companyId);
    logSensitiveOperation("user_deleted", id, companyId, {
      deleted_by: currentUser.id,
      deleted_user_email: user.email
    });
  }
  /**
   * Listar usuários com paginação
   */
  async list(companyId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const result = await this.userRepo.findByCompany(companyId, {
      page,
      limit,
      role: options.role
    });
    return {
      users: result.users,
      total: result.total,
      page,
      limit
    };
  }
  /**
   * Buscar usuário por ID
   */
  async getById(id, companyId) {
    const user = await this.userRepo.findById(id, companyId);
    if (!user) {
      throw new AppError("User not found", "USER_NOT_FOUND", 404);
    }
    return user;
  }
  /**
   * Criar super_admin (sem company_id)
   */
  async createSuperAdmin(data) {
    const existingUser = await this.userRepo.findByEmailGlobal(data.email);
    if (existingUser) {
      throw new AppError("Email already exists", "EMAIL_ALREADY_EXISTS", 409);
    }
    const passwordHash = await hashPassword(data.password);
    const user = await this.userRepo.createSuperAdmin({
      ...data,
      password: passwordHash
    });
    logSensitiveOperation("super_admin_created", user.id, null, {
      email: user.email
    });
    return user;
  }
  /**
   * Listar todos os super_admins
   */
  async listSuperAdmins() {
    return this.userRepo.findSuperAdmins();
  }
};

// src/modules/subscriptions/subscription.service.ts
var SubscriptionService = class {
  constructor(subscriptionRepo5, planRepo6) {
    this.subscriptionRepo = subscriptionRepo5;
    this.planRepo = planRepo6;
  }
  /**
   * Criar assinatura.
   * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
   */
  async create(companyId, data, options) {
    const plan = await this.planRepo.findById(data.planId);
    if (!plan) {
      throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
    }
    const isCustom = plan.is_custom === true || plan.isCustom === true;
    if (isCustom && !options?.allowCustomPlan) {
      throw new AppError(
        "Apenas o administrador geral pode associar o plano customizado.",
        "CUSTOM_PLAN_FORBIDDEN",
        403
      );
    }
    const existing = await this.subscriptionRepo.findByCompany(companyId);
    if (existing && ["active", "trialing"].includes(existing.status)) {
      throw new AppError("Active subscription already exists", "SUBSCRIPTION_EXISTS", 409);
    }
    const createData = { ...data };
    if (plan.name === "Free") {
      createData.freePlanStartedAt = /* @__PURE__ */ new Date();
    }
    return this.subscriptionRepo.create(companyId, createData);
  }
  /**
   * Atualizar status da assinatura
   */
  async updateStatus(companyId, status) {
    return this.subscriptionRepo.updateStatus(companyId, status);
  }
  /**
   * Buscar assinatura por empresa
   */
  async getByCompany(companyId) {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription) {
      throw new AppError("Subscription not found", "SUBSCRIPTION_NOT_FOUND", 404);
    }
    const plan = await this.planRepo.findById(subscription.plan_id);
    if (!plan) {
      throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
    }
    return {
      ...subscription,
      plan
    };
  }
  /**
   * Verificar limite de usuários (seats)
   */
  async checkSeatsLimit(companyId, currentUserCount) {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription) {
      return false;
    }
    const plan = await this.planRepo.findById(subscription.plan_id);
    if (!plan) {
      return false;
    }
    return currentUserCount < plan.max_users;
  }
  /**
   * Verificar se assinatura está ativa
   */
  async isActive(companyId) {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription) {
      return false;
    }
    return ["active", "trialing"].includes(subscription.status);
  }
  /**
   * Atualizar assinatura.
   * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
   */
  async update(companyId, data, options) {
    const updateData = { ...data };
    if (data.planId) {
      const plan2 = await this.planRepo.findById(data.planId);
      if (!plan2) {
        throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
      }
      const isCustom = plan2.is_custom === true || plan2.isCustom === true;
      if (isCustom && !options?.allowCustomPlan) {
        throw new AppError(
          "Apenas o administrador geral pode associar o plano customizado.",
          "CUSTOM_PLAN_FORBIDDEN",
          403
        );
      }
      if (plan2.name === "Free") {
        const existing = await this.subscriptionRepo.findByCompany(companyId);
        const started = existing?.free_plan_started_at;
        updateData.freePlanStartedAt = started ? new Date(started) : /* @__PURE__ */ new Date();
      }
    }
    const subscription = await this.subscriptionRepo.update(companyId, updateData);
    const plan = await this.planRepo.findById(subscription.plan_id);
    if (!plan) {
      throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
    }
    return {
      ...subscription,
      plan
    };
  }
};

// src/middleware/tenant.middleware.ts
async function tenantMiddleware(c, next) {
  let companyId;
  companyId = c.req.header("X-Tenant-ID");
  console.log("[tenantMiddleware] 1. Header X-Tenant-ID:", companyId);
  if (!companyId) {
    companyId = c.req.query("companyId");
    console.log("[tenantMiddleware] 2. Query param companyId:", companyId);
  }
  if (!companyId) {
    const host = c.req.header("host") || "";
    const subdomain = extractSubdomain(host);
    console.log("[tenantMiddleware] 3. Subdomain:", subdomain);
    if (subdomain) {
      const result = await query(
        "SELECT id FROM public.companies WHERE domain = $1",
        [subdomain]
      );
      if (result.rows.length > 0) {
        companyId = result.rows[0].id;
        console.log("[tenantMiddleware] 3. CompanyId from subdomain:", companyId);
      }
    }
  }
  if (!companyId) {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyAccessToken(authHeader.substring(7));
        if (payload?.companyId) {
          companyId = payload.companyId;
          console.log("[tenantMiddleware] 4. CompanyId from JWT decode:", companyId);
        }
      } catch {
      }
    }
  }
  const user = c.get("user");
  const path2 = c.req.path;
  const url = c.req.url;
  const rawPath = c.req.raw?.path || "";
  const isAdminRoute = path2.includes("/admin") || url.includes("/admin") || rawPath.includes("/admin");
  console.log("[tenantMiddleware] Verificando:", { path: path2, url, rawPath, isAdminRoute, userRole: user?.role, hasCompanyId: !!companyId });
  if (user?.role === "super_admin") {
    console.log("[tenantMiddleware] Super admin detectado, permitindo:", { path: path2, url, isAdminRoute, companyId });
    c.set("companyId", companyId || null);
    await next();
    return;
  }
  if (!companyId) {
    console.log("[tenantMiddleware] Tenant n\xE3o identificado:", { path: path2, url, rawPath, userRole: user?.role, isAdminRoute });
    return c.json(
      {
        error: {
          message: "Tenant not identified",
          code: "TENANT_REQUIRED"
        }
      },
      400
    );
  }
  const company = await query(
    "SELECT id FROM public.companies WHERE id = $1",
    [companyId]
  );
  fetch("http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hypothesisId: "H1", location: "tenant.middleware.ts:company-check", message: "Company lookup result", data: { companyId, found: company.rows.length > 0, path: c.req.path }, timestamp: Date.now() }) }).catch(() => {
  });
  if (company.rows.length === 0) {
    fetch("http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hypothesisId: "H1", location: "tenant.middleware.ts:return-404", message: "Returning 404 TENANT_NOT_FOUND", data: { companyId, path: c.req.path }, timestamp: Date.now() }) }).catch(() => {
    });
    return c.json(
      {
        error: {
          message: "Tenant not found. Verifique se o company_id (X-Tenant-ID ou JWT) existe em companies.",
          code: "TENANT_NOT_FOUND",
          path: c.req.path
        }
      },
      404
    );
  }
  c.set("companyId", companyId);
  if (user?.role !== "super_admin") {
    return runWithTenantClient(companyId, () => next());
  }
  await next();
}
function extractSubdomain(host) {
  const parts = host.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

// src/modules/users/user.routes.ts
function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant_id: user.tenant_id,
    status: user.status || "active",
    ...user.created_at != null && { created_at: user.created_at },
    ...user.updated_at != null && { updated_at: user.updated_at }
  };
}
var userRoutes = new Hono2();
var userRepo2 = new UserRepository();
var subscriptionRepo2 = new SubscriptionRepository();
var planRepo2 = new PlanRepository();
var subscriptionService = new SubscriptionService(subscriptionRepo2, planRepo2);
var userService = new UserService(userRepo2, subscriptionService);
userRoutes.use("/*", authMiddleware);
userRoutes.use("/*", tenantMiddleware);
var adminRoutes = new Hono2();
adminRoutes.use("*", authMiddleware);
adminRoutes.get("/admin", async (c) => {
  try {
    console.log("[GET /users/admin] Rota admin acessada");
    const currentUser = c.get("user");
    const companyIdFromContext = c.get("companyId");
    const companyIdFromQuery = c.req.query("companyId");
    const companyIdFromHeader = c.req.header("X-Tenant-ID");
    console.log("[GET /users/admin] Usu\xE1rio:", currentUser?.role);
    console.log("[GET /users/admin] companyId - Context:", companyIdFromContext);
    console.log("[GET /users/admin] companyId - Query:", companyIdFromQuery);
    console.log("[GET /users/admin] companyId - Header:", companyIdFromHeader);
    if (currentUser.role !== "super_admin") {
      return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
    }
    let companyId = companyIdFromContext || companyIdFromQuery || companyIdFromHeader;
    console.log("[GET /users/admin] companyId final (antes da valida\xE7\xE3o):", companyId);
    const uuidRegex2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (companyId && !uuidRegex2.test(companyId)) {
      console.error("[GET /users/admin] companyId inv\xE1lido (n\xE3o \xE9 UUID):", companyId);
      return c.json({ error: { message: "Invalid companyId format (must be UUID)", code: "VALIDATION_ERROR" } }, 400);
    }
    if (!companyId) {
      return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
    }
    console.log("[GET /users/admin] companyId final (validado):", companyId);
    const page = parseInt(c.req.query("page") || "1", 10);
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const role = c.req.query("role");
    const result = await userService.list(companyId, { page, limit, role });
    return c.json({
      data: {
        users: result.users.map(toUserResponse),
        total: result.total,
        page: result.page,
        limit: result.limit
      }
    });
  } catch (error) {
    console.error("[GET /users/admin] Erro:", error);
    return errorHandler2(error, c);
  }
});
adminRoutes.post(
  "/admin",
  zValidator("json", CreateUserSchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const companyId = c.req.query("companyId");
      if (!companyId) {
        return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
      }
      const data = c.req.valid("json");
      const user = await userService.create(companyId, {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role
      });
      return c.json(
        { data: { user: toUserResponse(user) } },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
adminRoutes.post(
  "/admin/super-admin",
  zValidator("json", CreateUserSchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const data = c.req.valid("json");
      const user = await userService.createSuperAdmin({
        name: data.name,
        email: data.email,
        password: data.password
      });
      return c.json(
        { data: { user: toUserResponse(user) } },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
adminRoutes.get("/admin/super-admins", async (c) => {
  try {
    const currentUser = c.get("user");
    if (!currentUser) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }
    if (currentUser.role !== "super_admin") {
      return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
    }
    const users = await userService.listSuperAdmins();
    console.log("[GET /users/admin/super-admins] Found", users.length, "super admins");
    return c.json({ data: { users: users.map(toUserResponse) } });
  } catch (error) {
    console.error("[GET /users/admin/super-admins] Error:", error);
    console.error("[GET /users/admin/super-admins] Error stack:", error instanceof Error ? error.stack : "No stack");
    return errorHandler2(error, c);
  }
});
userRoutes.route("/", adminRoutes);
userRoutes.get("/", async (c) => {
  try {
    const tenantId = c.get("companyId");
    if (!tenantId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const page = parseInt(c.req.query("page") || "1", 10);
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const role = c.req.query("role");
    const result = await userService.list(tenantId, { page, limit, role });
    return c.json({
      data: {
        users: result.users.map(toUserResponse),
        total: result.total,
        page: result.page,
        limit: result.limit
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
userRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (id === "admin") {
      return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
    }
    const tenantId = c.get("companyId");
    if (!tenantId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const user = await userService.getById(id, tenantId);
    return c.json({
      data: { user: toUserResponse(user) }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
function formatCreateUserValidationMessage(err) {
  const first = err.errors[0];
  if (!first) return "Dados inv\xE1lidos. Verifique nome, e-mail e senha.";
  const path2 = first.path[0];
  if (path2 === "name") return "Nome deve ter no m\xEDnimo 3 caracteres.";
  if (path2 === "email") return "Informe um e-mail v\xE1lido.";
  if (path2 === "password") return "Senha deve ter no m\xEDnimo 8 caracteres.";
  if (path2 === "role") return "Perfil (role) inv\xE1lido.";
  return first.message || "Dados inv\xE1lidos. Verifique os campos e tente novamente.";
}
userRoutes.post(
  "/",
  zValidator("json", CreateUserSchema, (result, c) => {
    if (!result.success) {
      const message = formatCreateUserValidationMessage(result.error);
      return c.json(
        { error: { message, code: "VALIDATION_ERROR", details: result.error.errors } },
        400
      );
    }
    return;
  }),
  async (c) => {
    try {
      const tenantId = c.get("companyId");
      if (!tenantId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      const data = c.req.valid("json");
      const user = await userService.create(tenantId, {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role
      });
      return c.json(
        { data: { user: toUserResponse(user) } },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
userRoutes.put(
  "/:id",
  zValidator("json", UpdateUserSchema),
  async (c) => {
    try {
      const tenantId = c.get("companyId");
      if (!tenantId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const currentUser = c.get("user");
      const user = await userService.update(id, tenantId, data, currentUser);
      return c.json({
        data: { user: toUserResponse(user) }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
userRoutes.delete("/:id", async (c) => {
  try {
    const tenantId = c.get("companyId");
    if (!tenantId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const id = c.req.param("id");
    const currentUser = c.get("user");
    await userService.delete(id, tenantId, currentUser);
    return c.json({
      data: {
        success: true
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});

// src/modules/companies/company.routes.ts
var companyRoutes = new Hono2();
var companyRepo2 = new CompanyRepository();
var companyService2 = new CompanyService(companyRepo2);
companyRoutes.get(
  "/",
  authMiddleware,
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json(
          {
            error: {
              message: "Only super admin can list all companies",
              code: "FORBIDDEN"
            }
          },
          403
        );
      }
      const companies = await companyRepo2.findAll();
      return c.json({
        data: {
          companies,
          total: companies.length
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
companyRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", CreateCompanySchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json(
          {
            error: {
              message: "Only super admin can create companies",
              code: "FORBIDDEN"
            }
          },
          403
        );
      }
      const data = c.req.valid("json");
      const company = await companyService2.create(data);
      return c.json(
        {
          data: {
            company
          }
        },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
companyRoutes.use("/*", tenantMiddleware);
companyRoutes.use("/*", authMiddleware);
companyRoutes.get("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    if (id !== companyId) {
      return c.json(
        {
          error: {
            message: "Cannot access other companies",
            code: "FORBIDDEN"
          }
        },
        403
      );
    }
    const company = await companyService2.getById(id);
    return c.json({
      data: {
        company
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
companyRoutes.put(
  "/:id",
  zValidator("json", UpdateCompanySchema),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      const id = c.req.param("id");
      const currentUser = c.get("user");
      if (id !== companyId) {
        return c.json(
          {
            error: {
              message: "Cannot access other companies",
              code: "FORBIDDEN"
            }
          },
          403
        );
      }
      if (currentUser.role !== "admin") {
        return c.json(
          {
            error: {
              message: "Insufficient permissions",
              code: "FORBIDDEN"
            }
          },
          403
        );
      }
      const data = c.req.valid("json");
      const company = await companyService2.update(id, data);
      return c.json({
        data: {
          company
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);

// src/modules/clients/client.service.ts
var ClientService = class {
  constructor(clientRepo7) {
    this.clientRepo = clientRepo7;
  }
  /**
   * Criar cliente com validação de CNPJ único
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async create(data) {
    const existing = await this.clientRepo.findByCnpj(data.cnpj);
    if (existing) {
      throw new AppError("CNPJ already exists", "CNPJ_ALREADY_EXISTS", 409);
    }
    return this.clientRepo.create(data);
  }
  /**
   * Atualizar cliente
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async update(id, data) {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
    }
    if (data.cnpj && data.cnpj !== client.cnpj) {
      const existing = await this.clientRepo.findByCnpj(data.cnpj);
      if (existing) {
        throw new AppError("CNPJ already exists", "CNPJ_ALREADY_EXISTS", 409);
      }
    }
    return this.clientRepo.update(id, data);
  }
  /**
   * Deletar cliente
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async delete(id) {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
    }
    await this.clientRepo.delete(id);
  }
  /**
   * Listar clientes com paginação
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async list(options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const result = await this.clientRepo.list({
      page,
      limit,
      status: options.status
    });
    return {
      clients: result.clients,
      total: result.total,
      page,
      limit
    };
  }
  /**
   * Buscar cliente por ID
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async getById(id) {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
    }
    return client;
  }
};

// src/modules/clients/client.repository.ts
var ClientRepository = class extends BaseRepository {
  /**
   * Buscar cliente por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id) {
    const result = await this.query(
      `SELECT id, name, cnpj, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients WHERE id = $1`,
      [id],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar cliente por CNPJ
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findByCnpj(cnpj) {
    const result = await this.query(
      `SELECT id, name, cnpj, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients WHERE cnpj = $1`,
      [cnpj],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }
  /**
   * Criar cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async create(data) {
    const result = await this.query(
      `INSERT INTO clients (name, cnpj, email, tax_regime, cnae, 
                           state_registration, municipal_registration, notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') 
       RETURNING id, name, cnpj, email, status, tax_regime, cnae, 
                 state_registration, municipal_registration, notes, 
                 created_at, updated_at`,
      [
        data.name,
        data.cnpj,
        data.email || null,
        data.tax_regime || null,
        data.cnae || null,
        data.state_registration || null,
        data.municipal_registration || null,
        data.notes || null
      ],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }
  /**
   * Atualizar cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async update(id, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (data.name !== void 0) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.cnpj !== void 0) {
      updates.push(`cnpj = $${paramIndex++}`);
      params.push(data.cnpj);
    }
    if (data.email !== void 0) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.status !== void 0) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.tax_regime !== void 0) {
      updates.push(`tax_regime = $${paramIndex++}`);
      params.push(data.tax_regime);
    }
    if (data.cnae !== void 0) {
      updates.push(`cnae = $${paramIndex++}`);
      params.push(data.cnae);
    }
    if (data.state_registration !== void 0) {
      updates.push(`state_registration = $${paramIndex++}`);
      params.push(data.state_registration);
    }
    if (data.municipal_registration !== void 0) {
      updates.push(`municipal_registration = $${paramIndex++}`);
      params.push(data.municipal_registration);
    }
    if (data.notes !== void 0) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(data.notes);
    }
    if (updates.length === 0) {
      return this.findById(id);
    }
    params.push(id);
    const result = await this.query(
      `UPDATE clients 
       SET ${updates.join(", ")}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, name, cnpj, email, status, tax_regime, cnae, 
                 state_registration, municipal_registration, notes, 
                 created_at, updated_at`,
      params,
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }
  /**
   * Deletar cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async delete(id) {
    await this.query(
      "DELETE FROM clients WHERE id = $1",
      [id],
      false
      // Não requer company_id (isolado por schema)
    );
  }
  /**
   * Listar clientes (com paginação)
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async list(options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = "";
    if (options.status) {
      whereClause = "WHERE status = $1";
      params.push(options.status);
    }
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM clients ${whereClause}`,
      params,
      false
      // Não requer company_id (isolado por schema)
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    const clientsResult = await this.query(
      `SELECT id, name, cnpj, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      false
      // Não requer company_id (isolado por schema)
    );
    return {
      clients: clientsResult.rows,
      total
    };
  }
};

// src/modules/clients/client.routes.ts
var clientRoutes = new Hono2();
clientRoutes.use("/*", authMiddleware);
clientRoutes.use("/*", tenantMiddleware);
var clientRepo = new ClientRepository();
var clientService = new ClientService(clientRepo);
var companyRepo3 = new CompanyRepository();
var companyService3 = new CompanyService(companyRepo3);
clientRoutes.get("/", async (c) => {
  try {
    const currentUser = c.get("user");
    const companyId = c.get("companyId");
    if (currentUser.role === "super_admin" && !companyId) {
      const companies = await companyRepo3.findAll();
      console.log("Super admin - Companies found:", companies.length);
      const clientsData = companies.map((company) => {
        const created_at = company.created_at ? typeof company.created_at === "string" ? company.created_at : new Date(company.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
        return {
          id: company.id,
          name: company.name,
          domain: company.domain,
          cnpj: company.cnpj || null,
          email: company.email || null,
          status: "active",
          // Todas as empresas são consideradas ativas
          created_at
          // Usar snake_case para compatibilidade
        };
      });
      console.log("Super admin - Clients data:", clientsData.length);
      return c.json({
        data: {
          clients: clientsData,
          total: companies.length,
          page: 1,
          limit: companies.length
        }
      });
    }
    if (!companyId) {
      return c.json(
        {
          error: {
            message: "Company ID is required",
            code: "COMPANY_ID_REQUIRED"
          }
        },
        400
      );
    }
    const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
    await query(`SET search_path TO "${schemaName}", public`);
    const page = parseInt(c.req.query("page") || "1", 10);
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const status = c.req.query("status");
    const result = await clientService.list({ page, limit, status });
    const clientsWithStatus = result.clients.map((client) => ({
      ...client,
      status: client.status || "active"
      // Default para 'active' se não tiver status
    }));
    return c.json({
      data: {
        ...result,
        clients: clientsWithStatus
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
clientRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const client = await clientService.getById(id);
    return c.json({
      data: {
        client: {
          id: client.id,
          name: client.name,
          cnpj: client.cnpj,
          email: client.email,
          status: client.status,
          tax_regime: client.tax_regime,
          cnae: client.cnae,
          state_registration: client.state_registration,
          municipal_registration: client.municipal_registration,
          notes: client.notes,
          created_at: client.created_at,
          updated_at: client.updated_at
        }
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
clientRoutes.post(
  "/",
  async (c) => {
    try {
      const currentUser = c.get("user");
      let companyId = c.get("companyId");
      let data;
      const body = await c.req.json();
      if (currentUser.role === "super_admin" && !companyId) {
        const result = CreateCompanySchema.safeParse(body);
        if (!result.success) {
          return c.json(
            {
              error: {
                message: "Validation error",
                code: "VALIDATION_ERROR",
                details: result.error.errors
              }
            },
            400
          );
        }
        data = result.data;
      } else {
        const result = CreateClientSchema.safeParse(body);
        if (!result.success) {
          return c.json(
            {
              error: {
                message: "Validation error",
                code: "VALIDATION_ERROR",
                details: result.error.errors
              }
            },
            400
          );
        }
        data = result.data;
        if (!data.cnpj) {
          return c.json(
            {
              error: {
                message: "CNPJ is required",
                code: "VALIDATION_ERROR"
              }
            },
            400
          );
        }
      }
      if (currentUser.role === "super_admin" && !companyId) {
        try {
          const company = await companyService3.create({
            ...data,
            domain: data.email ? data.email.split("@")[1] : data.domain
          });
          companyId = company.id;
          c.set("companyId", companyId);
          return c.json(
            {
              data: {
                client: {
                  id: company.id,
                  name: company.name,
                  domain: company.domain,
                  cnpj: company.cnpj,
                  status: "active",
                  createdAt: company.created_at
                },
                message: "Empresa e schema criados automaticamente"
              }
            },
            201
          );
        } catch (error) {
          if (error.code === "CNPJ_ALREADY_EXISTS" || error.code === "DOMAIN_ALREADY_EXISTS") {
            return c.json(
              {
                error: {
                  message: error.message || "Empresa j\xE1 existe",
                  code: error.code
                }
              },
              409
            );
          }
          throw error;
        }
      }
      if (!companyId) {
        return c.json(
          {
            error: {
              message: "Company ID is required",
              code: "COMPANY_ID_REQUIRED"
            }
          },
          400
        );
      }
      const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
      await query(`SET search_path TO "${schemaName}", public`);
      const client = await clientService.create({
        name: data.name,
        cnpj: data.cnpj,
        email: data.email,
        tax_regime: data.tax_regime,
        cnae: data.cnae,
        state_registration: data.state_registration,
        municipal_registration: data.municipal_registration,
        notes: data.notes
      });
      return c.json(
        {
          data: {
            client: {
              id: client.id,
              name: client.name,
              cnpj: client.cnpj,
              email: client.email,
              status: client.status,
              tax_regime: client.tax_regime,
              cnae: client.cnae,
              state_registration: client.state_registration,
              municipal_registration: client.municipal_registration,
              notes: client.notes
            }
          }
        },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
clientRoutes.put(
  "/:id",
  zValidator("json", UpdateClientSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const client = await clientService.update(id, data);
      return c.json({
        data: {
          client: {
            id: client.id,
            name: client.name,
            cnpj: client.cnpj,
            email: client.email,
            status: client.status,
            tax_regime: client.tax_regime,
            cnae: client.cnae,
            state_registration: client.state_registration,
            municipal_registration: client.municipal_registration,
            notes: client.notes,
            updated_at: client.updated_at
          }
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
clientRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await clientService.delete(id);
    return c.json({
      data: {
        success: true
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});

// src/modules/plans/plan.service.ts
var PlanService = class {
  constructor(planRepo6) {
    this.planRepo = planRepo6;
  }
  /**
   * Listar todos os planos (apenas ativos)
   */
  async list() {
    return this.planRepo.findAll();
  }
  /**
   * Listar todos os planos para admin (ativos + inativos)
   */
  async listForAdmin() {
    return this.planRepo.findAllForAdmin();
  }
  /**
   * Buscar plano por ID
   */
  async getById(id) {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
    }
    return plan;
  }
  /**
   * Criar plano
   */
  async create(data) {
    return this.planRepo.create(data);
  }
  /**
   * Atualizar plano
   */
  async update(id, data) {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
    }
    return this.planRepo.update(id, data);
  }
  /**
   * Deletar plano
   */
  async delete(id) {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
    }
    await this.planRepo.delete(id);
  }
};

// src/modules/plans/plan.routes.ts
var planRoutes = new Hono2();
var planRepo3 = new PlanRepository();
var planService = new PlanService(planRepo3);
planRoutes.get("/", async (c) => {
  try {
    const plans = await planService.list();
    return c.json({
      data: { plans }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
planRoutes.use("/admin/*", authMiddleware);
function canManagePlans(c) {
  const user = c.get("user");
  const jwt2 = c.get("jwt");
  const role = (user?.role ?? jwt2?.role ?? "").toString().trim().toLowerCase();
  return role === "admin" || role === "super_admin";
}
planRoutes.get("/admin", async (c) => {
  try {
    if (!canManagePlans(c)) {
      return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
    }
    const plans = await planService.listForAdmin();
    return c.json({ data: { plans } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
planRoutes.post(
  "/admin",
  zValidator("json", CreatePlanSchema),
  async (c) => {
    try {
      if (!canManagePlans(c)) {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const data = c.req.valid("json");
      const plan = await planService.create({
        name: data.name,
        maxUsers: data.maxUsers,
        maxClients: data.maxClients,
        price: data.price,
        billingCycle: data.billingCycle,
        features: data.features,
        isCustom: data.isCustom,
        isManaged: data.isManaged
      });
      return c.json(
        {
          data: { plan }
        },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
planRoutes.put(
  "/admin/:id",
  zValidator("json", UpdatePlanSchema),
  async (c) => {
    try {
      if (!canManagePlans(c)) {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const plan = await planService.update(id, {
        name: data.name,
        maxUsers: data.maxUsers,
        maxClients: data.maxClients,
        price: data.price,
        billingCycle: data.billingCycle,
        features: data.features,
        isCustom: data.isCustom,
        isManaged: data.isManaged,
        status: data.status
      });
      return c.json({
        data: { plan }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
planRoutes.delete("/admin/:id", async (c) => {
  try {
    if (!canManagePlans(c)) {
      return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
    }
    const id = c.req.param("id");
    await planService.delete(id);
    return c.json({
      data: { success: true }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
planRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const plan = await planService.getById(id);
    return c.json({
      data: { plan }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});

// src/modules/feature-toggles/feature-toggle.repository.ts
var FeatureToggleRepository = class extends BaseRepository {
  /**
   * Buscar todos os módulos disponíveis
   */
  async findAll() {
    console.log("[FeatureToggleRepository.findAll] Executando query...");
    const result = await this.query(
      "SELECT id, name, key, description, created_at FROM public.modules ORDER BY name",
      [],
      false
      // modules não requerem filtro de tenant
    );
    console.log(`[FeatureToggleRepository.findAll] Query executada, encontrados ${result.rows.length} m\xF3dulos`);
    return result.rows;
  }
  /**
   * Buscar módulo por key
   */
  async findByKey(key) {
    const result = await this.query(
      "SELECT id, name, key, description, created_at FROM public.modules WHERE key = $1",
      [key],
      false
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar módulo por ID
   */
  async findById(id) {
    const result = await this.query(
      "SELECT id, name, key, description, created_at FROM public.modules WHERE id = $1",
      [id],
      false
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar módulos ativos por tenant
   */
  async findActiveByTenant(tenantId) {
    const result = await this.query(
      `SELECT m.id, m.name, m.key, m.description, m.created_at, tm.enabled_until
       FROM public.modules m
       INNER JOIN public.tenant_modules tm ON tm.module_id = m.id
       WHERE tm.tenant_id = $1 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())
       ORDER BY m.name`,
      [tenantId],
      false
      // tenant_modules já filtra por tenant_id
    );
    return result.rows;
  }
  /**
   * Verificar se módulo está ativo para tenant
   */
  async isActive(tenantId, moduleKey) {
    const result = await this.query(
      `SELECT tm.id 
       FROM public.tenant_modules tm
       JOIN public.modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = $1 AND m.key = $2 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())`,
      [tenantId, moduleKey],
      false
    );
    return result.rows.length > 0;
  }
  /**
   * Ativar módulo para tenant
   */
  async activateForTenant(tenantId, moduleId, enabledUntil) {
    const result = await this.query(
      `INSERT INTO public.tenant_modules (tenant_id, module_id, enabled_until)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, module_id) 
       DO UPDATE SET enabled_until = $3
       RETURNING id, tenant_id, module_id, enabled_until, created_at`,
      [tenantId, moduleId, enabledUntil || null],
      false
    );
    return result.rows[0];
  }
  /**
   * Desativar módulo para tenant
   */
  async deactivateForTenant(tenantId, moduleId) {
    await this.query(
      "DELETE FROM public.tenant_modules WHERE tenant_id = $1 AND module_id = $2",
      [tenantId, moduleId],
      false
    );
  }
  /**
   * Buscar módulos associados a um plano
   */
  async findModulesByPlan(planId) {
    const result = await this.query(
      `SELECT m.id, m.name, m.key, m.description, m.created_at, pm.is_default
       FROM public.modules m
       INNER JOIN public.plan_modules pm ON pm.module_id = m.id
       WHERE pm.plan_id = $1
       ORDER BY m.name`,
      [planId],
      false
    );
    return result.rows;
  }
  /**
   * Associar módulo a um plano
   */
  async addModuleToPlan(planId, moduleId, isDefault = true) {
    await this.query(
      `INSERT INTO public.plan_modules (plan_id, module_id, is_default)
       VALUES ($1, $2, $3)
       ON CONFLICT (plan_id, module_id)
       DO UPDATE SET is_default = $3`,
      [planId, moduleId, isDefault],
      false
    );
  }
  /**
   * Remover módulo de um plano
   */
  async removeModuleFromPlan(planId, moduleId) {
    await this.query(
      "DELETE FROM public.plan_modules WHERE plan_id = $1 AND module_id = $2",
      [planId, moduleId],
      false
    );
  }
  /**
   * Ativar módulos padrão de um plano para um tenant
   * (chamado quando tenant assina um plano)
   */
  async activatePlanModulesForTenant(tenantId, planId) {
    const planModules = await this.findModulesByPlan(planId);
    for (const planModule of planModules) {
      if (planModule.is_default) {
        const isActive = await this.isActive(tenantId, planModule.key);
        if (!isActive) {
          await this.activateForTenant(tenantId, planModule.id, void 0);
        }
      }
    }
  }
};

// src/modules/feature-toggles/feature-toggle.service.ts
var FeatureToggleService = class {
  constructor(repo3) {
    this.repo = repo3;
  }
  /**
   * Verificar se módulo está ativo para tenant
   * Método estático para uso em middlewares e outros serviços
   */
  static async verify(companyId, moduleKey) {
    const repo3 = new FeatureToggleRepository();
    return repo3.isActive(companyId, moduleKey);
  }
  /**
   * Listar módulos disponíveis
   */
  async listAvailable() {
    return this.repo.findAll();
  }
  /**
   * Listar módulos ativos do tenant
   */
  async listActive(companyId) {
    return this.repo.findActiveByTenant(companyId);
  }
  /**
   * Ativar módulo para tenant
   */
  async activate(companyId, moduleId, enabledUntil) {
    const module2 = await this.repo.findById(moduleId);
    if (!module2) {
      throw new Error("Module not found");
    }
    return this.repo.activateForTenant(companyId, moduleId, enabledUntil);
  }
  /**
   * Desativar módulo para tenant
   */
  async deactivate(companyId, moduleId) {
    const module2 = await this.repo.findById(moduleId);
    if (!module2) {
      throw new Error("Module not found");
    }
    await this.repo.deactivateForTenant(companyId, moduleId);
  }
  /**
   * Buscar módulos associados a um plano
   */
  async getModulesByPlan(planId) {
    return this.repo.findModulesByPlan(planId);
  }
  /**
   * Associar módulo a um plano
   */
  async addModuleToPlan(planId, moduleId, isDefault = true) {
    const module2 = await this.repo.findById(moduleId);
    if (!module2) {
      throw new Error("Module not found");
    }
    await this.repo.addModuleToPlan(planId, moduleId, isDefault);
  }
  /**
   * Remover módulo de um plano
   */
  async removeModuleFromPlan(planId, moduleId) {
    await this.repo.removeModuleFromPlan(planId, moduleId);
  }
  /**
   * Ativar módulos padrão de um plano para um tenant
   */
  async activatePlanModulesForTenant(tenantId, planId) {
    await this.repo.activatePlanModulesForTenant(tenantId, planId);
  }
};

// src/modules/feature-toggles/feature-toggle.routes.ts
var featureToggleRoutes = new Hono2();
featureToggleRoutes.use("/*", authMiddleware);
var tenantRoutes = new Hono2();
tenantRoutes.use("/*", tenantMiddleware);
featureToggleRoutes.use("/admin/*", authMiddleware);
var repo = new FeatureToggleRepository();
var service = new FeatureToggleService(repo);
featureToggleRoutes.get("/", async (c) => {
  try {
    console.log("[GET /modules] Listando m\xF3dulos dispon\xEDveis...");
    const modules = await service.listAvailable();
    console.log(`[GET /modules] Encontrados ${modules.length} m\xF3dulos:`, modules.map((m) => ({ id: m.id, name: m.name, key: m.key })));
    return c.json({
      data: {
        modules
      }
    });
  } catch (error) {
    console.error("[GET /modules] Erro ao listar m\xF3dulos:", error);
    return errorHandler2(error, c);
  }
});
tenantRoutes.get("/active", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const modules = await service.listActive(companyId);
    const keys = modules.map((m) => m.key);
    if (process.env.NODE_ENV !== "production") {
      console.log("[GET /modules/active] companyId=", companyId, "count=", modules.length, "keys=", keys);
    }
    return c.json({
      data: {
        modules,
        _debug: process.env.NODE_ENV !== "production" ? { companyId, count: modules.length, keys } : void 0
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
tenantRoutes.post(
  "/:id/activate",
  zValidator("json", ActivateModuleSchema),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      const currentUser = c.get("user");
      const moduleId = c.req.param("id");
      const data = c.req.valid("json");
      if (currentUser.role !== "admin") {
        return c.json(
          {
            error: {
              message: "Insufficient permissions",
              code: "FORBIDDEN"
            }
          },
          403
        );
      }
      const tenantModule = await service.activate(
        companyId,
        data.moduleId || moduleId,
        data.enabledUntil
      );
      return c.json({
        data: {
          module: tenantModule
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
tenantRoutes.post(
  "/:id/deactivate",
  zValidator("param", external_exports.object({ id: external_exports.string().uuid() })),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      const currentUser = c.get("user");
      const { id: moduleId } = c.req.valid("param");
      if (currentUser.role !== "admin") {
        return c.json(
          {
            error: {
              message: "Insufficient permissions",
              code: "FORBIDDEN"
            }
          },
          403
        );
      }
      await service.deactivate(companyId, moduleId);
      return c.json({
        data: {
          success: true
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
featureToggleRoutes.get("/admin/active", async (c) => {
  try {
    const currentUser = c.get("user");
    if (currentUser.role !== "super_admin") {
      return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
    }
    const companyId = c.req.query("companyId");
    if (!companyId) {
      return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
    }
    const modules = await service.listActive(companyId);
    return c.json({ data: { modules } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
featureToggleRoutes.post(
  "/admin/:id/activate",
  zValidator("json", ActivateModuleSchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const companyId = c.req.query("companyId");
      if (!companyId) {
        return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
      }
      const moduleId = c.req.param("id");
      const data = c.req.valid("json");
      const tenantModule = await service.activate(
        companyId,
        data.moduleId || moduleId,
        data.enabledUntil
      );
      return c.json({ data: { module: tenantModule } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
featureToggleRoutes.post(
  "/admin/:id/deactivate",
  zValidator("param", external_exports.object({ id: external_exports.string().uuid() })),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const companyId = c.req.query("companyId");
      if (!companyId) {
        return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
      }
      const { id: moduleId } = c.req.valid("param");
      await service.deactivate(companyId, moduleId);
      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
featureToggleRoutes.get(
  "/plans/:planId",
  zValidator("param", PlanIdParamSchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const { planId } = c.req.valid("param");
      const modules = await service.getModulesByPlan(planId);
      return c.json({ data: { modules } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
featureToggleRoutes.post(
  "/plans/:planId",
  zValidator("param", PlanIdParamSchema),
  zValidator("json", AddModuleToPlanSchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const { planId } = c.req.valid("param");
      const { moduleId, isDefault } = c.req.valid("json");
      await service.addModuleToPlan(planId, moduleId, isDefault);
      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
featureToggleRoutes.delete(
  "/plans/:planId/:moduleId",
  zValidator("param", external_exports.object({ planId: external_exports.string().uuid(), moduleId: external_exports.string().uuid() })),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const { planId, moduleId } = c.req.valid("param");
      await service.removeModuleFromPlan(planId, moduleId);
      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
featureToggleRoutes.route("/", tenantRoutes);

// src/modules/subscriptions/subscription.routes.ts
var subscriptionRoutes = new Hono2();
subscriptionRoutes.use("/admin/*", authMiddleware);
subscriptionRoutes.use("/*", tenantMiddleware);
subscriptionRoutes.use("/*", authMiddleware);
var subscriptionRepo3 = new SubscriptionRepository();
var planRepo4 = new PlanRepository();
var subscriptionService2 = new SubscriptionService(subscriptionRepo3, planRepo4);
subscriptionRoutes.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const subscription = await subscriptionService2.getByCompany(companyId);
    return c.json({ data: { subscription } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
subscriptionRoutes.post(
  "/",
  zValidator("json", CreateSubscriptionSchema),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      const data = c.req.valid("json");
      const subscription = await subscriptionService2.create(companyId, { planId: data.planId }, { allowCustomPlan: false });
      return c.json({ data: { subscription } }, 201);
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
subscriptionRoutes.put(
  "/",
  zValidator("json", UpdateSubscriptionSchema),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      const data = c.req.valid("json");
      const subscription = await subscriptionService2.update(companyId, data, { allowCustomPlan: false });
      return c.json({ data: { subscription } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
subscriptionRoutes.post(
  "/cancel",
  zValidator("json", CancelSubscriptionSchema),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      await subscriptionService2.updateStatus(companyId, "canceled");
      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
subscriptionRoutes.get("/admin", async (c) => {
  try {
    const currentUser = c.get("user");
    if (currentUser.role !== "super_admin") {
      return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
    }
    const companyId = c.req.query("companyId");
    if (!companyId) {
      return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
    }
    try {
      const subscription = await subscriptionService2.getByCompany(companyId);
      return c.json({ data: { subscription } });
    } catch (error) {
      if (error.code === "SUBSCRIPTION_NOT_FOUND" || error.message?.includes("Subscription not found")) {
        return c.json({ data: { subscription: null } });
      }
      throw error;
    }
  } catch (error) {
    return errorHandler2(error, c);
  }
});
subscriptionRoutes.post(
  "/admin",
  zValidator("json", CreateSubscriptionSchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const companyId = c.req.query("companyId");
      if (!companyId) {
        return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
      }
      const data = c.req.valid("json");
      const subscription = await subscriptionService2.create(companyId, data, { allowCustomPlan: true });
      return c.json({ data: { subscription } }, 201);
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
subscriptionRoutes.put(
  "/admin",
  zValidator("json", UpdateSubscriptionSchema),
  async (c) => {
    try {
      const currentUser = c.get("user");
      if (currentUser.role !== "super_admin") {
        return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
      }
      const companyId = c.req.query("companyId");
      if (!companyId) {
        return c.json({ error: { message: "companyId is required", code: "VALIDATION_ERROR" } }, 400);
      }
      const data = c.req.valid("json");
      const existing = await subscriptionService2.getByCompany(companyId);
      if (!existing) {
        if (!data.planId) {
          return c.json({ error: { message: "planId is required when creating new subscription", code: "VALIDATION_ERROR" } }, 400);
        }
        const subscription2 = await subscriptionService2.create(companyId, { planId: data.planId }, { allowCustomPlan: true });
        return c.json({ data: { subscription: subscription2 } });
      }
      const subscription = await subscriptionService2.update(companyId, data, { allowCustomPlan: true });
      return c.json({ data: { subscription } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);

// src/modules/billing/billing.service.ts
var import_stripe = __toESM(require("stripe"));
var stripeSecret = process.env.STRIPE_SECRET_KEY;
var stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
function getStripe() {
  if (!stripeSecret) {
    throw new AppError("Stripe is not configured", "STRIPE_NOT_CONFIGURED", 503);
  }
  return new import_stripe.default(stripeSecret);
}
var BillingService = class {
  constructor(subscriptionRepo5, planRepo6, companyRepo6) {
    this.subscriptionRepo = subscriptionRepo5;
    this.planRepo = planRepo6;
    this.companyRepo = companyRepo6;
  }
  /**
   * Lista faturas (invoices) do cliente no Stripe.
   */
  async listInvoices(companyId, limit = 24) {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription?.stripe_customer_id) {
      return [];
    }
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: Math.min(limit, 100)
    });
    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? null,
      status: inv.status ?? "unknown",
      amountPaid: inv.amount_paid ?? 0,
      currency: (inv.currency ?? "brl").toUpperCase(),
      createdAt: inv.created,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
      periodStart: inv.period_start ?? inv.created,
      periodEnd: inv.period_end ?? inv.created
    }));
  }
  /**
   * Cria sessão do Stripe Customer Billing Portal (alterar pagamento, cancelar, faturas).
   */
  async createBillingPortalSession(companyId, returnUrl) {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription?.stripe_customer_id) {
      throw new AppError(
        "Nenhum pagamento configurado para esta conta. Assine um plano pago primeiro.",
        "NO_STRIPE_CUSTOMER",
        400
      );
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl
    });
    return { url: session.url };
  }
  /**
   * Cria sessão do Stripe Checkout para assinar um plano pago.
   */
  async createCheckoutSession(companyId, planId, successUrl, cancelUrl) {
    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
    }
    const stripePriceId = plan.stripe_price_id;
    if (!stripePriceId) {
      throw new AppError(
        'Este plano n\xE3o est\xE1 configurado para pagamento via Stripe. Use "Meu plano" para alterar sem pagamento.',
        "PLAN_NO_STRIPE_PRICE",
        400
      );
    }
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
    }
    const email = company.email || company.contact_email || void 0;
    if (!email) {
      throw new AppError(
        "E-mail da empresa n\xE3o cadastrado. Atualize os dados da empresa.",
        "COMPANY_EMAIL_REQUIRED",
        400
      );
    }
    const stripe = getStripe();
    const existingSubscription = await this.subscriptionRepo.findByCompany(companyId);
    const customerId = existingSubscription?.stripe_customer_id ?? void 0;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId || void 0,
      customer_email: customerId ? void 0 : email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { companyId, planId },
      subscription_data: { metadata: { companyId, planId } }
    });
    if (!session.url) {
      throw new AppError("Stripe did not return checkout URL", "STRIPE_ERROR", 500);
    }
    return { url: session.url };
  }
  /**
   * Processa webhooks do Stripe (assinatura criada/atualizada/cancelada, falha de pagamento).
   */
  async handleWebhook(rawBody, signature) {
    if (!stripeWebhookSecret) {
      throw new AppError("Stripe webhook secret not configured", "STRIPE_NOT_CONFIGURED", 503);
    }
    const stripe = getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature ?? "",
        stripeWebhookSecret
      );
    } catch (err) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, "WEBHOOK_INVALID", 400);
    }
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.companyId;
        const planId = session.metadata?.planId;
        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;
        if (!companyId || !planId) break;
        const existing = await this.subscriptionRepo.findByCompany(companyId);
        if (existing) {
          await this.subscriptionRepo.update(companyId, {
            planId,
            status: "active",
            stripeSubscriptionId: stripeSubscriptionId ?? void 0,
            stripeCustomerId: stripeCustomerId ?? void 0
          });
        } else {
          await this.subscriptionRepo.create(companyId, {
            planId,
            stripeSubscriptionId: stripeSubscriptionId ?? void 0,
            stripeCustomerId: stripeCustomerId ?? void 0
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const stripeSub = event.data.object;
        const existing = await this.subscriptionRepo.findByStripeId(stripeSub.id);
        if (!existing) break;
        const status = this.mapStripeStatus(stripeSub.status);
        await this.subscriptionRepo.update(existing.company_id, {
          status,
          currentPeriodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1e3) : void 0,
          currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1e3) : void 0
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const existing = await this.subscriptionRepo.findByStripeId(sub.id);
        if (!existing) break;
        await this.subscriptionRepo.update(existing.company_id, {
          status: "canceled",
          canceledAt: /* @__PURE__ */ new Date()
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;
        if (!stripeSubId) break;
        const existing = await this.subscriptionRepo.findByStripeId(stripeSubId);
        if (!existing) break;
        await this.subscriptionRepo.updateStatus(existing.company_id, "past_due");
        break;
      }
      default:
        break;
    }
  }
  mapStripeStatus(stripeStatus) {
    switch (stripeStatus) {
      case "active":
        return "active";
      case "past_due":
      case "unpaid":
        return "past_due";
      case "canceled":
      case "incomplete_expired":
        return "canceled";
      case "trialing":
        return "trialing";
      default:
        return "active";
    }
  }
};

// src/modules/billing/billing.routes.ts
var BillingPortalSessionSchema2 = external_exports.object({ returnUrl: external_exports.string().url() });
var BillingCheckoutSessionSchema2 = external_exports.object({
  planId: external_exports.string().uuid(),
  successUrl: external_exports.string().url(),
  cancelUrl: external_exports.string().url()
});
var subscriptionRepo4 = new SubscriptionRepository();
var planRepo5 = new PlanRepository();
var companyRepo4 = new CompanyRepository();
var billingService = new BillingService(subscriptionRepo4, planRepo5, companyRepo4);
var billingWebhookRoutes = new Hono2();
billingWebhookRoutes.post("/stripe", async (c) => {
  try {
    const signature = c.req.header("Stripe-Signature") ?? null;
    const rawBody = await c.req.text();
    await billingService.handleWebhook(rawBody, signature);
    return c.json({ received: true });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
var billingApiRoutes = new Hono2();
billingApiRoutes.use("/*", tenantMiddleware);
billingApiRoutes.use("/*", authMiddleware);
billingApiRoutes.get("/invoices", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const limit = Math.min(parseInt(c.req.query("limit") || "24", 10), 100);
    const invoices = await billingService.listInvoices(companyId, limit);
    return c.json({ data: { invoices } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
billingApiRoutes.post("/portal-session", zValidator("json", BillingPortalSessionSchema2), async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const body = c.req.valid("json");
    const { url } = await billingService.createBillingPortalSession(companyId, body.returnUrl);
    return c.json({ data: { url } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
billingApiRoutes.post("/checkout-session", zValidator("json", BillingCheckoutSessionSchema2), async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const body = c.req.valid("json");
    const { url } = await billingService.createCheckoutSession(
      companyId,
      body.planId,
      body.successUrl,
      body.cancelUrl
    );
    return c.json({ data: { url } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});

// src/shared/services/storage.service.ts
var import_supabase_js = require("@supabase/supabase-js");
var supabaseClient = null;
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [];
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_KEY");
    throw new AppError(
      `Missing required environment variables: ${missing.join(", ")}. Please configure them in your .env file.`,
      "STORAGE_CONFIG_ERROR",
      500
    );
  }
  if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
    throw new AppError(
      `Invalid SUPABASE_URL format. Expected URL starting with http:// or https://`,
      "STORAGE_CONFIG_ERROR",
      500
    );
  }
  if (!supabaseServiceKey.startsWith("eyJ")) {
    throw new AppError(
      `Invalid SUPABASE_SERVICE_KEY format. Expected a JWT token starting with 'eyJ'. Please verify your service role key.`,
      "STORAGE_CONFIG_ERROR",
      500
    );
  }
  supabaseClient = (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return supabaseClient;
}
var FISCAL_FILES_BUCKET = "fiscal-files";
var bucketChecked = false;
async function ensureBucketExists() {
  if (bucketChecked) {
    return true;
  }
  const supabase = getSupabaseClient();
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error("Error listing buckets:", listError);
      throw new AppError(
        `Error accessing storage: ${listError.message || JSON.stringify(listError)}`,
        "STORAGE_ACCESS_ERROR",
        500
      );
    }
    const bucketExists = buckets?.some((b) => b.name === FISCAL_FILES_BUCKET);
    if (bucketExists) {
      bucketChecked = true;
      return true;
    }
    console.log(`Bucket '${FISCAL_FILES_BUCKET}' n\xE3o encontrado. Tentando criar...`);
    const { error: createError } = await supabase.storage.createBucket(FISCAL_FILES_BUCKET, {
      public: false,
      // Bucket privado (usa signed URLs)
      fileSizeLimit: 52428800,
      // 50MB
      allowedMimeTypes: ["text/plain", "application/xml", "text/xml", "application/pdf"]
    });
    if (createError) {
      const errorMsg = createError.message || JSON.stringify(createError);
      if (errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
        console.log(`Bucket '${FISCAL_FILES_BUCKET}' j\xE1 existe (criado por outro processo)`);
        bucketChecked = true;
        return true;
      }
      throw new AppError(
        `Failed to create bucket '${FISCAL_FILES_BUCKET}': ${errorMsg}. Please verify SUPABASE_SERVICE_KEY has storage admin permissions.`,
        "BUCKET_CREATE_ERROR",
        500
      );
    }
    console.log(`\u2705 Bucket '${FISCAL_FILES_BUCKET}' criado com sucesso`);
    bucketChecked = true;
    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Error ensuring bucket exists: ${error instanceof Error ? error.message : "Unknown error"}`,
      "BUCKET_SETUP_ERROR",
      500
    );
  }
}
async function uploadFile(companyId, clientId, competence, file, fileName, mimeType) {
  const supabase = getSupabaseClient();
  if (!/^\d{4}-\d{2}$/.test(competence)) {
    throw new AppError("Invalid competence format. Expected YYYY-MM", "INVALID_COMPETENCE", 400);
  }
  const filePath = `${companyId}/${clientId}/${competence}/${fileName}`;
  try {
    await ensureBucketExists();
    const { error } = await supabase.storage.from(FISCAL_FILES_BUCKET).upload(filePath, file, {
      contentType: mimeType,
      upsert: false
      // Não sobrescrever arquivos existentes
    });
    if (error) {
      let errorMessage = "Unknown error";
      let errorDetails = null;
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        const errorObj = error;
        errorMessage = errorObj.message || errorObj.error || errorObj.statusText || errorObj.statusCode?.toString() || "Unknown error";
        errorDetails = {
          ...errorObj,
          toString: errorObj.toString?.() || String(errorObj)
        };
      }
      if (process.env.NODE_ENV === "development") {
        console.error("Supabase Storage Error:", {
          error,
          errorMessage,
          errorDetails,
          filePath,
          bucket: FISCAL_FILES_BUCKET
        });
      }
      const errorStr = errorMessage.toLowerCase();
      if (errorStr.includes("already exists") || errorStr.includes("duplicate")) {
        throw new AppError(
          `File already exists: ${fileName}`,
          "FILE_ALREADY_EXISTS",
          409
        );
      }
      if (errorStr.includes("not found") || errorStr.includes("bucket") || errorStr.includes("does not exist")) {
        throw new AppError(
          `Storage bucket '${FISCAL_FILES_BUCKET}' not found or not accessible. Please run the setup script to create it: cd apps/api && pnpm run setup`,
          "BUCKET_NOT_FOUND",
          500
        );
      }
      if (errorStr.includes("permission") || errorStr.includes("unauthorized") || errorStr.includes("forbidden")) {
        throw new AppError(
          `Permission denied. Please verify SUPABASE_SERVICE_KEY is correctly configured in your .env file.`,
          "STORAGE_PERMISSION_ERROR",
          500
        );
      }
      if (errorMessage === "Unknown error" && errorDetails) {
        errorMessage = JSON.stringify(errorDetails);
      }
      throw new AppError(
        `Error uploading file: ${errorMessage}`,
        "STORAGE_UPLOAD_ERROR",
        500
      );
    }
    return filePath;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message || error.toString();
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object") {
      errorMessage = JSON.stringify(error);
    }
    throw new AppError(
      `Failed to upload file: ${errorMessage}`,
      "STORAGE_UPLOAD_ERROR",
      500
    );
  }
}
async function generateSignedUrl(filePath, expiresIn = 3600) {
  const supabase = getSupabaseClient();
  await ensureBucketExists();
  const { data, error } = await supabase.storage.from(FISCAL_FILES_BUCKET).createSignedUrl(filePath, expiresIn);
  if (error) {
    throw new AppError(
      `Error generating signed URL: ${error.message}`,
      "STORAGE_SIGNED_URL_ERROR",
      500
    );
  }
  return data.signedUrl;
}
async function deleteFile(filePath) {
  const supabase = getSupabaseClient();
  await ensureBucketExists();
  const { error } = await supabase.storage.from(FISCAL_FILES_BUCKET).remove([filePath]);
  if (error) {
    throw new AppError(
      `Error deleting file: ${error.message}`,
      "STORAGE_DELETE_ERROR",
      500
    );
  }
}

// src/shared/config/storage.config.ts
var STORAGE_CONFIG = {
  bucket: "fiscal-files",
  maxFileSize: 50 * 1024 * 1024,
  // 50MB
  allowedMimeTypes: [
    "text/plain",
    // .txt (SPED, ECD)
    "application/xml",
    // .xml (PGDAS, Notas)
    "text/xml",
    // .xml alternativo
    "application/pdf"
    // .pdf (Extratos)
  ],
  allowedExtensions: [".txt", ".xml", ".pdf"]
};
function validateFileType(fileName, mimeType) {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  if (!STORAGE_CONFIG.allowedExtensions.includes(extension)) {
    return false;
  }
  return STORAGE_CONFIG.allowedMimeTypes.includes(mimeType);
}
function validateFileSize(size) {
  return size <= STORAGE_CONFIG.maxFileSize;
}

// src/modules/fiscal-files/fiscal-file.service.ts
var FiscalFileService = class {
  constructor(fiscalFileRepo3, clientRepo7) {
    this.fiscalFileRepo = fiscalFileRepo3;
    this.clientRepo = clientRepo7;
  }
  /**
   * Upload de arquivo fiscal
   * @param companyId - ID da contabilidade (necessário apenas para estrutura de pastas no storage)
   * @param clientId - ID do cliente
   * @param userId - ID do usuário que está fazendo upload (para logs)
   * NOTA: Schema já isola por tenant para queries no banco, mas companyId é necessário para estrutura de pastas no storage
   */
  async upload(companyId, clientId, competence, fileType, file, fileName, mimeType, userId) {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
    }
    if (!validateFileType(fileName, mimeType)) {
      throw new AppError(
        `Invalid file type. Allowed: ${STORAGE_CONFIG.allowedExtensions.join(", ")}`,
        "INVALID_FILE_TYPE",
        400
      );
    }
    if (!validateFileSize(file.length)) {
      throw new AppError(
        `File size exceeds maximum of ${STORAGE_CONFIG.maxFileSize / 1024 / 1024}MB`,
        "FILE_TOO_LARGE",
        400
      );
    }
    const filePath = await uploadFile(companyId, clientId, competence, file, fileName, mimeType);
    const fiscalFile = await this.fiscalFileRepo.create({
      client_id: clientId,
      file_type: fileType,
      competence,
      file_name: fileName,
      file_path: filePath,
      file_size: file.length,
      mime_type: mimeType
    });
    if (userId) {
      logSensitiveOperation("FISCAL_FILE_UPLOAD", userId, companyId, {
        fiscal_file_id: fiscalFile.id,
        client_id: clientId,
        file_type: fileType,
        competence,
        file_name: fileName,
        file_size: file.length
      });
    }
    return fiscalFile;
  }
  /**
   * Listar arquivos fiscais
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async list(options) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const result = await this.fiscalFileRepo.list({
      client_id: options.client_id,
      competence: options.competence,
      status: options.status,
      page,
      limit
    });
    return {
      files: result.files,
      total: result.total,
      page,
      limit
    };
  }
  /**
   * Buscar arquivo por ID
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async getById(id) {
    const file = await this.fiscalFileRepo.findById(id);
    if (!file) {
      throw new AppError("Fiscal file not found", "FISCAL_FILE_NOT_FOUND", 404);
    }
    return file;
  }
  /**
   * Obter URL de download do arquivo
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async getDownloadUrl(id, expiresIn = 3600) {
    const file = await this.getById(id);
    return generateSignedUrl(file.file_path, expiresIn);
  }
  /**
   * Atualizar status do arquivo
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async updateStatus(id, data) {
    await this.getById(id);
    return this.fiscalFileRepo.update(id, data);
  }
  /**
   * Deletar arquivo fiscal
   * @param id - ID do arquivo
   * @param companyId - ID da contabilidade (para logs)
   * @param userId - ID do usuário (para logs)
   * NOTA: Schema já isola por tenant, não precisa companyId nas queries
   */
  async delete(id, companyId, userId) {
    const file = await this.getById(id);
    try {
      await deleteFile(file.file_path);
    } catch (error) {
      console.error("Error deleting file from storage:", error);
    }
    await this.fiscalFileRepo.delete(id);
    if (userId && companyId) {
      logSensitiveOperation("FISCAL_FILE_DELETE", userId, companyId, {
        fiscal_file_id: id,
        client_id: file.client_id,
        file_name: file.file_name,
        file_type: file.file_type,
        competence: file.competence
      });
    }
  }
  /**
   * Listar arquivos por cliente
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async listByClient(clientId) {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
    }
    return this.fiscalFileRepo.findByClient(clientId);
  }
};

// src/modules/fiscal-files/fiscal-file.repository.ts
var FiscalFileRepository = class extends BaseRepository {
  /**
   * Buscar arquivo por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id) {
    const result = await this.query(
      `SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files WHERE id = $1`,
      [id],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }
  /**
   * Criar registro de arquivo fiscal
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async create(data) {
    const result = await this.query(
      `INSERT INTO fiscal_files 
       (client_id, file_type, competence, file_name, file_path, file_size, mime_type, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded') 
       RETURNING id, client_id, file_type, competence, file_name, file_path, 
                 file_size, mime_type, status, processing_error, metadata, 
                 created_at, updated_at`,
      [
        data.client_id,
        data.file_type,
        data.competence,
        data.file_name,
        data.file_path,
        data.file_size,
        data.mime_type
      ],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }
  /**
   * Atualizar arquivo fiscal
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async update(id, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (data.status !== void 0) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.processing_error !== void 0) {
      updates.push(`processing_error = $${paramIndex++}`);
      params.push(data.processing_error);
    }
    if (data.metadata !== void 0) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }
    if (updates.length === 0) {
      return this.findById(id);
    }
    params.push(id);
    const result = await this.query(
      `UPDATE fiscal_files 
       SET ${updates.join(", ")}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, client_id, file_type, competence, file_name, file_path, 
                 file_size, mime_type, status, processing_error, metadata, 
                 created_at, updated_at`,
      params,
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }
  /**
   * Deletar arquivo fiscal
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async delete(id) {
    await this.query(
      "DELETE FROM fiscal_files WHERE id = $1",
      [id],
      false
      // Não requer company_id (isolado por schema)
    );
  }
  /**
   * Listar arquivos por cliente e/ou competência
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async list(options) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    if (options.client_id) {
      conditions.push(`client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    if (options.competence) {
      conditions.push(`competence = $${params.length + 1}`);
      params.push(options.competence);
    }
    if (options.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(options.status);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM fiscal_files ${whereClause}`,
      params,
      false
      // Não requer company_id (isolado por schema)
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    const filesResult = await this.query(
      `SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      false
      // Não requer company_id (isolado por schema)
    );
    return {
      files: filesResult.rows,
      total
    };
  }
  /**
   * Buscar arquivos por cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findByClient(clientId) {
    const result = await this.query(
      `SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files 
       WHERE client_id = $1 
       ORDER BY competence DESC, created_at DESC`,
      [clientId],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows;
  }
};

// src/middleware/module.middleware.ts
var FREE_PLAN_GRACE_DAYS = 7;
function requireModule(moduleKey) {
  return async (c, next) => {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json(
        {
          error: {
            message: "Tenant not identified",
            code: "TENANT_REQUIRED"
          }
        },
        400
      );
    }
    if (process.env.FORCE_ALL_MODULES_ACTIVE === "true" || process.env.FORCE_ALL_MODULES_ACTIVE === "1") {
      await next();
      return;
    }
    const subResult = await query(
      `SELECT p.name AS plan_name, s.free_plan_started_at
       FROM public.subscriptions s
       JOIN public.plans p ON p.id = s.plan_id
       WHERE s.company_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [companyId]
    );
    const sub = subResult.rows[0];
    if (sub?.plan_name === "Free" && sub.free_plan_started_at) {
      const started = new Date(sub.free_plan_started_at).getTime();
      const now = Date.now();
      const sevenDaysMs = FREE_PLAN_GRACE_DAYS * 24 * 60 * 60 * 1e3;
      if (now - started > sevenDaysMs) {
        return c.json(
          {
            error: {
              message: 'O per\xEDodo de uso do plano Free encerrou. Assine um plano pago em "Meu plano" para continuar acessando as funcionalidades.',
              code: "FREE_PLAN_EXPIRED"
            }
          },
          402
        );
      }
    }
    const result = await query(
      `SELECT tm.id 
       FROM public.tenant_modules tm
       JOIN public.modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = $1 AND m.key = $2 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())`,
      [companyId, moduleKey]
    );
    if (result.rows.length === 0) {
      return c.json(
        {
          error: {
            message: `Module ${moduleKey} is not active`,
            code: "MODULE_NOT_ACTIVE"
          }
        },
        402
      );
    }
    await next();
  };
}

// src/modules/fiscal-files/fiscal-file.routes.ts
var fiscalFileRoutes = new Hono2();
fiscalFileRoutes.use("/*", tenantMiddleware);
fiscalFileRoutes.use("/*", authMiddleware);
fiscalFileRoutes.use("/*", requireModule("FISCAL_FILES"));
var fiscalFileRepo = new FiscalFileRepository();
var clientRepo2 = new ClientRepository();
var fiscalFileService = new FiscalFileService(fiscalFileRepo, clientRepo2);
fiscalFileRoutes.post("/upload", async (c) => {
  try {
    const companyId = c.get("companyId");
    const formData = await c.req.formData();
    const file = formData.get("file");
    const clientId = formData.get("client_id");
    const competence = formData.get("competence");
    const fileType = formData.get("file_type");
    if (!file) {
      return c.json(
        {
          error: {
            message: "File is required",
            code: "FILE_REQUIRED"
          }
        },
        400
      );
    }
    if (!clientId || !competence || !fileType) {
      return c.json(
        {
          error: {
            message: "client_id, competence and file_type are required",
            code: "MISSING_FIELDS"
          }
        },
        400
      );
    }
    const validation = UploadFiscalFileSchema.safeParse({
      client_id: clientId,
      competence,
      file_type: fileType
    });
    if (!validation.success) {
      return c.json(
        {
          error: {
            message: "Validation error",
            code: "VALIDATION_ERROR",
            details: validation.error.errors
          }
        },
        400
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const userId = c.get("user")?.id;
    if (!companyId) {
      return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
    }
    const fiscalFile = await fiscalFileService.upload(
      companyId,
      validation.data.client_id,
      validation.data.competence,
      validation.data.file_type,
      buffer,
      file.name,
      file.type,
      userId
    );
    return c.json(
      {
        data: {
          fiscal_file: {
            id: fiscalFile.id,
            client_id: fiscalFile.client_id,
            file_type: fiscalFile.file_type,
            competence: fiscalFile.competence,
            file_name: fiscalFile.file_name,
            file_size: fiscalFile.file_size,
            status: fiscalFile.status,
            created_at: fiscalFile.created_at
          }
        }
      },
      201
    );
  } catch (error) {
    return errorHandler2(error, c);
  }
});
fiscalFileRoutes.get(
  "/",
  zValidator("query", ListFiscalFilesQuerySchema),
  async (c) => {
    try {
      const query2 = c.req.valid("query");
      const result = await fiscalFileService.list({
        client_id: query2.client_id,
        competence: query2.competence,
        status: query2.status,
        page: query2.page,
        limit: query2.limit
      });
      return c.json({
        data: result
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
fiscalFileRoutes.get(
  "/:id",
  zValidator("param", FiscalFileIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const file = await fiscalFileService.getById(id);
      return c.json({
        data: {
          fiscal_file: {
            id: file.id,
            client_id: file.client_id,
            file_type: file.file_type,
            competence: file.competence,
            file_name: file.file_name,
            file_size: file.file_size,
            mime_type: file.mime_type,
            status: file.status,
            processing_error: file.processing_error,
            metadata: file.metadata,
            created_at: file.created_at,
            updated_at: file.updated_at
          }
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
fiscalFileRoutes.get(
  "/:id/download",
  zValidator("param", FiscalFileIdParamSchema),
  zValidator("query", DownloadFiscalFileQuerySchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { expires_in } = c.req.valid("query");
      const downloadUrl = await fiscalFileService.getDownloadUrl(id, expires_in);
      return c.json({
        data: {
          download_url: downloadUrl,
          expires_in
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
fiscalFileRoutes.put(
  "/:id/status",
  zValidator("param", FiscalFileIdParamSchema),
  zValidator("json", UpdateFiscalFileStatusSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const file = await fiscalFileService.updateStatus(id, data);
      return c.json({
        data: {
          fiscal_file: {
            id: file.id,
            status: file.status,
            processing_error: file.processing_error,
            metadata: file.metadata,
            updated_at: file.updated_at
          }
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
fiscalFileRoutes.delete(
  "/:id",
  zValidator("param", FiscalFileIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Tenant required", code: "TENANT_REQUIRED" } }, 400);
      }
      const userId = c.get("user")?.id;
      await fiscalFileService.delete(id, companyId, userId);
      return c.json({
        data: {
          success: true
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
fiscalFileRoutes.get(
  "/client/:client_id",
  zValidator("param", ClientIdParamSchema),
  async (c) => {
    try {
      const { client_id } = c.req.valid("param");
      const files = await fiscalFileService.listByClient(client_id);
      return c.json({
        data: {
          files: files.map((file) => ({
            id: file.id,
            file_type: file.file_type,
            competence: file.competence,
            file_name: file.file_name,
            file_size: file.file_size,
            status: file.status,
            created_at: file.created_at
          }))
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);

// src/modules/system/system.service.ts
var SystemService = class {
  /**
   * Obter estatísticas do banco de dados PostgreSQL
   */
  async getDatabaseStats() {
    const dbSizeResult = await query(
      `SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as size_bytes`
    );
    const tablesResult = await query(
      `SELECT COUNT(*)::int as count
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')`
    );
    const schemasResult = await query(
      `SELECT COUNT(*)::int as count
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`
    );
    const connectionsResult = await query(
      `SELECT 
        COUNT(*)::text as active,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max
       FROM pg_stat_activity
       WHERE datname = current_database()`
    );
    const cacheResult = await query(
      `SELECT 
        CASE 
          WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
          ELSE round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
        END::numeric as hit_ratio
       FROM pg_statio_user_tables`
    );
    const indexResult = await query(
      `SELECT 
        CASE 
          WHEN sum(idx_scan) + sum(seq_scan) = 0 THEN 0
          ELSE round(100.0 * sum(idx_scan) / (sum(idx_scan) + sum(seq_scan)), 2)
        END::numeric as index_usage
       FROM pg_stat_user_tables`
    );
    const diskResult = await query(
      `SELECT 
        pg_size_pretty(sum(pg_database_size(datname))) as total_size,
        sum(pg_database_size(datname)) as total_size_bytes
       FROM pg_database
       WHERE datistemplate = false`
    );
    const dbSize = dbSizeResult.rows[0];
    const tables = parseInt(tablesResult.rows[0]?.count || "0", 10);
    const schemas = parseInt(schemasResult.rows[0]?.count || "0", 10);
    const connections = connectionsResult.rows[0];
    const activeConnections = parseInt(connections?.active || "0", 10);
    const maxConnections = parseInt(connections?.max || "100", 10);
    const connectionUsagePercent = maxConnections > 0 ? Math.round(activeConnections / maxConnections * 100) : 0;
    const diskSize = diskResult.rows[0];
    const diskUsageBytes = diskSize?.total_size_bytes || dbSize?.size_bytes || 0;
    const diskLimitBytes = 500 * 1024 * 1024;
    const diskUsagePercent = diskLimitBytes > 0 ? Math.round(diskUsageBytes / diskLimitBytes * 100) : 0;
    return {
      databaseSize: dbSize?.size || "0 bytes",
      databaseSizeBytes: dbSize?.size_bytes || 0,
      totalTables: tables,
      totalSchemas: schemas,
      activeConnections,
      maxConnections,
      connectionUsagePercent,
      cacheHitRatio: typeof cacheResult.rows[0]?.hit_ratio === "string" ? parseFloat(cacheResult.rows[0].hit_ratio) : cacheResult.rows[0]?.hit_ratio || 0,
      indexUsage: typeof indexResult.rows[0]?.index_usage === "string" ? parseFloat(indexResult.rows[0].index_usage) : indexResult.rows[0]?.index_usage || 0,
      diskUsage: diskSize?.total_size || dbSize?.size || "0 bytes",
      diskUsageBytes,
      diskUsagePercent: diskUsagePercent > 100 ? 100 : diskUsagePercent
    };
  }
  /**
   * Obter lista de tenants (schemas)
   */
  async getTenantsList() {
    const result = await query(
      `SELECT 
        schema_name,
        COUNT(table_name)::int as table_count
       FROM information_schema.tables
       WHERE table_schema LIKE 'tenant_%'
       GROUP BY schema_name
       ORDER BY schema_name`
    );
    return result.rows.map((row) => ({
      schema_name: row.schema_name,
      table_count: parseInt(row.table_count || "0", 10)
    }));
  }
};

// src/modules/system/system.routes.ts
var systemRoutes = new Hono2();
var systemService = new SystemService();
systemRoutes.use("/*", authMiddleware);
systemRoutes.get("/stats", async (c) => {
  try {
    const currentUser = c.get("user");
    if (currentUser.role !== "super_admin") {
      return c.json(
        {
          error: {
            message: "Only super admin can access system statistics",
            code: "FORBIDDEN"
          }
        },
        403
      );
    }
    const stats = await systemService.getDatabaseStats();
    return c.json({
      data: {
        stats
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
systemRoutes.get("/tenants", async (c) => {
  try {
    const currentUser = c.get("user");
    if (currentUser.role !== "super_admin") {
      return c.json(
        {
          error: {
            message: "Only super admin can list tenants",
            code: "FORBIDDEN"
          }
        },
        403
      );
    }
    const tenants = await systemService.getTenantsList();
    return c.json({
      data: {
        tenants
      }
    });
  } catch (error) {
    return errorHandler2(error, c);
  }
});

// src/modules/rating-validator/rating-validator.service.ts
var RatingValidatorService = class _RatingValidatorService {
  constructor(ratingValidatorRepo2, clientRepo7, fiscalFileRepo3) {
    this.ratingValidatorRepo = ratingValidatorRepo2;
    this.clientRepo = clientRepo7;
    this.fiscalFileRepo = fiscalFileRepo3;
  }
  /**
   * Calcular valores agregados a partir de campos granulares
   */
  calculateAggregatedValues(input) {
    const ativoCirculanteTotal = input.ativo_circulante_total !== void 0 ? input.ativo_circulante_total : (input.ativo_circulante.caixa_equivalentes || 0) + (input.ativo_circulante.aplicacoes_financeiras || 0) + (input.ativo_circulante.contas_receber || 0) + (input.ativo_circulante.estoques || 0) + (input.ativo_circulante.tributos_recuperar || 0) + (input.ativo_circulante.despesas_antecipadas || 0) + (input.ativo_circulante.outros_ativos_circulantes || 0);
    const realizavelLongoPrazoTotal = input.realizavel_longo_prazo_total !== void 0 ? input.realizavel_longo_prazo_total : (input.ativo_nao_circulante.realizavel_longo_prazo?.contas_receber_lp || 0) + (input.ativo_nao_circulante.realizavel_longo_prazo?.emprestimos_concedidos || 0) + (input.ativo_nao_circulante.realizavel_longo_prazo?.outros_creditos_lp || 0);
    const passivoCirculanteTotal = input.passivo_circulante_total !== void 0 ? input.passivo_circulante_total : (input.passivo_circulante.fornecedores || 0) + (input.passivo_circulante.emprestimos_financiamentos || 0) + (input.passivo_circulante.obrigacoes_trabalhistas || 0) + (input.passivo_circulante.tributos_pagar || 0) + (input.passivo_circulante.contas_pagar || 0) + (input.passivo_circulante.provisoes || 0) + (input.passivo_circulante.outros_passivos_circulantes || 0);
    const passivoNaoCirculanteTotal = input.passivo_nao_circulante_total !== void 0 ? input.passivo_nao_circulante_total : (input.passivo_nao_circulante.emprestimos_financiamentos_lp || 0) + (input.passivo_nao_circulante.obrigacoes_trabalhistas_lp || 0) + (input.passivo_nao_circulante.tributos_pagar_lp || 0) + (input.passivo_nao_circulante.provisoes_lp || 0) + (input.passivo_nao_circulante.outros_passivos_nao_circulantes || 0);
    const patrimonioLiquidoTotal = input.patrimonio_liquido_total !== void 0 ? input.patrimonio_liquido_total : (input.patrimonio_liquido.capital_social || 0) + (input.patrimonio_liquido.reservas_capital || 0) + (input.patrimonio_liquido.reservas_lucros || 0) + (input.patrimonio_liquido.lucros_prejuizos_acumulados || 0) + (input.patrimonio_liquido.outros_ajustes || 0);
    const ativoTotal = ativoCirculanteTotal + realizavelLongoPrazoTotal + (input.ativo_nao_circulante.investimentos || 0) + (input.ativo_nao_circulante.imobilizado || 0) + (input.ativo_nao_circulante.intangivel || 0) + (input.ativo_nao_circulante.outros_ativos_nao_circulantes || 0);
    const passivoTotal = passivoCirculanteTotal + passivoNaoCirculanteTotal;
    return {
      ativo_circulante_total: ativoCirculanteTotal,
      realizavel_longo_prazo_total: realizavelLongoPrazoTotal,
      passivo_circulante_total: passivoCirculanteTotal,
      passivo_nao_circulante_total: passivoNaoCirculanteTotal,
      patrimonio_liquido_total: patrimonioLiquidoTotal,
      ativo_total: ativoTotal,
      passivo_total: passivoTotal
    };
  }
  /**
   * Calcular indicadores financeiros
   */
  calculateIndicators(values) {
    if (values.passivo_circulante_total === 0) {
      throw new AppError(
        "Passivo Circulante n\xE3o pode ser zero para calcular Liquidez Corrente",
        "INVALID_CALCULATION",
        400
      );
    }
    const liquidezCorrente = values.ativo_circulante_total / values.passivo_circulante_total;
    const passivoTotal = values.passivo_circulante_total + values.passivo_nao_circulante_total;
    if (passivoTotal === 0) {
      throw new AppError(
        "Passivo Total n\xE3o pode ser zero para calcular Liquidez Geral",
        "INVALID_CALCULATION",
        400
      );
    }
    const liquidezGeral = (values.ativo_circulante_total + values.realizavel_longo_prazo_total) / passivoTotal;
    if (values.ativo_total === 0) {
      throw new AppError(
        "Ativo Total n\xE3o pode ser zero para calcular Solv\xEAncia",
        "INVALID_CALCULATION",
        400
      );
    }
    const solvencia = values.patrimonio_liquido_total / values.ativo_total;
    return {
      liquidez_corrente: Number(liquidezCorrente.toFixed(4)),
      liquidez_geral: Number(liquidezGeral.toFixed(4)),
      solvencia: Number(solvencia.toFixed(4))
    };
  }
  /**
   * Classificar Rating baseado nos indicadores
   * Critérios baseados em análise financeira padrão (será ajustado conforme Portaria específica)
   */
  classifyRating(indicators) {
    const { liquidez_corrente, liquidez_geral, solvencia } = indicators;
    let score = 0;
    if (liquidez_corrente >= 2) score += 3;
    else if (liquidez_corrente >= 1.5) score += 2;
    else if (liquidez_corrente >= 1) score += 1;
    if (liquidez_geral >= 1.5) score += 3;
    else if (liquidez_geral >= 1.2) score += 2;
    else if (liquidez_geral >= 1) score += 1;
    if (solvencia >= 0.5) score += 3;
    else if (solvencia >= 0.3) score += 2;
    else if (solvencia >= 0.1) score += 1;
    if (score >= 7) return "A";
    if (score >= 5) return "B";
    if (score >= 3) return "C";
    return "D";
  }
  /**
   * Comparar Rating Estimado com Rating Real
   */
  compareRatings(ratingEstimado, ratingReal) {
    if (!ratingReal) {
      return { has_discrepancy: false };
    }
    const hasDiscrepancy = ratingEstimado !== ratingReal;
    if (!hasDiscrepancy) {
      return { has_discrepancy: false };
    }
    return {
      has_discrepancy: true,
      discrepancy_details: {
        rating_estimado: ratingEstimado,
        rating_real: ratingReal,
        message: `Discrep\xE2ncia detectada: Rating Estimado (${ratingEstimado}) diferente do Rating Real (${ratingReal})`
      }
    };
  }
  /** Limiares por indicador (pontos: 0, 1, 2, 3) para uso no demonstrativo */
  static THRESHOLDS = {
    liquidez_corrente: [
      { min: 2, points: 3, level: "A" },
      { min: 1.5, points: 2, level: "B" },
      { min: 1, points: 1, level: "C" },
      { min: 0, points: 0, level: "D" }
    ],
    liquidez_geral: [
      { min: 1.5, points: 3, level: "A" },
      { min: 1.2, points: 2, level: "B" },
      { min: 1, points: 1, level: "C" },
      { min: 0, points: 0, level: "D" }
    ],
    solvencia: [
      { min: 0.5, points: 3, level: "A" },
      { min: 0.3, points: 2, level: "B" },
      { min: 0.1, points: 1, level: "C" },
      { min: 0, points: 0, level: "D" }
    ]
  };
  static EPSILON = 1e-9;
  /** Formata limite do indicador (número ou %) */
  static formatThreshold(min, isPercent) {
    if (isPercent) return `\u2265 ${(min * 100).toFixed(0)}%`;
    return `\u2265 ${min.toFixed(2).replace(".", ",")}`;
  }
  /**
   * Gera análise por indicador para demonstrativo da discrepância (uso jurídico).
   * Retorna limiares por nível (D, C, B, A) para o frontend montar colunas dinâmicas.
   */
  getIndicatorAnalysis(indicators, ratingReal, _ratingEstimado) {
    const items = [];
    const configs = [
      {
        id: "liquidez_corrente",
        name: "Liquidez Corrente",
        formula: "Ativo Circulante \xF7 Passivo Circulante",
        value: indicators.liquidez_corrente,
        thresholds: _RatingValidatorService.THRESHOLDS.liquidez_corrente,
        isPercent: false
      },
      {
        id: "liquidez_geral",
        name: "Liquidez Geral",
        formula: "(AC + Realiz\xE1vel LP) \xF7 (PC + PNC)",
        value: indicators.liquidez_geral,
        thresholds: _RatingValidatorService.THRESHOLDS.liquidez_geral,
        isPercent: false
      },
      {
        id: "solvencia",
        name: "Solv\xEAncia",
        formula: "Patrim\xF4nio L\xEDquido \xF7 Ativo Total",
        value: indicators.solvencia,
        thresholds: _RatingValidatorService.THRESHOLDS.solvencia,
        isPercent: true
      }
    ];
    for (const c of configs) {
      const eps = _RatingValidatorService.EPSILON;
      let score = 0;
      let level = "D";
      for (const t of c.thresholds) {
        const meets = c.value >= t.min - eps;
        if (meets) {
          score = t.points;
          level = t.level;
        }
      }
      const valueFormatted = c.isPercent ? `${(c.value * 100).toFixed(2).replace(".", ",")}%` : c.value.toFixed(2).replace(".", ",");
      const fmt = (m) => _RatingValidatorService.formatThreshold(m, c.isPercent);
      const threshD = c.thresholds.find((t) => t.level === "D");
      const threshC = c.thresholds.find((t) => t.level === "C");
      const threshB = c.thresholds.find((t) => t.level === "B");
      const threshA = c.thresholds.find((t) => t.level === "A");
      const thresholds_by_level = {
        D: threshD ? fmt(threshD.min) : "-",
        C: threshC ? fmt(threshC.min) : "-",
        B: threshB ? fmt(threshB.min) : "-",
        A: threshA ? fmt(threshA.min) : "-"
      };
      const minC = threshC?.min ?? 0;
      const belowC = c.value < minC - eps;
      let gapMessage;
      if (ratingReal != null) {
        const nivelInformado = ratingReal;
        const limiteC = thresholds_by_level.C;
        const textoVsInformado = nivelInformado === "D" ? `O rating informado (D) corresponde a valores abaixo do m\xEDnimo para C (${limiteC}).` : `O rating informado (${nivelInformado}) exige neste indicador pelo menos ${thresholds_by_level[nivelInformado]}.`;
        if (level === "D") {
          gapMessage = belowC ? `Valor ${valueFormatted} est\xE1 abaixo do m\xEDnimo para C. ${textoVsInformado} Para atingir C: ${limiteC}.` : `Valor ${valueFormatted} no limite para C. ${textoVsInformado} Para B: ${thresholds_by_level.B}.`;
        } else if (level === "C") {
          gapMessage = `Valor ${valueFormatted} atende ao m\xEDnimo para C (calculado). ${textoVsInformado} Para atingir B: ${thresholds_by_level.B}.`;
        } else if (level === "B") {
          gapMessage = `Valor ${valueFormatted} atende ao m\xEDnimo para B. ${textoVsInformado} Para A: ${thresholds_by_level.A}.`;
        } else {
          gapMessage = `Valor ${valueFormatted} atende ao m\xEDnimo para A. ${textoVsInformado}`;
        }
      } else {
        if (level === "D") {
          gapMessage = belowC ? `Valor ${valueFormatted} est\xE1 abaixo do m\xEDnimo para C (${thresholds_by_level.C}). Para atingir C: ${thresholds_by_level.C}; B: ${thresholds_by_level.B}.` : `Valor ${valueFormatted} no limite para C. Para B: ${thresholds_by_level.B}.`;
        } else if (level === "C") {
          gapMessage = `Valor ${valueFormatted} atende ao m\xEDnimo para C (1 ponto). Para atingir B: ${thresholds_by_level.B}; A: ${thresholds_by_level.A}.`;
        } else if (level === "B") {
          gapMessage = `Valor ${valueFormatted} atende ao m\xEDnimo para B (${score} pontos). Para atingir A: ${thresholds_by_level.A}.`;
        } else {
          gapMessage = `Valor ${valueFormatted} atende ao m\xEDnimo para A (m\xE1ximo para este indicador).`;
        }
      }
      items.push({
        id: c.id,
        name: c.name,
        formula: c.formula,
        value: c.value,
        value_formatted: valueFormatted,
        score,
        max_score: 3,
        level,
        thresholds_by_level,
        gap_message: gapMessage
      });
    }
    return items;
  }
  /**
   * Simular validação de rating com dados inputados
   */
  async simulate(input, userId) {
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
      }
    } else if (input.save_simulation) {
      throw new AppError("Client ID is required when saving simulation", "CLIENT_REQUIRED", 400);
    }
    const calculatedValues = this.calculateAggregatedValues(input);
    const indicators = this.calculateIndicators(calculatedValues);
    const ratingEstimado = this.classifyRating(indicators);
    const comparison = this.compareRatings(ratingEstimado, input.rating_real);
    const indicator_analysis = this.getIndicatorAnalysis(
      indicators,
      input.rating_real,
      ratingEstimado
    );
    let validationId;
    if (input.save_simulation) {
      if (!input.client_id) {
        throw new AppError("Client ID is required when saving simulation", "CLIENT_REQUIRED", 400);
      }
      const validationData = {
        client_id: input.client_id,
        competence: input.competencia,
        fiscal_file_id: null,
        is_simulation: true,
        input_data: input,
        calculated_values: calculatedValues,
        liquidez_corrente: indicators.liquidez_corrente,
        liquidez_geral: indicators.liquidez_geral,
        solvencia: indicators.solvencia,
        rating_estimado: ratingEstimado,
        rating_real: input.rating_real || null,
        has_discrepancy: comparison.has_discrepancy,
        discrepancy_details: comparison.discrepancy_details || null,
        created_by: userId || null
      };
      const validation = await this.ratingValidatorRepo.create(validationData);
      validationId = validation.id;
    }
    return {
      calculated_values: calculatedValues,
      indicators,
      indicator_analysis,
      rating_estimado: ratingEstimado,
      rating_real: input.rating_real,
      has_discrepancy: comparison.has_discrepancy,
      discrepancy_details: comparison.discrepancy_details,
      validation_id: validationId
    };
  }
  /**
   * Validar rating a partir de arquivo ECD processado
   * NOTA: Implementação preparada, aguarda exemplos de dados ECD
   */
  async validateFromFiscalFile(fiscalFileId, _ratingReal, _userId) {
    const fiscalFile = await this.fiscalFileRepo.findById(fiscalFileId);
    if (!fiscalFile) {
      throw new AppError("Fiscal file not found", "FISCAL_FILE_NOT_FOUND", 404);
    }
    if (fiscalFile.file_type !== "ecd") {
      throw new AppError("File must be of type ECD", "INVALID_FILE_TYPE", 400);
    }
    if (fiscalFile.status !== "processed") {
      throw new AppError(
        "Fiscal file must be processed before validation",
        "FILE_NOT_PROCESSED",
        400
      );
    }
    const extractedData = await this.ratingValidatorRepo.findExtractedFiscalData(
      fiscalFile.client_id,
      fiscalFile.competence,
      ["balance_sheet", "dre"]
    );
    if (extractedData.length === 0) {
      throw new AppError(
        "No extracted data found for this fiscal file",
        "NO_EXTRACTED_DATA",
        404
      );
    }
    throw new AppError(
      "ECD data parsing not yet implemented. Waiting for ECD file examples.",
      "NOT_IMPLEMENTED",
      501
    );
  }
  /**
   * Buscar validação por ID
   */
  async getById(id) {
    const validation = await this.ratingValidatorRepo.findById(id);
    if (!validation) {
      throw new AppError("Rating validation not found", "VALIDATION_NOT_FOUND", 404);
    }
    return validation;
  }
  /**
   * Listar validações
   */
  async list(options) {
    return this.ratingValidatorRepo.list(options);
  }
  /**
   * Deletar validação
   */
  async delete(id, _userId) {
    await this.getById(id);
    await this.ratingValidatorRepo.delete(id);
  }
};

// src/modules/rating-validator/rating-validator.repository.ts
var RatingValidatorRepository = class extends BaseRepository {
  /**
   * Buscar validação por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id) {
    const result = await this.query(
      `SELECT id, client_id, competence, fiscal_file_id, is_simulation,
              input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
              rating_estimado, rating_real, has_discrepancy, discrepancy_details,
              created_by, created_at, updated_at 
       FROM rating_validations WHERE id = $1`,
      [id],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }
  /**
   * Criar validação
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async create(data) {
    const result = await this.query(
      `INSERT INTO rating_validations 
       (client_id, competence, fiscal_file_id, is_simulation, input_data, 
        calculated_values, liquidez_corrente, liquidez_geral, solvencia,
        rating_estimado, rating_real, has_discrepancy, discrepancy_details, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       RETURNING id, client_id, competence, fiscal_file_id, is_simulation,
                 input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
                 rating_estimado, rating_real, has_discrepancy, discrepancy_details,
                 created_by, created_at, updated_at`,
      [
        data.client_id,
        data.competence,
        data.fiscal_file_id || null,
        data.is_simulation,
        JSON.stringify(data.input_data),
        data.calculated_values ? JSON.stringify(data.calculated_values) : null,
        data.liquidez_corrente || null,
        data.liquidez_geral || null,
        data.solvencia || null,
        data.rating_estimado,
        data.rating_real || null,
        data.has_discrepancy,
        data.discrepancy_details ? JSON.stringify(data.discrepancy_details) : null,
        data.created_by || null
      ],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }
  /**
   * Atualizar validação
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async update(id, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (data.rating_real !== void 0) {
      updates.push(`rating_real = $${paramIndex++}`);
      params.push(data.rating_real);
    }
    if (data.has_discrepancy !== void 0) {
      updates.push(`has_discrepancy = $${paramIndex++}`);
      params.push(data.has_discrepancy);
    }
    if (data.discrepancy_details !== void 0) {
      updates.push(`discrepancy_details = $${paramIndex++}`);
      params.push(data.discrepancy_details ? JSON.stringify(data.discrepancy_details) : null);
    }
    if (updates.length === 0) {
      return this.findById(id);
    }
    params.push(id);
    const result = await this.query(
      `UPDATE rating_validations 
       SET ${updates.join(", ")}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, client_id, competence, fiscal_file_id, is_simulation,
                 input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
                 rating_estimado, rating_real, has_discrepancy, discrepancy_details,
                 created_by, created_at, updated_at`,
      params,
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }
  /**
   * Deletar validação
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async delete(id) {
    await this.query(
      "DELETE FROM rating_validations WHERE id = $1",
      [id],
      false
      // Não requer company_id (isolado por schema)
    );
  }
  /**
   * Listar validações com filtros
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async list(options) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    if (options.client_id) {
      conditions.push(`client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    if (options.competence) {
      conditions.push(`competence = $${params.length + 1}`);
      params.push(options.competence);
    }
    if (options.is_simulation !== void 0) {
      conditions.push(`is_simulation = $${params.length + 1}`);
      params.push(options.is_simulation);
    }
    if (options.rating_estimado) {
      conditions.push(`rating_estimado = $${params.length + 1}`);
      params.push(options.rating_estimado);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM rating_validations ${whereClause}`,
      params,
      false
      // Não requer company_id (isolado por schema)
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    const validationsResult = await this.query(
      `SELECT id, client_id, competence, fiscal_file_id, is_simulation,
              input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
              rating_estimado, rating_real, has_discrepancy, discrepancy_details,
              created_by, created_at, updated_at 
       FROM rating_validations 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      false
      // Não requer company_id (isolado por schema)
    );
    return {
      validations: validationsResult.rows,
      total
    };
  }
  /**
   * Buscar dados extraídos de ECD (Balanço e DRE)
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findExtractedFiscalData(clientId, competence, dataTypes) {
    const placeholders = dataTypes.map((_, i) => `$${i + 2}`).join(", ");
    const result = await this.query(
      `SELECT data_type, data 
       FROM extracted_fiscal_data 
       WHERE client_id = $1 AND competence = $2 AND data_type IN (${placeholders})
       ORDER BY created_at DESC`,
      [clientId, competence, ...dataTypes],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows;
  }
  /**
   * Buscar validações por cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findByClient(clientId) {
    const result = await this.query(
      `SELECT id, client_id, competence, fiscal_file_id, is_simulation,
              input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
              rating_estimado, rating_real, has_discrepancy, discrepancy_details,
              created_by, created_at, updated_at 
       FROM rating_validations 
       WHERE client_id = $1 
       ORDER BY competence DESC, created_at DESC`,
      [clientId],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows;
  }
};

// src/modules/rating-validator/extract-from-ecd-pdf.ts
var import_openai = __toESM(require("openai"));
var ECD_SYSTEM_PROMPT = `Role: Atue como um Especialista em Contabilidade Brasileira e Engenheiro de Dados.

Tarefa: Realize o OCR e a extra\xE7\xE3o estruturada do arquivo PDF da ECD (Escritura\xE7\xE3o Cont\xE1bil Digital - SPED). O documento cont\xE9m o Recibo de Entrega, o Balan\xE7o Patrimonial e a DRE.

Instru\xE7\xF5es t\xE9cnicas:
1. Convers\xE3o num\xE9rica: Valores entre par\xEAnteses (ex.: (100,00)) devem ser convertidos para negativos (-100.00). Remova "R$", pontos de milhar e use ponto como separador decimal.
2. Hierarquia: Identifique contas sint\xE9ticas (grupos) e anal\xEDticas (detalhes). Mantenha totais e subcontas quando existirem.
3. Consist\xEAncia: Se houver hash do arquivo no recibo e notas de rodap\xE9 nas p\xE1ginas seguintes, mencione no documento_info; n\xE3o \xE9 obrigat\xF3rio validar na extra\xE7\xE3o.
4. Sa\xEDda: Retorne APENAS um \xFAnico objeto JSON v\xE1lido, sem markdown e sem texto antes ou depois.

Estrutura do documento:
- P\xE1gina 1: Recibo de Entrega (hash, dados do contador, per\xEDodo, vers\xE3o do leiaute).
- P\xE1ginas 2-3: Balan\xE7o Patrimonial (Ativo Circulante, Ativo N\xE3o Circulante, Passivo Circulante, Passivo N\xE3o Circulante, Patrim\xF4nio L\xEDquido).
- P\xE1gina 4: DRE (Demonstra\xE7\xE3o do Resultado do Exerc\xEDcio).

Schema JSON de sa\xEDda (siga rigorosamente; use 0 ou "" quando ausente):

{
  "documento_info": {
    "tipo": "Escritura\xE7\xE3o Cont\xE1bil Digital (ECD)",
    "versao_leiaute": "string",
    "natureza_livro": "string",
    "numero_ordem": number,
    "periodo_escrituracao": { "inicio": "YYYY-MM-DD", "fim": "YYYY-MM-DD" },
    "data_autenticacao": "ISO datetime",
    "hash_arquivo": "string"
  },
  "entidade": {
    "nome": "raz\xE3o social",
    "cnpj": "XX.XXX.XXX/XXXX-XX",
    "signatarios": [{ "nome": "string", "qualificacao": "string", "cpf": "string", "responsavel_legal": true }]
  },
  "demonstrativo_contabil": {
    "balanco_patrimonial": {
      "ativo": {
        "circulante": { "total": number, "contas": { "clientes": number, "outros_creditos": number, "caixa_equivalentes": number, "aplicacoes_financeiras": number, "estoques": number, ... } },
        "nao_circulante": { "total": number, "realizavel_a_longo_prazo": number, "emprestimos_socios": number, "depositos_judiciais": number, "investimentos": number, "imobilizado": number, "intangivel": number },
        "total_geral": number
      },
      "passivo": {
        "circulante": { "total": number, "fornecedores": number, "parcelamento_iptu": number, "emprestimos_financiamentos": number, "obrigacoes_trabalhistas": number, "tributos_pagar": number, "contas_pagar": number, "provisoes": number },
        "nao_circulante": { "total": number, "obrigacoes_tributarias_longo_prazo": number, "obrigacoes_coligadas": number, "provisoes": number }
      },
      "patrimonio_liquido": { "total": number, "capital_social": number, "reservas": number, "prejuizos_acumulados": number }
    },
    "dre": {
      "receita_liquida": number,
      "lucro_bruto": number,
      "despesas_operacionais": number,
      "despesas_financeiras": number,
      "resultado_liquido_periodo": number
    }
  }
}`;
var ECD_USER_PROMPT_TEXT = `Extraia todos os dados do PDF da ECD (Recibo de Entrega, Balan\xE7o Patrimonial e DRE) conforme o schema informado. Retorne APENAS o objeto JSON, sem markdown.`;
async function extractEcdFromPdf(pdfBuffer) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY n\xE3o configurada. N\xE3o \xE9 poss\xEDvel extrair dados do PDF da ECD.");
  }
  let text;
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    text = typeof result?.text === "string" ? result.text : String(result ?? "");
  } catch {
    throw new Error("N\xE3o foi poss\xEDvel ler o PDF. Verifique se o arquivo \xE9 um PDF v\xE1lido da ECD.");
  }
  const openai = new import_openai.default({ apiKey });
  const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "").trim();
  const hasText = cleanText.length > 200;
  let rawContent;
  if (hasText) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ECD_SYSTEM_PROMPT },
        { role: "user", content: `${ECD_USER_PROMPT_TEXT}

Conte\xFAdo extra\xEDdo do PDF:

${cleanText.slice(0, 28e3)}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0
    });
    rawContent = completion.choices[0]?.message?.content?.trim();
  } else {
    const { toFile } = await import("openai");
    const uploadedFile = await openai.files.create({
      file: await toFile(pdfBuffer, "ecd_sped.pdf", { type: "application/pdf" }),
      purpose: "user_data"
    });
    try {
      const response = await openai.responses.create({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              { type: "input_file", file_id: uploadedFile.id },
              { type: "input_text", text: `${ECD_SYSTEM_PROMPT}

${ECD_USER_PROMPT_TEXT}

Analise o PDF anexo (ECD/SPED).` }
            ]
          }
        ],
        text: { format: { type: "json_object" } }
      });
      const outputItem = response.output?.find((o) => o.type === "message");
      rawContent = outputItem?.content?.find((c) => c.type === "output_text")?.text?.trim();
    } finally {
      await openai.files.delete(uploadedFile.id).catch(() => {
      });
    }
  }
  if (!rawContent) {
    throw new Error("Resposta vazia da extra\xE7\xE3o. Verifique se o PDF \xE9 um Recibo de Entrega ECD v\xE1lido e tente novamente.");
  }
  let parsed;
  try {
    const cleaned = rawContent.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, "$1");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Resposta da extra\xE7\xE3o em formato inv\xE1lido. Verifique o PDF e preencha os dados manualmente se necess\xE1rio.");
  }
  const parsedEcd = EcdExtractedSchema.safeParse(parsed);
  if (!parsedEcd.success) {
    const firstError = parsedEcd.error.flatten().fieldErrors;
    const msg = Object.keys(firstError).length ? JSON.stringify(firstError).slice(0, 200) : "estrutura inv\xE1lida";
    throw new Error("Dados extra\xEDdos n\xE3o correspondem ao schema da ECD. Ajuste o PDF ou preencha manualmente. " + msg);
  }
  const ecd = parsedEcd.data;
  const prefill = ecdExtractedToSimulateRatingInput(ecd);
  return {
    ecd,
    simula\u00E7\u00E3o_prefill: {
      ativo_circulante: prefill.ativo_circulante,
      ativo_nao_circulante: prefill.ativo_nao_circulante,
      passivo_circulante: prefill.passivo_circulante,
      passivo_nao_circulante: prefill.passivo_nao_circulante,
      patrimonio_liquido: prefill.patrimonio_liquido,
      competencia: prefill.competencia,
      dre: prefill.dre
    }
  };
}

// src/modules/rating-validator/rating-validator.routes.ts
function round23(value) {
  return Math.round(value * 100) / 100;
}
function deepRoundNumbers2(value) {
  if (value === null) return null;
  if (typeof value === "number") return round23(value);
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(deepRoundNumbers2);
  if (typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = deepRoundNumbers2(value[key]);
    }
    return out;
  }
  return value;
}
var ratingValidatorRoutes = new Hono2();
ratingValidatorRoutes.use("/*", tenantMiddleware);
ratingValidatorRoutes.use("/*", authMiddleware);
ratingValidatorRoutes.use("/*", requireModule("RATING_VALIDATOR"));
var ratingValidatorRepo = new RatingValidatorRepository();
var clientRepo3 = new ClientRepository();
var fiscalFileRepo2 = new FiscalFileRepository();
var ratingValidatorService = new RatingValidatorService(
  ratingValidatorRepo,
  clientRepo3,
  fiscalFileRepo2
);
ratingValidatorRoutes.post("/simulate", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (body == null) {
      return c.json({ error: { message: "Body JSON inv\xE1lido.", code: "INVALID_JSON" } }, 400);
    }
    const sanitized = deepRoundNumbers2(body);
    const parsed = SimulateRatingSchema.safeParse(sanitized);
    if (!parsed.success) {
      return c.json(
        { error: { message: "Dados inv\xE1lidos.", code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
        400
      );
    }
    const input = parsed.data;
    const userId = c.get("user")?.id;
    const result = await ratingValidatorService.simulate(input, userId);
    return c.json(
      {
        data: {
          calculated_values: result.calculated_values,
          indicators: result.indicators,
          indicator_analysis: result.indicator_analysis,
          rating_estimado: result.rating_estimado,
          rating_real: result.rating_real,
          has_discrepancy: result.has_discrepancy,
          discrepancy_details: result.discrepancy_details,
          validation_id: result.validation_id,
          is_simulation: true
        }
      },
      200
    );
  } catch (error) {
    return errorHandler2(error, c);
  }
});
ratingValidatorRoutes.post("/extract-from-ecd-pdf", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return c.json({ error: { message: "Envie um arquivo PDF (campo file).", code: "FILE_REQUIRED" } }, 400);
    }
    if (!file.type?.includes("pdf") && !file.name?.toLowerCase().endsWith(".pdf")) {
      return c.json({ error: { message: "O arquivo deve ser um PDF.", code: "INVALID_FILE_TYPE" } }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await extractEcdFromPdf(buffer);
    return c.json({ data: result }, 200);
  } catch (err) {
    return errorHandler2(err, c);
  }
});
ratingValidatorRoutes.get(
  "/",
  zValidator("query", ListRatingValidationsQuerySchema),
  async (c) => {
    try {
      const query2 = c.req.valid("query");
      const result = await ratingValidatorService.list({
        client_id: query2.client_id,
        competence: query2.competence,
        is_simulation: query2.is_simulation,
        rating_estimado: query2.rating_estimado,
        page: query2.page,
        limit: query2.limit
      });
      return c.json({
        data: {
          validations: result.validations,
          total: result.total,
          page: query2.page,
          limit: query2.limit
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
ratingValidatorRoutes.get(
  "/:id",
  zValidator("param", RatingValidationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const validation = await ratingValidatorService.getById(id);
      return c.json({
        data: {
          validation
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
ratingValidatorRoutes.delete(
  "/:id",
  zValidator("param", RatingValidationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const userId = c.get("user")?.id;
      await ratingValidatorService.delete(id, userId);
      return c.json({
        data: {
          success: true
        }
      });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
ratingValidatorRoutes.post(
  "/validate/:fiscal_file_id",
  zValidator("param", RatingValidatorFiscalFileIdParamSchema),
  zValidator("json", ValidateFromDataSchema.partial()),
  async (c) => {
    try {
      const { fiscal_file_id } = c.req.valid("param");
      const body = c.req.valid("json");
      const userId = c.get("user")?.id;
      const result = await ratingValidatorService.validateFromFiscalFile(
        fiscal_file_id,
        body.rating_real,
        userId
      );
      return c.json(
        {
          data: {
            calculated_values: result.calculated_values,
            indicators: result.indicators,
            rating_estimado: result.rating_estimado,
            rating_real: result.rating_real,
            has_discrepancy: result.has_discrepancy,
            discrepancy_details: result.discrepancy_details,
            validation_id: result.validation_id,
            is_simulation: false
          }
        },
        200
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);

// src/modules/editais/edital.repository.ts
var EditalRepository = class extends BaseRepository {
  /**
   * Buscar edital por ID
   * NOTA: Editais são globais, não requerem company_id
   */
  async findById(id) {
    const result = await this.query(
      `SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais WHERE id = $1`,
      [id],
      false
      // Não requer company_id (dados globais)
    );
    return result.rows[0] || null;
  }
  /**
   * Buscar edital por código
   */
  async findByCode(code) {
    const result = await this.query(
      `SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais WHERE code = $1`,
      [code],
      false
    );
    return result.rows[0] || null;
  }
  /**
   * Listar editais (com filtros opcionais)
   */
  async list(options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    if (options.modality) {
      conditions.push(`modality = $${paramIndex}`);
      params.push(options.modality);
      paramIndex++;
    }
    if (options.active !== void 0) {
      conditions.push(`active = $${paramIndex}`);
      params.push(options.active);
      paramIndex++;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM editais ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    const editaisResult = await this.query(
      `SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais 
       ${whereClause}
       ORDER BY end_date DESC, created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      false
    );
    return {
      editais: editaisResult.rows,
      total
    };
  }
  /**
   * Criar novo edital
   */
  async create(data) {
    const result = await this.query(
      `INSERT INTO editais (
        code, name, description, start_date, end_date, extended,
        modality, payment_terms, discount_rules, eligibility,
        notes, official_link, active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING id, code, name, description, start_date, end_date, extended, 
                  modality, payment_terms, discount_rules, eligibility, 
                  notes, official_link, active, created_at, updated_at, created_by`,
      [
        data.code,
        data.name,
        data.description || null,
        data.start_date,
        data.end_date,
        data.extended || false,
        data.modality,
        JSON.stringify(data.payment_terms),
        JSON.stringify(data.discount_rules),
        JSON.stringify(data.eligibility),
        data.notes || null,
        data.official_link || null,
        data.active !== void 0 ? data.active : true,
        data.created_by || null
      ],
      false
    );
    return result.rows[0];
  }
  /**
   * Atualizar edital
   */
  async update(id, data) {
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (data.name !== void 0) {
      updates.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }
    if (data.description !== void 0) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }
    if (data.start_date !== void 0) {
      updates.push(`start_date = $${paramIndex}`);
      params.push(data.start_date);
      paramIndex++;
    }
    if (data.end_date !== void 0) {
      updates.push(`end_date = $${paramIndex}`);
      params.push(data.end_date);
      paramIndex++;
    }
    if (data.extended !== void 0) {
      updates.push(`extended = $${paramIndex}`);
      params.push(data.extended);
      paramIndex++;
    }
    if (data.modality !== void 0) {
      updates.push(`modality = $${paramIndex}`);
      params.push(data.modality);
      paramIndex++;
    }
    if (data.payment_terms !== void 0) {
      updates.push(`payment_terms = $${paramIndex}`);
      params.push(JSON.stringify(data.payment_terms));
      paramIndex++;
    }
    if (data.discount_rules !== void 0) {
      updates.push(`discount_rules = $${paramIndex}`);
      params.push(JSON.stringify(data.discount_rules));
      paramIndex++;
    }
    if (data.eligibility !== void 0) {
      updates.push(`eligibility = $${paramIndex}`);
      params.push(JSON.stringify(data.eligibility));
      paramIndex++;
    }
    if (data.notes !== void 0) {
      updates.push(`notes = $${paramIndex}`);
      params.push(data.notes);
      paramIndex++;
    }
    if (data.official_link !== void 0) {
      updates.push(`official_link = $${paramIndex}`);
      params.push(data.official_link);
      paramIndex++;
    }
    if (data.active !== void 0) {
      updates.push(`active = $${paramIndex}`);
      params.push(data.active);
      paramIndex++;
    }
    if (updates.length === 0) {
      return this.findById(id);
    }
    params.push(id);
    const result = await this.query(
      `UPDATE editais SET ${updates.join(", ")} 
       WHERE id = $${paramIndex}
       RETURNING id, code, name, description, start_date, end_date, extended, 
                  modality, payment_terms, discount_rules, eligibility, 
                  notes, official_link, active, created_at, updated_at, created_by`,
      params,
      false
    );
    return result.rows[0] || null;
  }
  /**
   * Deletar edital
   */
  async delete(id) {
    const result = await this.query(
      "DELETE FROM editais WHERE id = $1 RETURNING id",
      [id],
      false
    );
    return result.rows.length > 0;
  }
  /**
   * Buscar editais ativos (dentro do prazo)
   */
  async findActive(date) {
    const checkDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const result = await this.query(
      `SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais 
       WHERE active = true 
         AND start_date <= $1 
         AND end_date >= $1
       ORDER BY end_date ASC`,
      [checkDate],
      false
    );
    return result.rows;
  }
};

// src/modules/editais/edital.service.ts
var EditalService = class {
  constructor(editalRepo2) {
    this.editalRepo = editalRepo2;
  }
  /**
   * Listar editais
   */
  async list(options = {}) {
    return this.editalRepo.list(options);
  }
  /**
   * Buscar edital por ID
   */
  async findById(id) {
    const edital = await this.editalRepo.findById(id);
    if (!edital) {
      throw new AppError("Edital not found", "EDITAL_NOT_FOUND", 404);
    }
    return edital;
  }
  /**
   * Buscar edital por código
   */
  async findByCode(code) {
    const edital = await this.editalRepo.findByCode(code);
    if (!edital) {
      throw new AppError("Edital not found", "EDITAL_NOT_FOUND", 404);
    }
    return edital;
  }
  /**
   * Criar novo edital
   */
  async create(data, userId) {
    const existing = await this.editalRepo.findByCode(data.code);
    if (existing) {
      throw new AppError("Edital with this code already exists", "EDITAL_CODE_EXISTS", 400);
    }
    return this.editalRepo.create({
      ...data,
      created_by: userId
    });
  }
  /**
   * Atualizar edital
   */
  async update(id, data) {
    const edital = await this.editalRepo.findById(id);
    if (!edital) {
      throw new AppError("Edital not found", "EDITAL_NOT_FOUND", 404);
    }
    return this.editalRepo.update(id, data);
  }
  /**
   * Deletar edital
   */
  async delete(id) {
    const edital = await this.editalRepo.findById(id);
    if (!edital) {
      throw new AppError("Edital not found", "EDITAL_NOT_FOUND", 404);
    }
    const deleted = await this.editalRepo.delete(id);
    if (!deleted) {
      throw new AppError("Failed to delete edital", "DELETE_FAILED", 500);
    }
    return { success: true };
  }
  /**
   * Buscar editais ativos
   */
  async findActive(date) {
    return this.editalRepo.findActive(date);
  }
};

// src/modules/editais/edital.routes.ts
var editalRoutes = new Hono2();
var protectedRoutes = new Hono2();
protectedRoutes.use("/*", authMiddleware);
var editalRepo = new EditalRepository();
var editalService = new EditalService(editalRepo);
editalRoutes.get(
  "/",
  zValidator("query", ListEditaisQuerySchema),
  async (c) => {
    try {
      const query2 = c.req.valid("query");
      const result = await editalService.list(query2);
      return c.json(
        {
          data: {
            editais: result.editais,
            total: result.total,
            page: query2.page,
            limit: query2.limit
          }
        },
        200
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
editalRoutes.get("/active", async (c) => {
  try {
    const date = c.req.query("date");
    const editais = await editalService.findActive(date);
    return c.json(
      {
        data: { editais }
      },
      200
    );
  } catch (error) {
    return errorHandler2(error, c);
  }
});
editalRoutes.get(
  "/:id",
  zValidator("param", EditalIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const edital = await editalService.findById(id);
      return c.json(
        {
          data: { edital }
        },
        200
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
protectedRoutes.post(
  "/",
  zValidator("json", CreateEditalSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const userId = c.get("user")?.id;
      const edital = await editalService.create(data, userId);
      return c.json(
        {
          data: { edital }
        },
        201
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
protectedRoutes.put(
  "/:id",
  zValidator("param", EditalIdParamSchema),
  zValidator("json", UpdateEditalSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const edital = await editalService.update(id, data);
      return c.json(
        {
          data: { edital }
        },
        200
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
protectedRoutes.delete(
  "/:id",
  zValidator("param", EditalIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      await editalService.delete(id);
      return c.json(
        {
          data: { success: true }
        },
        200
      );
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
editalRoutes.route("/", protectedRoutes);

// src/modules/judicial-processes/judicial-process.service.ts
var JudicialProcessService = class {
  constructor(processRepo2, clientRepo7) {
    this.processRepo = processRepo2;
    this.clientRepo = clientRepo7;
  }
  /**
   * Listar processos de um cliente
   */
  async findByClientId(clientId) {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
    }
    return this.processRepo.findByClientId(clientId);
  }
  /**
   * Buscar processo por ID
   */
  async findById(id) {
    const process2 = await this.processRepo.findById(id);
    if (!process2) {
      throw new AppError("Judicial process not found", "PROCESS_NOT_FOUND", 404);
    }
    return process2;
  }
  /**
   * Criar processo judicial
   */
  async create(data) {
    const client = await this.clientRepo.findById(data.client_id);
    if (!client) {
      throw new AppError("Client not found", "CLIENT_NOT_FOUND", 404);
    }
    return this.processRepo.create(data);
  }
  /**
   * Atualizar processo judicial
   */
  async update(id, data) {
    const process2 = await this.processRepo.findById(id);
    if (!process2) {
      throw new AppError("Judicial process not found", "PROCESS_NOT_FOUND", 404);
    }
    return this.processRepo.update(id, data);
  }
  /**
   * Deletar processo judicial
   */
  async delete(id) {
    const process2 = await this.processRepo.findById(id);
    if (!process2) {
      throw new AppError("Judicial process not found", "PROCESS_NOT_FOUND", 404);
    }
    await this.processRepo.delete(id);
  }
  /**
   * Verificar se cliente é elegível para um edital de contencioso baseado na tese
   */
  async isEligibleForThesis(clientId, legalThesis) {
    return this.processRepo.hasActiveProcessForThesis(clientId, legalThesis);
  }
  /**
   * Obter todas as teses elegíveis para um cliente
   */
  async getEligibleTheses(clientId) {
    const theses = ["IPI_PRACA", "PRL", "IRPJ_CSLL_DESMUTUALIZACAO"];
    const eligible = [];
    for (const thesis of theses) {
      const hasProcess = await this.processRepo.hasActiveProcessForThesis(clientId, thesis);
      if (hasProcess) {
        eligible.push(thesis);
      }
    }
    return eligible;
  }
};

// src/modules/judicial-processes/judicial-process.repository.ts
var JudicialProcessRepository = class extends BaseRepository {
  /**
   * Buscar processo por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id) {
    const result = await this.query(
      `SELECT id, client_id, process_number, court, legal_thesis, 
              case_value, start_date, status, notes, 
              created_at, updated_at 
       FROM judicial_processes WHERE id = $1`,
      [id],
      false
      // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }
  /**
   * Listar processos de um cliente
   */
  async findByClientId(clientId) {
    const result = await this.query(
      `SELECT id, client_id, process_number, court, legal_thesis, 
              case_value, start_date, status, notes, 
              created_at, updated_at 
       FROM judicial_processes 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId],
      false
    );
    return result.rows;
  }
  /**
   * Buscar processos ativos por cliente e tese
   */
  async findActiveByClientAndThesis(clientId, legalThesis) {
    const result = await this.query(
      `SELECT id, client_id, process_number, court, legal_thesis, 
              case_value, start_date, status, notes, 
              created_at, updated_at 
       FROM judicial_processes 
       WHERE client_id = $1 
         AND legal_thesis = $2 
         AND status = 'active'
       ORDER BY created_at DESC`,
      [clientId, legalThesis],
      false
    );
    return result.rows;
  }
  /**
   * Verificar se cliente tem processos ativos para uma tese específica
   */
  async hasActiveProcessForThesis(clientId, legalThesis) {
    const result = await this.query(
      `SELECT COUNT(*) as count 
       FROM judicial_processes 
       WHERE client_id = $1 
         AND legal_thesis = $2 
         AND status = 'active'`,
      [clientId, legalThesis],
      false
    );
    return parseInt(result.rows[0]?.count || "0", 10) > 0;
  }
  /**
   * Criar processo judicial
   */
  async create(data) {
    const result = await this.query(
      `INSERT INTO judicial_processes 
       (client_id, process_number, court, legal_thesis, case_value, start_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, client_id, process_number, court, legal_thesis, 
                 case_value, start_date, status, notes, 
                 created_at, updated_at`,
      [
        data.client_id,
        data.process_number,
        data.court || null,
        data.legal_thesis,
        data.case_value || null,
        data.start_date || null,
        data.status || "active",
        data.notes || null
      ],
      false
    );
    return result.rows[0];
  }
  /**
   * Atualizar processo judicial
   */
  async update(id, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (data.process_number !== void 0) {
      updates.push(`process_number = $${paramIndex++}`);
      values.push(data.process_number);
    }
    if (data.court !== void 0) {
      updates.push(`court = $${paramIndex++}`);
      values.push(data.court || null);
    }
    if (data.legal_thesis !== void 0) {
      updates.push(`legal_thesis = $${paramIndex++}`);
      values.push(data.legal_thesis);
    }
    if (data.case_value !== void 0) {
      updates.push(`case_value = $${paramIndex++}`);
      values.push(data.case_value || null);
    }
    if (data.start_date !== void 0) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(data.start_date || null);
    }
    if (data.status !== void 0) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.notes !== void 0) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes || null);
    }
    if (updates.length === 0) {
      const current = await this.findById(id);
      if (!current) {
        throw new Error("Process not found");
      }
      return current;
    }
    values.push(id);
    const result = await this.query(
      `UPDATE judicial_processes 
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, client_id, process_number, court, legal_thesis, 
                 case_value, start_date, status, notes, 
                 created_at, updated_at`,
      values,
      false
    );
    if (result.rows.length === 0) {
      throw new Error("Process not found");
    }
    return result.rows[0];
  }
  /**
   * Deletar processo judicial
   */
  async delete(id) {
    const result = await this.query(
      `DELETE FROM judicial_processes WHERE id = $1`,
      [id],
      false
    );
    if (result.rowCount === 0) {
      throw new Error("Process not found");
    }
  }
};

// src/modules/judicial-processes/judicial-process.routes.ts
var judicialProcessRoutes = new Hono2();
judicialProcessRoutes.use("/*", authMiddleware);
judicialProcessRoutes.use("/*", tenantMiddleware);
var processRepo = new JudicialProcessRepository();
var clientRepo4 = new ClientRepository();
var processService = new JudicialProcessService(processRepo, clientRepo4);
judicialProcessRoutes.get("/client/:clientId", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Company ID is required", code: "COMPANY_ID_REQUIRED" } }, 400);
    }
    const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
    await query(`SET search_path TO "${schemaName}", public`);
    const clientId = c.req.param("clientId");
    const processes = await processService.findByClientId(clientId);
    return c.json({ data: { processes } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
judicialProcessRoutes.get("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Company ID is required", code: "COMPANY_ID_REQUIRED" } }, 400);
    }
    const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
    await query(`SET search_path TO "${schemaName}", public`);
    const id = c.req.param("id");
    const process2 = await processService.findById(id);
    return c.json({ data: { process: process2 } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
judicialProcessRoutes.get("/client/:clientId/eligible-theses", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Company ID is required", code: "COMPANY_ID_REQUIRED" } }, 400);
    }
    const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
    await query(`SET search_path TO "${schemaName}", public`);
    const clientId = c.req.param("clientId");
    const eligibleTheses = await processService.getEligibleTheses(clientId);
    return c.json({ data: { eligible_theses: eligibleTheses } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});
judicialProcessRoutes.post(
  "/",
  zValidator("json", CreateJudicialProcessSchema),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Company ID is required", code: "COMPANY_ID_REQUIRED" } }, 400);
      }
      const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
      await query(`SET search_path TO "${schemaName}", public`);
      const data = c.req.valid("json");
      const process2 = await processService.create(data);
      return c.json({ data: { process: process2 } }, 201);
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
judicialProcessRoutes.put(
  "/:id",
  zValidator("json", UpdateJudicialProcessSchema),
  async (c) => {
    try {
      const companyId = c.get("companyId");
      if (!companyId) {
        return c.json({ error: { message: "Company ID is required", code: "COMPANY_ID_REQUIRED" } }, 400);
      }
      const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
      await query(`SET search_path TO "${schemaName}", public`);
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const process2 = await processService.update(id, data);
      return c.json({ data: { process: process2 } });
    } catch (error) {
      return errorHandler2(error, c);
    }
  }
);
judicialProcessRoutes.delete("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: { message: "Company ID is required", code: "COMPANY_ID_REQUIRED" } }, 400);
    }
    const schemaName = `tenant_${companyId.replace(/-/g, "_")}`;
    await query(`SET search_path TO "${schemaName}", public`);
    const id = c.req.param("id");
    await processService.delete(id);
    return c.json({ data: { success: true } });
  } catch (error) {
    return errorHandler2(error, c);
  }
});

// src/modules/simulador-in-2306/calculations.ts
var LIMITE_TRIMESTRAL = 125e4;
var LIMITE_ANUAL = 5e6;
var LIMITE_ANUAL_CSLL_2026 = 375e4;
var LIMITE_LUCRO_PRESUMIDO_ADICIONAL = 6e4;
var ALIQ_IRPJ = 0.15;
var ALIQ_IRPJ_ADICIONAL = 0.1;
var ALIQ_CSLL = 0.09;
var ALIQ_PIS = 65e-4;
var ALIQ_COFINS = 0.03;
var PRESUMICAO = {
  produtos_mercadorias: { irpj: 0.08, csll: 0.12 },
  servicos: { irpj: 0.32, csll: 0.32 },
  servicos_favorecida: { irpj: 0.16, csll: 0.32 },
  servicos_hospitalares: { irpj: 0.08, csll: 0.12 },
  demais_receitas: { irpj: 1, csll: 1 }
};
function receitaBrutaTrimestre(r) {
  return (r.produtos_mercadorias ?? 0) + (r.servicos ?? 0) + (r.servicos_favorecida ?? 0) + (r.servicos_hospitalares ?? 0) + (r.demais_receitas ?? 0);
}
function basesTrimestreSemAcrescimo(r, equiparacaoHospitalar) {
  const presServicos = equiparacaoHospitalar ? { irpj: PRESUMICAO.servicos_hospitalares.irpj, csll: PRESUMICAO.servicos_hospitalares.csll } : PRESUMICAO.servicos;
  let baseIrpj = 0;
  let baseCsll = 0;
  baseIrpj += (r.produtos_mercadorias ?? 0) * PRESUMICAO.produtos_mercadorias.irpj;
  baseCsll += (r.produtos_mercadorias ?? 0) * PRESUMICAO.produtos_mercadorias.csll;
  baseIrpj += (r.servicos ?? 0) * presServicos.irpj;
  baseCsll += (r.servicos ?? 0) * presServicos.csll;
  baseIrpj += (r.servicos_favorecida ?? 0) * PRESUMICAO.servicos_favorecida.irpj;
  baseCsll += (r.servicos_favorecida ?? 0) * PRESUMICAO.servicos_favorecida.csll;
  baseIrpj += (r.servicos_hospitalares ?? 0) * PRESUMICAO.servicos_hospitalares.irpj;
  baseCsll += (r.servicos_hospitalares ?? 0) * PRESUMICAO.servicos_hospitalares.csll;
  baseIrpj += (r.demais_receitas ?? 0) * PRESUMICAO.demais_receitas.irpj;
  baseCsll += (r.demais_receitas ?? 0) * PRESUMICAO.demais_receitas.csll;
  return { baseIrpj: round24(baseIrpj), baseCsll: round24(baseCsll) };
}
function basesTrimestreComAcrescimo(r, equiparacaoHospitalar, trimestre, ano) {
  const total = receitaBrutaTrimestre(r);
  if (total <= LIMITE_TRIMESTRAL) {
    const { baseIrpj: baseIrpj2, baseCsll: baseCsll2 } = basesTrimestreSemAcrescimo(r, equiparacaoHospitalar);
    return { baseIrpj: baseIrpj2, baseCsll: baseCsll2, receitaExcedente: 0 };
  }
  const aplicarAcrescimoIrpj = ano >= 2026;
  const aplicarAcrescimoCsll = ano >= 2026 && trimestre >= 2;
  const excedente = total - LIMITE_TRIMESTRAL;
  const presServicos = equiparacaoHospitalar ? { irpj: PRESUMICAO.servicos_hospitalares.irpj, csll: PRESUMICAO.servicos_hospitalares.csll } : PRESUMICAO.servicos;
  let baseIrpj = 0;
  let baseCsll = 0;
  const keys = [
    "produtos_mercadorias",
    "servicos",
    "servicos_favorecida",
    "servicos_hospitalares",
    "demais_receitas"
  ];
  const presMap = {
    produtos_mercadorias: PRESUMICAO.produtos_mercadorias,
    servicos: presServicos,
    servicos_favorecida: PRESUMICAO.servicos_favorecida,
    servicos_hospitalares: PRESUMICAO.servicos_hospitalares,
    demais_receitas: PRESUMICAO.demais_receitas
  };
  for (const key of keys) {
    const val = r[key] ?? 0;
    if (val <= 0) continue;
    const prop = val / total;
    const limiteAtividade = LIMITE_TRIMESTRAL * prop;
    const excedenteAtividade = Math.max(0, val - limiteAtividade);
    const pres = presMap[key];
    const fatorIrpj = aplicarAcrescimoIrpj ? 1.1 : 1;
    const fatorCsll = aplicarAcrescimoCsll ? 1.1 : 1;
    baseIrpj += limiteAtividade * pres.irpj + excedenteAtividade * (pres.irpj * fatorIrpj);
    baseCsll += limiteAtividade * pres.csll + excedenteAtividade * (pres.csll * fatorCsll);
  }
  return {
    baseIrpj: round24(baseIrpj),
    baseCsll: round24(baseCsll),
    receitaExcedente: round24(excedente)
  };
}
function formatNum(n2) {
  return n2.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
var LABEL_ATIVIDADE = {
  produtos_mercadorias: "Venda de produtos/mercadorias",
  servicos: "Presta\xE7\xE3o de servi\xE7os",
  servicos_favorecida: "Servi\xE7os (lista favorecida)",
  servicos_hospitalares: "Servi\xE7os hospitalares",
  demais_receitas: "Demais receitas"
};
function detalheProporcaoTrimestre(r, equiparacaoHospitalar, numTrimestre, ano) {
  const total = receitaBrutaTrimestre(r);
  if (total <= 0 || total <= LIMITE_TRIMESTRAL) return null;
  const aplicarAcrescimoIrpj = ano >= 2026;
  const aplicarAcrescimoCsll = ano >= 2026 && numTrimestre >= 2;
  const presServicos = equiparacaoHospitalar ? { irpj: PRESUMICAO.servicos_hospitalares.irpj, csll: PRESUMICAO.servicos_hospitalares.csll } : PRESUMICAO.servicos;
  const presMap = {
    produtos_mercadorias: PRESUMICAO.produtos_mercadorias,
    servicos: presServicos,
    servicos_favorecida: PRESUMICAO.servicos_favorecida,
    servicos_hospitalares: PRESUMICAO.servicos_hospitalares,
    demais_receitas: PRESUMICAO.demais_receitas
  };
  const keys = [
    "produtos_mercadorias",
    "servicos",
    "servicos_favorecida",
    "servicos_hospitalares",
    "demais_receitas"
  ];
  const atividades = [];
  const partesIrpj = [];
  const partesCsll = [];
  for (const key of keys) {
    const val = r[key] ?? 0;
    if (val <= 0) continue;
    const participacao_pct = val / total * 100;
    const limite_proporcional = round24(LIMITE_TRIMESTRAL * (val / total));
    const excedente = round24(Math.max(0, val - limite_proporcional));
    const pres = presMap[key];
    const pctIrpjNormal = pres.irpj * 100;
    const pctIrpjAcrescimo = round24(pctIrpjNormal * 1.1);
    const pctCsllNormal = pres.csll * 100;
    const pctCsllAcrescimo = round24(pctCsllNormal * 1.1);
    const formulaResumida = excedente > 0 ? `(R$ ${formatNum(limite_proporcional)} \xD7 ${pctIrpjNormal}%) + (R$ ${formatNum(excedente)} \xD7 ${pctIrpjAcrescimo}%)` : `(R$ ${formatNum(limite_proporcional)} \xD7 ${pctIrpjNormal}%)`;
    atividades.push({
      chave: key,
      label: LABEL_ATIVIDADE[key],
      receita: round24(val),
      participacao_pct: round24(participacao_pct),
      limite_proporcional,
      excedente,
      percentual_irpj_normal: pctIrpjNormal,
      percentual_irpj_acrescimo: pctIrpjAcrescimo,
      percentual_csll_normal: pctCsllNormal,
      percentual_csll_acrescimo: pctCsllAcrescimo,
      formula_resumida: formulaResumida
    });
    if (limite_proporcional > 0) {
      partesIrpj.push(`(R$ ${formatNum(limite_proporcional)} \xD7 ${pctIrpjNormal}%)`);
      partesCsll.push(`(R$ ${formatNum(limite_proporcional)} \xD7 ${pctCsllNormal}%)`);
    }
    if (excedente > 0) {
      const pI = aplicarAcrescimoIrpj ? pctIrpjAcrescimo : pctIrpjNormal;
      const pC = aplicarAcrescimoCsll ? pctCsllAcrescimo : pctCsllNormal;
      partesIrpj.push(`(R$ ${formatNum(excedente)} \xD7 ${pI}%)`);
      partesCsll.push(`(R$ ${formatNum(excedente)} \xD7 ${pC}%)`);
    }
  }
  return {
    trimestre: numTrimestre,
    receita_bruta_total: round24(total),
    limite_trimestral: LIMITE_TRIMESTRAL,
    aplica_acrescimo_irpj: aplicarAcrescimoIrpj,
    aplica_acrescimo_csll: aplicarAcrescimoCsll,
    atividades,
    formula_geral_irpj: partesIrpj.join(" + "),
    formula_geral_csll: partesCsll.join(" + ")
  };
}
function adicionalIRPJ(baseCalculoIrpjTrimestre) {
  if (baseCalculoIrpjTrimestre <= LIMITE_LUCRO_PRESUMIDO_ADICIONAL) return 0;
  const baseAdicional = baseCalculoIrpjTrimestre - LIMITE_LUCRO_PRESUMIDO_ADICIONAL;
  return round24(baseAdicional * ALIQ_IRPJ_ADICIONAL);
}
function round24(n2) {
  return Math.round(n2 * 100) / 100;
}
function calcularTrimestre2025(receitas, deducoes, retencoes, equiparacao, numTrimestre) {
  const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(receitas, equiparacao);
  const irpj = round24(baseIrpj * ALIQ_IRPJ);
  const irpjAdic = adicionalIRPJ(baseIrpj);
  const csll = round24(baseCsll * ALIQ_CSLL);
  const receitaParaPisCofins = Math.max(0, receitaBrutaTrimestre(receitas) - (deducoes?.pis_cofins_zero ?? 0) - (deducoes?.icms_destacado ?? 0));
  const pis_a_rec = round24(receitaParaPisCofins * ALIQ_PIS);
  const cofins_a_rec = round24(receitaParaPisCofins * ALIQ_COFINS);
  const irrf = retencoes?.irrf ?? 0;
  const op = retencoes?.orgaos_publicos ?? 0;
  const irpj_a_rec = Math.max(0, irpj + irpjAdic - irrf - op);
  const csll_a_rec = Math.max(0, csll - (retencoes?.irrf ?? 0) * 0);
  return {
    trimestre: numTrimestre,
    receita_bruta: receitaBrutaTrimestre(receitas),
    base_calculo_irpj: baseIrpj,
    base_calculo_csll: baseCsll,
    irpj,
    irpj_adicional: irpjAdic,
    csll,
    irpj_a_rec,
    csll_a_rec,
    pis_a_rec,
    cofins_a_rec
  };
}
function calcularAno2026(trimestres, deducoesTrimestrais, retencoesTrimestrais, equiparacao) {
  const resultados = [];
  let receitaAcumuladaAno = 0;
  const parcelasExcedentesTrimestres = [];
  for (let t = 0; t < 4; t++) {
    const r = trimestres[t] ?? {
      produtos_mercadorias: 0,
      servicos: 0,
      servicos_favorecida: 0,
      servicos_hospitalares: 0,
      demais_receitas: 0
    };
    const { baseIrpj, baseCsll, receitaExcedente } = basesTrimestreComAcrescimo(r, equiparacao, t + 1, 2026);
    receitaAcumuladaAno += receitaBrutaTrimestre(r);
    parcelasExcedentesTrimestres.push(receitaExcedente);
    const irpj = round24(baseIrpj * ALIQ_IRPJ);
    const irpjAdic = adicionalIRPJ(baseIrpj);
    const csll = round24(baseCsll * ALIQ_CSLL);
    const ded = deducoesTrimestrais[t];
    const ret = retencoesTrimestrais[t];
    const receitaParaPisCofins = Math.max(0, receitaBrutaTrimestre(r) - (ded?.pis_cofins_zero ?? 0) - (ded?.icms_destacado ?? 0));
    const pis_a_rec = round24(receitaParaPisCofins * ALIQ_PIS);
    const cofins_a_rec = round24(receitaParaPisCofins * ALIQ_COFINS);
    const irrf = ret?.irrf ?? 0;
    const op = ret?.orgaos_publicos ?? 0;
    resultados.push({
      trimestre: t + 1,
      receita_bruta: receitaBrutaTrimestre(r),
      receita_excedente_limite: receitaExcedente > 0 ? receitaExcedente : void 0,
      base_calculo_irpj: baseIrpj,
      base_calculo_csll: baseCsll,
      irpj,
      irpj_adicional: irpjAdic,
      csll,
      irpj_a_rec: Math.max(0, irpj + irpjAdic - irrf - op),
      csll_a_rec: Math.max(0, csll),
      pis_a_rec,
      cofins_a_rec
    });
  }
  const receitaAnual = receitaAcumuladaAno;
  const somaExcedentesAntesDoUltimo = parcelasExcedentesTrimestres[0] + parcelasExcedentesTrimestres[1] + parcelasExcedentesTrimestres[2];
  const excedenteAnualIrpj = Math.max(0, receitaAnual - LIMITE_ANUAL);
  const excedenteAnualCsll = Math.max(0, receitaAnual - LIMITE_ANUAL_CSLL_2026);
  const resultadoT4 = resultados[3];
  const valoresComAcrescimo = resultados.slice(0, 3).reduce(
    (acc, x) => ({
      irpj: acc.irpj + x.irpj + (x.irpj_adicional ?? 0),
      csll: acc.csll + x.csll
    }),
    { irpj: 0, csll: 0 }
  );
  const valoresSemAcrescimoT1T3 = [0, 1, 2].reduce(
    (acc, i) => {
      const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(trimestres[i], equiparacao);
      return {
        irpj: acc.irpj + round24(baseIrpj * ALIQ_IRPJ) + adicionalIRPJ(baseIrpj),
        csll: acc.csll + round24(baseCsll * ALIQ_CSLL)
      };
    },
    { irpj: 0, csll: 0 }
  );
  if (receitaAnual <= LIMITE_ANUAL) {
    const diferencaIrpj = round24(valoresComAcrescimo.irpj - valoresSemAcrescimoT1T3.irpj);
    resultadoT4.irpj_a_rec = Math.max(0, resultadoT4.irpj_a_rec - diferencaIrpj);
  }
  if (receitaAnual <= LIMITE_ANUAL_CSLL_2026) {
    const diferencaCsll = round24(valoresComAcrescimo.csll - valoresSemAcrescimoT1T3.csll);
    resultadoT4.csll_a_rec = Math.max(0, resultadoT4.csll_a_rec - diferencaCsll);
  }
  if (receitaAnual > LIMITE_ANUAL && excedenteAnualIrpj < somaExcedentesAntesDoUltimo) {
    const excedenteT4 = parcelasExcedentesTrimestres[3] ?? 0;
    if (excedenteT4 < somaExcedentesAntesDoUltimo) {
      const razao = somaExcedentesAntesDoUltimo > 0 ? excedenteAnualIrpj / somaExcedentesAntesDoUltimo : 0;
      const novoExcedenteT4 = round24(excedenteT4 * razao);
      const fator = excedenteAnualIrpj > 0 && (parcelasExcedentesTrimestres[3] ?? 0) > 0 ? Math.min(1, novoExcedenteT4 / (parcelasExcedentesTrimestres[3] ?? 1)) : 0;
      const reducaoIrpj = round24(resultadoT4.irpj * (1 - fator) * 0.1 / 0.32);
      resultadoT4.irpj_a_rec = Math.max(0, resultadoT4.irpj_a_rec - reducaoIrpj);
    }
  }
  if (receitaAnual > LIMITE_ANUAL_CSLL_2026 && excedenteAnualCsll < somaExcedentesAntesDoUltimo) {
    const excedenteT4 = parcelasExcedentesTrimestres[3] ?? 0;
    if (excedenteT4 < somaExcedentesAntesDoUltimo) {
      const razao = somaExcedentesAntesDoUltimo > 0 ? excedenteAnualCsll / somaExcedentesAntesDoUltimo : 0;
      const novoExcedenteT4 = round24(excedenteT4 * razao);
      const fator = excedenteAnualCsll > 0 && (parcelasExcedentesTrimestres[3] ?? 0) > 0 ? Math.min(1, novoExcedenteT4 / (parcelasExcedentesTrimestres[3] ?? 1)) : 0;
      const reducaoCsll = round24(resultadoT4.csll * (1 - fator) * 0.1 / 0.32);
      resultadoT4.csll_a_rec = Math.max(0, resultadoT4.csll_a_rec - reducaoCsll);
    }
  }
  return resultados;
}
function calcularCenario2025(trimestres, deducoesTrimestrais, retencoesTrimestrais, equiparacao) {
  const defaultDeducoes = { pis_cofins_zero: 0, icms_destacado: 0 };
  const defaultRetencoes = { irrf: 0, orgaos_publicos: 0 };
  return trimestres.map(
    (r, i) => calcularTrimestre2025(
      r,
      deducoesTrimestrais[i] ?? defaultDeducoes,
      retencoesTrimestrais[i] ?? defaultRetencoes,
      equiparacao,
      i + 1
    )
  );
}
function agregarAnual(trimestres) {
  return {
    receita_bruta_total: round24(trimestres.reduce((s, t) => s + t.receita_bruta, 0)),
    irpj_total: round24(trimestres.reduce((s, t) => s + t.irpj, 0)),
    irpj_adicional_total: round24(trimestres.reduce((s, t) => s + (t.irpj_adicional ?? 0), 0)),
    csll_total: round24(trimestres.reduce((s, t) => s + t.csll, 0)),
    irpj_a_rec_total: round24(trimestres.reduce((s, t) => s + t.irpj_a_rec, 0)),
    csll_a_rec_total: round24(trimestres.reduce((s, t) => s + t.csll_a_rec, 0)),
    pis_a_rec_total: round24(trimestres.reduce((s, t) => s + t.pis_a_rec, 0)),
    cofins_a_rec_total: round24(trimestres.reduce((s, t) => s + t.cofins_a_rec, 0))
  };
}

// src/modules/simulador-in-2306/simulador-in-2306.service.ts
var SimuladorIN2306Service = class {
  constructor(repo3, clientRepo7) {
    this.repo = repo3;
    this.clientRepo = clientRepo7;
  }
  /**
   * Executa simulação conforme parâmetros da IN 2.306/2026
   * Cálculo inicial: valor financiado, parcela, resumo
   */
  async simulate(input, userId) {
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError("Cliente n\xE3o encontrado", "CLIENT_NOT_FOUND", 404);
      }
    }
    if (input.save_simulation && !input.client_id) {
      throw new AppError("client_id \xE9 obrigat\xF3rio ao salvar a simula\xE7\xE3o", "CLIENT_REQUIRED", 400);
    }
    const valorTotal = input.valor_total ?? 0;
    const valorEntrada = input.valor_entrada ?? 0;
    const numeroParcelas = Math.max(1, input.numero_parcelas ?? 1);
    const valorFinanciado = Math.max(0, valorTotal - valorEntrada);
    const valorParcela = numeroParcelas > 0 ? valorFinanciado / numeroParcelas : 0;
    const inputData = {
      competence: input.competence,
      client_id: input.client_id,
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      numero_parcelas: numeroParcelas,
      tipo_calculo: input.tipo_calculo,
      opcoes: input.opcoes
    };
    const parcelas = Array.from({ length: numeroParcelas }, (_, i) => ({
      numero: i + 1,
      valor: Math.round(valorParcela * 100) / 100,
      vencimento: void 0
    }));
    const resultData = {
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      valor_financiado: valorFinanciado,
      numero_parcelas: numeroParcelas,
      valor_parcela: Math.round(valorParcela * 100) / 100,
      parcelas,
      resumo: {
        tipo_calculo: input.tipo_calculo,
        competencia: input.competence
      }
    };
    let simulationId;
    if (input.save_simulation && input.client_id) {
      const createData = {
        client_id: input.client_id,
        competence: input.competence,
        input_data: inputData,
        result_data: resultData,
        title: input.title ?? null,
        created_by: userId ?? null
      };
      const created = await this.repo.create(createData);
      simulationId = created.id;
    }
    return {
      simulation_id: simulationId,
      input_data: inputData,
      result_data: resultData,
      is_simulation: true
    };
  }
  async getById(id) {
    const simulation = await this.repo.findById(id);
    if (!simulation) {
      throw new AppError("Simula\xE7\xE3o n\xE3o encontrada", "SIMULATION_NOT_FOUND", 404);
    }
    return simulation;
  }
  async list(options) {
    return this.repo.list(options);
  }
  async delete(id, _userId) {
    await this.getById(id);
    await this.repo.delete(id);
  }
  /**
   * Simulação tributária comparativa: Cálculo 2025 x Projeção 2026 (IN 2.306) x Cenário Equiparação Hospitalar
   */
  async simulateTributario(input, userId) {
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError("Cliente n\xE3o encontrado", "CLIENT_NOT_FOUND", 404);
      }
    }
    if (input.save_simulation && !input.client_id) {
      throw new AppError("client_id \xE9 obrigat\xF3rio ao salvar a simula\xE7\xE3o", "CLIENT_REQUIRED", 400);
    }
    const ded = input.deducoes_trimestrais ?? [
      { pis_cofins_zero: 0, icms_destacado: 0 },
      { pis_cofins_zero: 0, icms_destacado: 0 },
      { pis_cofins_zero: 0, icms_destacado: 0 },
      { pis_cofins_zero: 0, icms_destacado: 0 }
    ];
    const ret = input.retencoes_trimestrais ?? [
      { irrf: 0, orgaos_publicos: 0 },
      { irrf: 0, orgaos_publicos: 0 },
      { irrf: 0, orgaos_publicos: 0 },
      { irrf: 0, orgaos_publicos: 0 }
    ];
    const tri2025 = calcularCenario2025(input.trimestres, ded, ret, false);
    const tri2026 = calcularAno2026(input.trimestres, ded, ret, false);
    const triEquip = calcularCenario2025(input.trimestres, ded, ret, true);
    const toCenarioAnual = (trimestres) => {
      const totais = agregarAnual(trimestres);
      return {
        receita_bruta_total: totais.receita_bruta_total,
        irpj_total: totais.irpj_total,
        irpj_adicional_total: totais.irpj_adicional_total,
        csll_total: totais.csll_total,
        irpj_a_rec_total: totais.irpj_a_rec_total,
        csll_a_rec_total: totais.csll_a_rec_total,
        pis_a_rec_total: totais.pis_a_rec_total,
        cofins_a_rec_total: totais.cofins_a_rec_total,
        trimestres: trimestres.map((t) => ({
          trimestre: t.trimestre,
          receita_bruta: t.receita_bruta,
          receita_excedente_limite: t.receita_excedente_limite,
          base_calculo_irpj: t.base_calculo_irpj,
          base_calculo_csll: t.base_calculo_csll,
          irpj: t.irpj,
          irpj_adicional: t.irpj_adicional,
          csll: t.csll,
          irpj_a_rec: t.irpj_a_rec,
          csll_a_rec: t.csll_a_rec,
          pis_a_rec: t.pis_a_rec,
          cofins_a_rec: t.cofins_a_rec
        }))
      };
    };
    const cenario_2025 = toCenarioAnual(tri2025);
    const cenario_2026 = toCenarioAnual(tri2026);
    const cenario_equiparacao = toCenarioAnual(triEquip);
    const imposto2025 = cenario_2025.irpj_a_rec_total + cenario_2025.csll_a_rec_total;
    const imposto2026 = cenario_2026.irpj_a_rec_total + cenario_2026.csll_a_rec_total;
    const impostoEquip = cenario_equiparacao.irpj_a_rec_total + cenario_equiparacao.csll_a_rec_total;
    const comparativo = {
      imposto_a_maior_2026_vs_2025: Math.round((imposto2026 - imposto2025) * 100) / 100,
      imposto_a_maior_2026_vs_equiparacao: Math.round((imposto2026 - impostoEquip) * 100) / 100,
      economia_equiparacao_vs_2026: Math.round((imposto2026 - impostoEquip) * 100) / 100
    };
    const proporcaoTrimestres = [];
    for (let t = 0; t < 4; t++) {
      const receitas = input.trimestres[t];
      if (!receitas) continue;
      const detalhe = detalheProporcaoTrimestre(receitas, false, t + 1, input.ano);
      if (detalhe) proporcaoTrimestres.push(detalhe);
    }
    const result = {
      ano: input.ano,
      cenario_2025,
      cenario_2026,
      cenario_equiparacao,
      comparativo,
      memoria_calculo: {
        limite_trimestral: 125e4,
        limite_anual: 5e6,
        acrescimo_presuncao: "10% sobre a parcela que excede o limite (IN 2.306/2026)",
        equiparacao_hospitalar: input.aplicar_equiparacao_hospitalar ? "Servi\xE7os tributados com 8% IRPJ e 12% CSLL" : "N\xE3o aplicada",
        proporcao_trimestres: proporcaoTrimestres
      }
    };
    let simulationId;
    if (input.save_simulation && input.client_id) {
      const created = await this.repo.create({
        client_id: input.client_id,
        competence: `${input.ano}-12`,
        input_data: {
          ano: input.ano,
          trimestres: input.trimestres,
          deducoes_trimestrais: ded,
          retencoes_trimestrais: ret,
          aplicar_equiparacao_hospitalar: input.aplicar_equiparacao_hospitalar
        },
        result_data: result,
        title: input.title ?? null,
        created_by: userId ?? null
      });
      simulationId = created.id;
    }
    return { ...result, simulation_id: simulationId };
  }
};

// src/modules/simulador-in-2306/simulador-in-2306.repository.ts
var SimuladorIN2306Repository = class extends BaseRepository {
  async findById(id) {
    const result = await this.query(
      `SELECT id, client_id, competence, input_data, result_data, title, created_by, created_at, updated_at
       FROM in_2306_simulations WHERE id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }
  async create(data) {
    const result = await this.query(
      `INSERT INTO in_2306_simulations (client_id, competence, input_data, result_data, title, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, client_id, competence, input_data, result_data, title, created_by, created_at, updated_at`,
      [
        data.client_id,
        data.competence,
        JSON.stringify(data.input_data),
        JSON.stringify(data.result_data),
        data.title ?? null,
        data.created_by ?? null
      ],
      false
    );
    return result.rows[0];
  }
  async delete(id) {
    await this.query(
      "DELETE FROM in_2306_simulations WHERE id = $1",
      [id],
      false
    );
  }
  async list(options) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    if (options.client_id) {
      conditions.push(`client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    if (options.competence) {
      conditions.push(`competence = $${params.length + 1}`);
      params.push(options.competence);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM in_2306_simulations ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const listResult = await this.query(
      `SELECT id, client_id, competence, input_data, result_data, title, created_by, created_at, updated_at
       FROM in_2306_simulations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
      false
    );
    return { simulations: listResult.rows, total };
  }
};

// src/modules/simulador-in-2306/simulador-in-2306.routes.ts
var simuladorIN2306Routes = new Hono2();
simuladorIN2306Routes.use("/*", tenantMiddleware);
simuladorIN2306Routes.use("/*", authMiddleware);
simuladorIN2306Routes.use("/*", requireModule("SIMULADOR_IN_2306"));
var simuladorRepo = new SimuladorIN2306Repository();
var clientRepo5 = new ClientRepository();
var simuladorService = new SimuladorIN2306Service(simuladorRepo, clientRepo5);
simuladorIN2306Routes.post(
  "/simulate-tributario",
  zValidator("json", SimulateTributarioIN2306InputSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const userId = c.get("user")?.id;
      const result = await simuladorService.simulateTributario(input, userId);
      return c.json({ data: result }, 200);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
simuladorIN2306Routes.post(
  "/simulate",
  zValidator("json", SimulateIN2306InputSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const userId = c.get("user")?.id;
      const result = await simuladorService.simulate(input, userId);
      return c.json({ data: result }, 200);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
simuladorIN2306Routes.get(
  "/",
  zValidator("query", ListIN2306SimulationsQuerySchema),
  async (c) => {
    try {
      const query2 = c.req.valid("query");
      const result = await simuladorService.list({
        client_id: query2.client_id,
        competence: query2.competence,
        page: query2.page,
        limit: query2.limit
      });
      return c.json({
        data: {
          simulations: result.simulations,
          total: result.total,
          page: query2.page,
          limit: query2.limit
        }
      });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
simuladorIN2306Routes.get(
  "/:id",
  zValidator("param", IN2306SimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const simulation = await simuladorService.getById(id);
      return c.json({ data: { simulation } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
simuladorIN2306Routes.delete(
  "/:id",
  zValidator("param", IN2306SimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const userId = c.get("user")?.id;
      await simuladorService.delete(id, userId);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);

// src/modules/irpf-alta-renda/calculations.ts
var CONFIG_LEI_15270_2025 = {
  limite_isento: 6e5,
  limite_progressiva: 12e5,
  aliquota_fixa_percentual: 10,
  limite_retencao_mensal: 5e4,
  fonte_normativa: "Lei 15.270/2025",
  observacao_progressiva: "Al\xEDquota % = (REND/60.000) \u2212 10 (Art. 16-A \xA7 2\xBA II). Faixa 600k\u20131,2M."
};
var LIMITE_ISENTO = CONFIG_LEI_15270_2025.limite_isento;
var LIMITE_PROGRESSIVA = CONFIG_LEI_15270_2025.limite_progressiva;
var ALIQUOTA_FIXA = CONFIG_LEI_15270_2025.aliquota_fixa_percentual / 100;
var LIMITE_RETENCAO_MENSAL = CONFIG_LEI_15270_2025.limite_retencao_mensal;
function calcularBCC(rendimentosTributaveis, rendimentosIsentosDividendos, lucrosAprovadosAte31dez2025 = 0, ganhoCapitalExcluido = 0, rendimentosFiisExcluidos = 0, outrosIsentosQueEntramBase = 0, outrosExcluidosArt16A = 0) {
  const somaDividendos = rendimentosIsentosDividendos.reduce((s, d) => s + d.valor, 0);
  const bruto = rendimentosTributaveis + somaDividendos + outrosIsentosQueEntramBase - lucrosAprovadosAte31dez2025 - ganhoCapitalExcluido - rendimentosFiisExcluidos - outrosExcluidosArt16A;
  return round25(Math.max(0, bruto));
}
function aplicarFaixas(bcc) {
  let faixa;
  let aliquotaPercentual;
  let imposto;
  let excedenteSobre600k = 0;
  if (bcc <= LIMITE_ISENTO) {
    faixa = "isento";
    aliquotaPercentual = 0;
    imposto = 0;
  } else if (bcc <= LIMITE_PROGRESSIVA) {
    faixa = "progressiva";
    excedenteSobre600k = round25(bcc - LIMITE_ISENTO);
    aliquotaPercentual = bcc / 6e4 - 10;
    if (aliquotaPercentual < 0) aliquotaPercentual = 0;
    if (aliquotaPercentual > 10) aliquotaPercentual = 10;
    imposto = round25(bcc * (aliquotaPercentual / 100));
  } else {
    faixa = "fixa_10";
    excedenteSobre600k = round25(bcc - LIMITE_ISENTO);
    aliquotaPercentual = CONFIG_LEI_15270_2025.aliquota_fixa_percentual;
    imposto = round25(bcc * ALIQUOTA_FIXA);
  }
  return {
    base_calculo_combinada: bcc,
    faixa,
    aliquota_percentual: round25(aliquotaPercentual),
    imposto_estimado: imposto,
    excedente_sobre_600k: excedenteSobre600k > 0 ? excedenteSobre600k : void 0,
    memoria_calculo: {
      limite_isento: LIMITE_ISENTO,
      limite_progressiva: LIMITE_PROGRESSIVA,
      aliquota_fixa_percentual: CONFIG_LEI_15270_2025.aliquota_fixa_percentual,
      fonte_normativa: CONFIG_LEI_15270_2025.fonte_normativa,
      observacao_progressiva: CONFIG_LEI_15270_2025.observacao_progressiva
    }
  };
}
function avaliarRiscoRetencao(rendimentosIsentosDividendos) {
  const fontesAcima = rendimentosIsentosDividendos.filter((d) => d.valor / 12 > LIMITE_RETENCAO_MENSAL);
  if (fontesAcima.length === 0) {
    return { risco_retencao_mensal: false };
  }
  const nomes = fontesAcima.map((f) => f.nome_fonte || f.cnpj_fonte || "Fonte").join(", ");
  return {
    risco_retencao_mensal: true,
    risco_retencao_detalhe: `Poss\xEDvel reten\xE7\xE3o de 10% na fonte: valor mensal superior a R$ 50.000 em uma ou mais fontes (${nomes}).`
  };
}
function gerarSugestoesPlanejamento(dados, resultado) {
  const sugestoes = [];
  const bcc = resultado.base_calculo_combinada;
  const dividendos = dados.rendimentos_isentos_dividendos ?? [];
  const fontesAcima = dividendos.filter((d) => (d.valor ?? 0) / 12 > LIMITE_RETENCAO_MENSAL);
  if (fontesAcima.length > 0) {
    fontesAcima.forEach((f) => {
      const nome = f.nome_fonte ?? f.cnpj_fonte ?? "Fonte";
      sugestoes.push(
        `Reten\xE7\xE3o 10% na fonte: "${nome}" com valor anual ${formatBRL(f.valor ?? 0)} (m\xE9dia mensal > R$ 50k). Considere holding ou fracionamento de recebimentos.`
      );
    });
  }
  const carneLeao = dados.imposto_ja_pago_carne_leao ?? 0;
  const rt = dados.rendimentos_tributaveis ?? 0;
  if (carneLeao > 0 && rt > 0) {
    sugestoes.push(
      `Alugu\xE9is/receitas PF gerando carn\xEA-le\xE3o (IR pago: ${formatBRL(carneLeao)}). Avalie constitui\xE7\xE3o de holding imobili\xE1ria para reorganiza\xE7\xE3o tribut\xE1ria.`
    );
  }
  if (bcc > LIMITE_PROGRESSIVA) {
    sugestoes.push(
      `Base de c\xE1lculo (${formatBRL(bcc)}) acima de R$ 1,2M. Considere segrega\xE7\xE3o da renda com c\xF4njuge ou filhos (dentro dos limites legais) para reduzir a al\xEDquota efetiva.`
    );
  }
  if (bcc > LIMITE_ISENTO && bcc <= LIMITE_PROGRESSIVA) {
    sugestoes.push(
      `Base na faixa progressiva. Revis\xE3o do momento e da forma de recebimento dos rendimentos pode auxiliar no planejamento.`
    );
  }
  if (sugestoes.length === 0) {
    sugestoes.push(
      "Revis\xE3o do momento e da forma de recebimento dos rendimentos pode auxiliar no planejamento. Consulte seu consultor tribut\xE1rio para simula\xE7\xF5es espec\xEDficas \xE0 Lei 15.270/2025."
    );
  }
  return sugestoes;
}
function comporRendaParaDashboard(dados) {
  const tributaveis = round25(dados.rendimentos_tributaveis ?? 0);
  const dividendos = round25((dados.rendimentos_isentos_dividendos ?? []).reduce((s, i) => s + (i.valor ?? 0), 0));
  const outrosIsentosBase = round25((dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0));
  const exclusoes = round25(dados.lucros_aprovados_ate_31dez2025 ?? 0) + round25(dados.ganho_capital_excluido ?? 0) + round25(dados.rendimentos_fiis_excluidos ?? 0) + round25(dados.outros_excluidos_art_16a ?? 0);
  const tributacaoExclusivaLei7713 = round25(
    (dados.rendimentos_tributados_exclusivamente_lei_7713 ?? []).reduce((s, i) => s + (i.valor_bruto ?? 0), 0)
  );
  return {
    tributaveis,
    isentos_que_entram_base: round25(dividendos + outrosIsentosBase),
    dividendos_09_13: dividendos,
    isentos_excluidos: round25(exclusoes),
    tributacao_exclusiva_lei_7713: tributacaoExclusivaLei7713
  };
}
function calcularImpactoIncrementalBase(dados) {
  const composicao = comporRendaParaDashboard(dados);
  const base = composicao.tributaveis + composicao.isentos_que_entram_base + composicao.tributacao_exclusiva_lei_7713;
  if (base <= 0) return [];
  return [
    {
      categoria: "Rendimentos tributaveis",
      valor: composicao.tributaveis,
      percentual_base: round25(composicao.tributaveis / base * 100)
    },
    {
      categoria: "Isentos que entram na base",
      valor: composicao.isentos_que_entram_base,
      percentual_base: round25(composicao.isentos_que_entram_base / base * 100)
    },
    {
      categoria: "Tributacao exclusiva Lei 7.713",
      valor: composicao.tributacao_exclusiva_lei_7713,
      percentual_base: round25(composicao.tributacao_exclusiva_lei_7713 / base * 100)
    }
  ].filter((i) => i.valor > 0);
}
function construirMemoriaLegalExclusoes(dados) {
  const itens = [];
  if ((dados.lucros_aprovados_ate_31dez2025 ?? 0) > 0) {
    itens.push({
      item: "Lucros e dividendos aprovados ate 31/12/2025",
      valor: round25(dados.lucros_aprovados_ate_31dez2025 ?? 0),
      base_legal: "Lei 15.270/2025, Art. 16-A, \xA71\xBA, XII",
      motivo: "Regra de transicao da lei para lucros aprovados ate o marco temporal."
    });
  }
  if ((dados.ganho_capital_excluido ?? 0) > 0) {
    itens.push({
      item: "Ganho de capital excluido",
      valor: round25(dados.ganho_capital_excluido ?? 0),
      base_legal: "Lei 15.270/2025, Art. 16-A, \xA71\xBA, I",
      motivo: "Ganho de capital fora de bolsa/mercado organizado nao integra a base minima."
    });
  }
  if ((dados.rendimentos_fiis_excluidos ?? 0) > 0) {
    itens.push({
      item: "Rendimentos de FIIs qualificados",
      valor: round25(dados.rendimentos_fiis_excluidos ?? 0),
      base_legal: "Lei 15.270/2025, Art. 16-A, \xA71\xBA, V-j",
      motivo: "Rendimentos de FIIs com requisitos legais sao excluidos da base."
    });
  }
  if ((dados.outros_excluidos_art_16a ?? 0) > 0) {
    itens.push({
      item: "Outros excluidos (CRI/CRA/LCI/LCA/LIG/Poupanca/Debentures Infra)",
      valor: round25(dados.outros_excluidos_art_16a ?? 0),
      base_legal: "Lei 15.270/2025, Art. 16-A, \xA71\xBA",
      motivo: "Ativos incentivados e instrumentos listados pela lei ficam fora da base minima."
    });
  }
  return itens;
}
function simularOtimizacaoIsentoVsTributado(dados, baseCalculoAtual, impostoComplementarAtual, deducoesAtuais) {
  const migraveis = dados.outros_isentos_que_entram_base ?? [];
  const valorMigrado = round25(migraveis.reduce((s, i) => s + (i.valor ?? 0), 0));
  if (valorMigrado <= 0) return void 0;
  const rendTribLei7713 = dados.rendimentos_tributados_exclusivamente_lei_7713 ?? [];
  const irrfCompensavel = round25(
    rendTribLei7713.reduce((s, i) => {
      if ((i.irrf ?? 0) > 0) return s + (i.irrf ?? 0);
      const aliq = i.aliquota_irrf_percentual ?? 15;
      return s + (i.valor_bruto ?? 0) * aliq / 100;
    }, 0)
  );
  const baseSemIsento = round25(Math.max(0, baseCalculoAtual - valorMigrado));
  const impostoSemIsento = aplicarFaixas(baseSemIsento).imposto_estimado;
  const impostoComplementarSemCredito = Math.max(0, impostoSemIsento - deducoesAtuais);
  const deducoesComTributado = round25(deducoesAtuais + irrfCompensavel);
  const impostoComplementarOtimizado = round25(Math.max(0, impostoSemIsento - deducoesComTributado));
  const adicionalIrpfmNoCenarioIsento = round25(Math.max(0, impostoComplementarAtual - impostoComplementarSemCredito));
  const adicionalIrpfmNoCenarioTributado = round25(
    Math.max(0, adicionalIrpfmNoCenarioIsento - irrfCompensavel)
  );
  const rendimentoLiquidoIsento = round25(Math.max(0, valorMigrado - adicionalIrpfmNoCenarioIsento));
  const rendimentoLiquidoTributado = round25(Math.max(0, valorMigrado - adicionalIrpfmNoCenarioTributado));
  return {
    valor_migrado: valorMigrado,
    bcc_cenario_atual: round25(baseCalculoAtual),
    bcc_cenario_otimizado: baseSemIsento,
    imposto_complementar_atual: round25(impostoComplementarAtual),
    imposto_complementar_otimizado: impostoComplementarOtimizado,
    irrf_compensavel_estimado: irrfCompensavel,
    rendimento_liquido_cenario_isento: rendimentoLiquidoIsento,
    rendimento_liquido_cenario_tributado: rendimentoLiquidoTributado,
    ganho_liquido_estimado: round25(rendimentoLiquidoTributado - rendimentoLiquidoIsento),
    observacao: baseCalculoAtual > LIMITE_PROGRESSIVA ? "Em base acima de R$ 1,2M, ativo tributado com IRRF compensavel tende a reduzir imposto complementar versus isento que entra na base." : "Simulacao simplificada para comparacao de estrategia. Confirmar enquadramento e compensacao com documentacao fiscal."
  };
}
var PALAVRAS_EXCLUSAO_ART16A = ["cri", "cra", "lci", "lca", "lig", "poupanca", "debenture", "debentures", "infraestrutura"];
var CODIGOS_DOACAO_HERANCA = /* @__PURE__ */ new Set(["01", "03"]);
var CODIGOS_TRIBUTACAO_EXCLUSIVA = /* @__PURE__ */ new Set(["06", "10"]);
var CODIGOS_LCI_LCA_POUPANCA = /* @__PURE__ */ new Set(["11", "12"]);
var PALAVRAS_DOACAO_HERANCA = ["doacao", "heranca", "legitima", "adiantamento da legitima", "transferencia patrimonial"];
var PALAVRAS_FII = ["fii", "fundo imobili", "fundo de investimento imobili"];
var PALAVRAS_GANHO_CAPITAL = ["ganho de capital", "alienacao", "venda de imovel", "venda de participacao"];
var PALAVRAS_TRANSICAO_2025 = ["31/12/2025", "31-12-2025", "ate 31/12/2025", "assembleia", "aprovad"];
function normalizarTexto(s) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function temPalavra(texto, palavras) {
  return palavras.some((p) => texto.includes(normalizarTexto(p)));
}
function classificarIsentosArt16A(itens) {
  let outrosExcluidos = 0;
  let fiisExcluidos = 0;
  let ganhoCapitalExcluido = 0;
  let lucrosTransicao = 0;
  const outrosEntramBase = [];
  const tributacaoExclusivaLei7713 = [];
  for (const item of itens) {
    const valor = round25(item.valor ?? 0);
    if (valor <= 0) continue;
    const codigo = String(item.codigo ?? "").trim().padStart(2, "0").slice(-2);
    const desc = normalizarTexto(item.descricao ?? item.nome_fonte ?? "");
    const isFii = temPalavra(desc, PALAVRAS_FII);
    const isGanhoCapital = temPalavra(desc, PALAVRAS_GANHO_CAPITAL);
    const isTransicao = temPalavra(desc, PALAVRAS_TRANSICAO_2025);
    const isExclArt16A = temPalavra(desc, PALAVRAS_EXCLUSAO_ART16A);
    const isDoacaoHeranca = CODIGOS_DOACAO_HERANCA.has(codigo) || temPalavra(desc, PALAVRAS_DOACAO_HERANCA);
    if (isTransicao) {
      lucrosTransicao += valor;
      continue;
    }
    if (codigo === "09" || codigo === "13") continue;
    if (isFii) {
      fiisExcluidos += valor;
      continue;
    }
    if (isGanhoCapital) {
      ganhoCapitalExcluido += valor;
      continue;
    }
    if (CODIGOS_TRIBUTACAO_EXCLUSIVA.has(codigo)) {
      tributacaoExclusivaLei7713.push({
        descricao: item.descricao ?? item.nome_fonte ?? `Rendimento codigo ${codigo} (tributacao exclusiva)`,
        valor_bruto: valor,
        irrf: 0,
        aliquota_irrf_percentual: 15
      });
      continue;
    }
    if (CODIGOS_LCI_LCA_POUPANCA.has(codigo)) {
      outrosExcluidos += valor;
      continue;
    }
    if (isExclArt16A) {
      outrosExcluidos += valor;
      continue;
    }
    if (isDoacaoHeranca) {
      outrosExcluidos += valor;
      continue;
    }
    outrosEntramBase.push({
      descricao: item.descricao ?? item.nome_fonte ?? `Rendimento isento ${codigo || ""}`.trim(),
      tipo_ativo: "outro_isento",
      valor
    });
  }
  return {
    outros_excluidos_art_16a: round25(outrosExcluidos),
    rendimentos_fiis_excluidos: round25(fiisExcluidos),
    ganho_capital_excluido: round25(ganhoCapitalExcluido),
    lucros_aprovados_ate_31dez2025: round25(lucrosTransicao),
    outros_isentos_que_entram_base: outrosEntramBase,
    rendimentos_tributados_exclusivamente_lei_7713: tributacaoExclusivaLei7713
  };
}
function identificarOutrosExcluidosArt16A(itens) {
  return classificarIsentosArt16A(itens).outros_excluidos_art_16a;
}
var CONFIG_PJ_LUCRO_PRESUMIDO = {
  irpj_aliquota_percentual: 15,
  adicional_irpj_percentual: 10,
  limite_adicional_mensal: 2e4,
  // R$ 20k/mês
  csll_percentual: 9
};
function compararEficienciaPfPj(valorAplicacao, dados, resultadoSimulacao, rendimentosFinanceirosPj = 0) {
  if (valorAplicacao <= 0) return void 0;
  const lucrosExcl = dados.lucros_aprovados_ate_31dez2025 ?? 0;
  const ganhoCapitalExcl = dados.ganho_capital_excluido ?? 0;
  const fiisExcl = dados.rendimentos_fiis_excluidos ?? 0;
  const outrosExclArt16A = dados.outros_excluidos_art_16a ?? 0;
  const outrosIsentosQueEntramBase = (dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const rt = dados.rendimentos_tributaveis ?? 0;
  const aliquotaIrrf = (dados.aliquota_irrf_comparativo_percentual ?? 15) / 100;
  const irrfRetido = round25(valorAplicacao * aliquotaIrrf);
  const impostoTotalPfTribExclusiva = irrfRetido;
  const rendimentoLiquidoPfTribExclusiva = round25(Math.max(0, valorAplicacao - impostoTotalPfTribExclusiva));
  const deducoesAtuais = resultadoSimulacao.deducoes_imposto_ja_pago;
  const bccComAplicacao = calcularBCC(
    rt + valorAplicacao,
    dados.rendimentos_isentos_dividendos ?? [],
    lucrosExcl,
    ganhoCapitalExcl,
    fiisExcl,
    outrosIsentosQueEntramBase,
    outrosExclArt16A
  );
  const resultadoComAplicacao = aplicarFaixas(bccComAplicacao);
  const impostoMinimoComAplicacao = resultadoComAplicacao.imposto_estimado;
  const deducoesComIrrf = round25(deducoesAtuais + irrfRetido);
  const impostoComplementarComAplicacao = round25(Math.max(0, impostoMinimoComAplicacao - deducoesComIrrf));
  const impostoComplementarSemAplicacao = resultadoSimulacao.imposto_estimado;
  const incrementoIrpfm = round25(Math.max(0, impostoComplementarComAplicacao - impostoComplementarSemAplicacao));
  const impostoTotalPfEntraBase = round25(irrfRetido + incrementoIrpfm);
  const rendimentoLiquidoPfEntraBase = round25(Math.max(0, valorAplicacao - impostoTotalPfEntraBase));
  const basePj = round25(valorAplicacao);
  const basePjComExistente = round25(valorAplicacao + rendimentosFinanceirosPj);
  const irpj = round25(basePj * (CONFIG_PJ_LUCRO_PRESUMIDO.irpj_aliquota_percentual / 100));
  const lucroAnualParaAdicional = basePjComExistente;
  const limiteAnualAdicional = CONFIG_PJ_LUCRO_PRESUMIDO.limite_adicional_mensal * 12;
  const excedenteAnual = Math.max(0, lucroAnualParaAdicional - limiteAnualAdicional);
  const adicionalIrpj = round25(excedenteAnual * (CONFIG_PJ_LUCRO_PRESUMIDO.adicional_irpj_percentual / 100));
  const csll = round25(basePj * (CONFIG_PJ_LUCRO_PRESUMIDO.csll_percentual / 100));
  const impostoTotalPj = round25(irpj + adicionalIrpj + csll);
  const cargaEfetivaPj = basePj > 0 ? round25(impostoTotalPj / basePj * 100) : 0;
  const rendimentoLiquidoPj = round25(Math.max(0, valorAplicacao - impostoTotalPj));
  const diferencaPercentual = rendimentoLiquidoPfTribExclusiva > 0 ? round25((impostoTotalPj - impostoTotalPfTribExclusiva) / rendimentoLiquidoPfTribExclusiva * 100) : impostoTotalPj > 0 ? 100 : 0;
  return {
    rendimento_bruto: round25(valorAplicacao),
    cenario_pf_tributacao_exclusiva: {
      imposto_total: impostoTotalPfTribExclusiva,
      irrf: irrfRetido,
      rendimento_liquido: rendimentoLiquidoPfTribExclusiva
    },
    cenario_pf_entra_base: {
      imposto_total: impostoTotalPfEntraBase,
      irrf_compensavel: irrfRetido,
      rendimento_liquido: rendimentoLiquidoPfEntraBase
    },
    cenario_pf: {
      imposto_total: impostoTotalPfTribExclusiva,
      irrf_compensavel: irrfRetido,
      rendimento_liquido: rendimentoLiquidoPfTribExclusiva
    },
    cenario_pj: {
      irpj,
      adicional_irpj: adicionalIrpj,
      csll,
      carga_efetiva_percentual: cargaEfetivaPj,
      rendimento_liquido: rendimentoLiquidoPj
    },
    diferenca_percentual_pj_mais_caro: diferencaPercentual
  };
}
function formatBRL(n2) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(n2);
}
function round25(n2) {
  return Math.round(n2 * 100) / 100;
}

// src/modules/irpf-alta-renda/irpf-alta-renda.service.ts
function buildMemoriaCalculo(input, bcc, resultado) {
  const rt = input.dados.rendimentos_tributaveis;
  const dividendos = input.dados.rendimentos_isentos_dividendos;
  const somaDividendos = dividendos.reduce((s, d) => s + d.valor, 0);
  const detalheFontes = dividendos.map((d) => ({
    codigo: d.codigo ?? "09",
    nome_fonte: d.nome_fonte ?? d.cnpj_fonte ?? "Fonte",
    valor: d.valor
  }));
  const lucrosExcl = input.dados.lucros_aprovados_ate_31dez2025 ?? 0;
  const ganhoCapitalExcl = input.dados.ganho_capital_excluido ?? 0;
  const fiisExcl = input.dados.rendimentos_fiis_excluidos ?? 0;
  const outrosExclArt16A = input.dados.outros_excluidos_art_16a ?? 0;
  const outrosIsentosQueEntram = (input.dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const premissasAplicadas = [];
  if (dividendos.length > 0) {
    premissasAplicadas.push(
      "Risco de reten\xE7\xE3o mensal foi avaliado por aproxima\xE7\xE3o (valor anual por fonte dividido por 12)."
    );
  }
  const itensLei7713 = input.dados.rendimentos_tributados_exclusivamente_lei_7713 ?? [];
  if (itensLei7713.some((i) => (i.irrf ?? 0) <= 0)) {
    premissasAplicadas.push(
      "Itens da Lei 7.713 sem IRRF informado usam al\xEDquota estimada para simula\xE7\xE3o de compensa\xE7\xE3o."
    );
  }
  return {
    ...resultado.memoria_calculo,
    rendimentos_tributaveis: rt,
    soma_dividendos: Math.round(somaDividendos * 100) / 100,
    lucros_aprovados_ate_31dez2025: Math.round(lucrosExcl * 100) / 100,
    ganho_capital_excluido: Math.round(ganhoCapitalExcl * 100) / 100,
    rendimentos_fiis_excluidos: Math.round(fiisExcl * 100) / 100,
    outros_excluidos_art_16a: Math.round(outrosExclArt16A * 100) / 100,
    outros_isentos_que_entram_base: Math.round(outrosIsentosQueEntram * 100) / 100,
    detalhe_fontes: detalheFontes,
    base_calculo_combinada: bcc,
    faixa_aplicada: resultado.faixa,
    excedente_sobre_600k: resultado.excedente_sobre_600k ?? 0,
    aliquota_aplicada_percentual: resultado.aliquota_percentual,
    fonte_normativa: CONFIG_LEI_15270_2025.fonte_normativa,
    observacao_progressiva: CONFIG_LEI_15270_2025.observacao_progressiva,
    premissas_aplicadas: premissasAplicadas
  };
}
var IrpfAltaRendaService = class {
  constructor(repo3, companyRepo6) {
    this.repo = repo3;
    this.companyRepo = companyRepo6;
  }
  /**
   * Simula impacto tributário (Lei 15.270/2025) sem persistir.
   */
  async simulate(input) {
    const rendimentosLei7713 = input.dados.rendimentos_tributados_exclusivamente_lei_7713 ?? [];
    if ((input.dados.optou_ajuste_anual_lei_7713 ?? false) && rendimentosLei7713.length > 0) {
      throw new AppError(
        "Rendimentos da Lei 7.713 (art. 12-A) s\xF3 podem ser tratados como exclus\xE3o quando n\xE3o h\xE1 op\xE7\xE3o pelo ajuste anual.",
        "LEI_7713_AJUSTE_ANUAL_INCOMPATIVEL",
        422
      );
    }
    const lucrosExcl = input.dados.lucros_aprovados_ate_31dez2025 ?? 0;
    const ganhoCapitalExcl = input.dados.ganho_capital_excluido ?? 0;
    const fiisExcl = input.dados.rendimentos_fiis_excluidos ?? 0;
    const outrosExclArt16A = input.dados.outros_excluidos_art_16a ?? 0;
    const outrosIsentosQueEntramBase = (input.dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
    const bcc = calcularBCC(
      input.dados.rendimentos_tributaveis,
      input.dados.rendimentos_isentos_dividendos,
      lucrosExcl,
      ganhoCapitalExcl,
      fiisExcl,
      outrosIsentosQueEntramBase,
      outrosExclArt16A
    );
    const resultado = aplicarFaixas(bcc);
    const impostoMinimo = resultado.imposto_estimado;
    const retencao = input.dados.imposto_ja_pago_retencao_fonte ?? 0;
    const carneLeao = input.dados.imposto_ja_pago_carne_leao ?? 0;
    const aplicacoes = input.dados.imposto_ja_pago_aplicacoes ?? 0;
    const antecipado = input.dados.imposto_antecipado_dividendos ?? 0;
    const deducoesTotal = retencao + carneLeao + aplicacoes + antecipado;
    const impostoComplementar = Math.max(0, impostoMinimo - deducoesTotal);
    const risco = avaliarRiscoRetencao(input.dados.rendimentos_isentos_dividendos);
    const memoria_calculo = buildMemoriaCalculo(input, bcc, resultado);
    const ANO_VIGENCIA_IRPFM = 2027;
    const avisoAnoForaVigencia = input.ano < ANO_VIGENCIA_IRPFM ? `A Lei 15.270/2025 (IRPFM) entra em vigor a partir do ano-calend\xE1rio 2026 (declara\xE7\xE3o 2027). Esta simula\xE7\xE3o para ${input.ano} \xE9 apenas proje\xE7\xE3o; a base legal aplic\xE1vel na data da declara\xE7\xE3o pode divergir.` : void 0;
    if (avisoAnoForaVigencia) {
      memoria_calculo.aviso_vigencia = avisoAnoForaVigencia;
    }
    const composicaoRenda = comporRendaParaDashboard(input.dados);
    const impactoIncrementalBase = calcularImpactoIncrementalBase(input.dados);
    const memoriaLegalExclusoes = construirMemoriaLegalExclusoes(input.dados);
    const otimizacao = simularOtimizacaoIsentoVsTributado(input.dados, bcc, impostoComplementar, deducoesTotal);
    const sugestoes_planejamento = gerarSugestoesPlanejamento(input.dados, {
      base_calculo_combinada: resultado.base_calculo_combinada,
      faixa: resultado.faixa,
      imposto_estimado: impostoComplementar,
      risco_retencao_mensal: risco.risco_retencao_mensal,
      risco_retencao_detalhe: risco.risco_retencao_detalhe
    });
    memoria_calculo.imposto_minimo = impostoMinimo;
    memoria_calculo.deducoes_imposto_ja_pago = deducoesTotal;
    memoria_calculo.detalhe_deducoes = {
      retencao_fonte: retencao,
      carne_leao: carneLeao,
      aplicacoes,
      antecipado_dividendos: antecipado
    };
    if (otimizacao) {
      memoria_calculo.comparativo_investimentos = {
        cenario_atual: {
          bcc: otimizacao.bcc_cenario_atual,
          imposto_complementar: otimizacao.imposto_complementar_atual,
          rendimento_liquido: otimizacao.rendimento_liquido_cenario_isento
        },
        cenario_otimizado: {
          bcc: otimizacao.bcc_cenario_otimizado,
          imposto_complementar: otimizacao.imposto_complementar_otimizado,
          irrf_compensavel: otimizacao.irrf_compensavel_estimado,
          rendimento_liquido: otimizacao.rendimento_liquido_cenario_tributado
        }
      };
      if (otimizacao.ganho_liquido_estimado > 0) {
        sugestoes_planejamento.unshift(
          `Otimizacao de carteira: migracao simulada de ${otimizacao.valor_migrado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para ativo tributado com IRRF compensavel pode gerar ganho liquido estimado de ${otimizacao.ganho_liquido_estimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
        );
      }
    }
    const valorHipotetico = input.dados.valor_hipotetico_comparativo_pf_pj;
    const somaLei7713 = (input.dados.rendimentos_tributados_exclusivamente_lei_7713 ?? []).reduce(
      (s, i) => s + (i.valor_bruto ?? 0),
      0
    );
    const outrosAplic = input.dados.outros_rendimentos?.aplicacoes_financeiras_exclusiva ?? 0;
    const outrosJuros = input.dados.outros_rendimentos?.juros_capital_proprio ?? 0;
    const valorAplicacaoRef = Math.max(
      1e3,
      (valorHipotetico != null && valorHipotetico > 0 ? valorHipotetico : null) ?? (somaLei7713 > 0 ? somaLei7713 : null) ?? (outrosAplic > 0 ? outrosAplic : null) ?? (outrosJuros > 0 ? outrosJuros : null) ?? 1e5
    );
    const rendimentosPj = input.dados.rendimentos_aplicacoes_financeiras_pj ?? 0;
    const comparativoPfPj = compararEficienciaPfPj(
      valorAplicacaoRef,
      input.dados,
      {
        base_calculo_combinada: resultado.base_calculo_combinada,
        imposto_estimado: impostoComplementar,
        deducoes_imposto_ja_pago: deducoesTotal,
        aliquota_percentual: resultado.aliquota_percentual
      },
      rendimentosPj
    );
    if (comparativoPfPj && comparativoPfPj.diferenca_percentual_pj_mais_caro > 0) {
      sugestoes_planejamento.push(
        `Investir via PJ: para aplicacao de ${comparativoPfPj.rendimento_bruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, a carga na PJ (Lucro Presumido) e ${comparativoPfPj.diferenca_percentual_pj_mais_caro.toFixed(1)}% maior em relacao ao cenario PF.`
      );
    }
    if (comparativoPfPj) {
      const irrfCompensavelPj = comparativoPfPj.cenario_pf_tributacao_exclusiva.irrf;
      const porTrimestre = Math.round(irrfCompensavelPj / 4 * 100) / 100;
      const aliquotaUsada = input.dados.aliquota_irrf_comparativo_percentual ?? 15;
      memoria_calculo.irrf_compensavel_pj = {
        anual: irrfCompensavelPj,
        trimestre: { Q1: porTrimestre, Q2: porTrimestre, Q3: porTrimestre, Q4: porTrimestre },
        aliquota_irrf_percentual: aliquotaUsada,
        observacao: "IRRF retido na fonte sobre receitas financeiras na PJ (CDB 15-22,5%, JCP 15%, FII 20%). Pode ser compensado com IRPJ devido. Valores por trimestre assumem distribui\xE7\xE3o uniforme."
      };
    }
    return {
      ano: input.ano,
      aviso_ano_fora_vigencia: avisoAnoForaVigencia,
      base_calculo_combinada: resultado.base_calculo_combinada,
      faixa: resultado.faixa,
      aliquota_percentual: resultado.aliquota_percentual,
      imposto_minimo: impostoMinimo,
      deducoes_imposto_ja_pago: deducoesTotal,
      imposto_estimado: impostoComplementar,
      risco_retencao_mensal: risco.risco_retencao_mensal,
      risco_retencao_detalhe: risco.risco_retencao_detalhe,
      sugestoes_planejamento,
      composicao_renda: composicaoRenda,
      impacto_incremental_base: impactoIncrementalBase,
      memoria_legal_exclusoes: memoriaLegalExclusoes,
      otimizacao_isento_vs_tributado: otimizacao,
      comparativo_pf_pj: comparativoPfPj,
      memoria_calculo
    };
  }
  /**
   * Simula e persiste no tenant. Valida company_id se informado.
   */
  async simulateAndSave(input, userId) {
    if (input.company_id) {
      const company = await this.companyRepo.findById(input.company_id);
      if (!company) {
        throw new AppError("Empresa n\xE3o encontrada", "COMPANY_NOT_FOUND", 404);
      }
    }
    const resultado = await this.simulate({ ano: input.ano, dados: input.dados });
    const payloadJson = {
      tipo_importacao: input.tipo_importacao ?? "manual",
      arquivo_nome: input.arquivo_nome ?? null,
      ano: input.ano,
      dados: input.dados,
      resultado_simulacao: resultado,
      declaracao_completa: input.declaracao_completa ?? null,
      diagnostico: input.diagnostico ?? null,
      parser_version: input.parser_version ?? void 0
    };
    const createData = {
      company_id: input.company_id ?? null,
      ano: input.ano,
      contribuinte_nome: input.dados.contribuinte.nome,
      contribuinte_cpf: input.dados.contribuinte.cpf,
      rendimentos_tributaveis: input.dados.rendimentos_tributaveis,
      dados_dividendos: input.dados.rendimentos_isentos_dividendos,
      base_calculo_combinada: resultado.base_calculo_combinada,
      resultado_simulacao: resultado,
      payload_json: payloadJson,
      title: input.title ?? null,
      created_by: userId ?? null
    };
    const registro = await this.repo.create(createData);
    return { registro, resultado };
  }
  /**
   * Atualiza simulação existente. Re-simula com os dados enviados.
   */
  async update(id, input, _userId) {
    const record = await this.getById(id);
    if (input.company_id) {
      const company = await this.companyRepo.findById(input.company_id);
      if (!company) {
        throw new AppError("Empresa n\xE3o encontrada", "COMPANY_NOT_FOUND", 404);
      }
    }
    const resultado = await this.simulate({ ano: input.ano, dados: input.dados });
    const existingPayload = record.payload_json ?? {};
    const payloadJson = {
      ...existingPayload,
      tipo_importacao: existingPayload.tipo_importacao ?? "manual",
      arquivo_nome: existingPayload.arquivo_nome ?? null,
      ano: input.ano,
      dados: input.dados,
      resultado_simulacao: resultado,
      declaracao_completa: existingPayload.declaracao_completa ?? null,
      diagnostico: existingPayload.diagnostico ?? null
    };
    const updateData = {
      company_id: input.company_id ?? record.company_id,
      ano: input.ano,
      contribuinte_nome: input.dados.contribuinte.nome,
      contribuinte_cpf: input.dados.contribuinte.cpf,
      rendimentos_tributaveis: input.dados.rendimentos_tributaveis,
      dados_dividendos: input.dados.rendimentos_isentos_dividendos,
      base_calculo_combinada: resultado.base_calculo_combinada,
      resultado_simulacao: resultado,
      payload_json: payloadJson,
      title: input.title ?? record.title ?? null
    };
    const registro = await this.repo.update(id, updateData);
    return { registro, resultado };
  }
  async getById(id) {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new AppError("Simula\xE7\xE3o IRPF Alta Renda n\xE3o encontrada", "IRPF_ALTA_RENDA_NOT_FOUND", 404);
    }
    if (!record.payload_json) {
      record.payload_json = this.buildLegacyPayload(record);
    }
    return record;
  }
  buildLegacyPayload(record) {
    return {
      tipo_importacao: "manual",
      arquivo_nome: null,
      ano: record.ano,
      dados: {
        contribuinte: { nome: record.contribuinte_nome, cpf: record.contribuinte_cpf },
        rendimentos_tributaveis: record.rendimentos_tributaveis,
        rendimentos_isentos_dividendos: record.dados_dividendos
      },
      resultado_simulacao: record.resultado_simulacao,
      declaracao_completa: null,
      diagnostico: null
    };
  }
  async list(options) {
    return this.repo.list(options);
  }
  async delete(id) {
    await this.getById(id);
    await this.repo.delete(id);
  }
  async buildReportSummary(input) {
    const resultado = await this.simulate({ ano: input.ano, dados: input.dados });
    return {
      scenario_name: input.scenario_name?.trim() || `Simulacao IRPFM ${input.ano}`,
      gerado_em: (/* @__PURE__ */ new Date()).toISOString(),
      resumo_executivo: {
        faixa: resultado.faixa,
        aliquota_percentual: resultado.aliquota_percentual,
        imposto_a_complementar: resultado.imposto_estimado,
        economia_potencial_otimizacao: resultado.otimizacao_isento_vs_tributado?.ganho_liquido_estimado
      },
      composicao: {
        tributaveis: resultado.composicao_renda?.tributaveis ?? 0,
        isentos_que_entram_base: resultado.composicao_renda?.isentos_que_entram_base ?? 0,
        isentos_excluidos: resultado.composicao_renda?.isentos_excluidos ?? 0
      },
      comparativo_otimizacao: resultado.otimizacao_isento_vs_tributado,
      memoria_legal_exclusoes: resultado.memoria_legal_exclusoes ?? [],
      recomendacoes_priorizadas: resultado.sugestoes_planejamento ?? []
    };
  }
};

// src/modules/irpf-alta-renda/irpf-alta-renda.repository.ts
var IrpfAltaRendaRepository = class extends BaseRepository {
  async findById(id) {
    const result = await this.query(
      `SELECT id, company_id, ano, contribuinte_nome, contribuinte_cpf,
              rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
              resultado_simulacao, payload_json, title, created_by, created_at, updated_at
       FROM irpf_alta_renda WHERE id = $1`,
      [id],
      false
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }
  async create(data) {
    const result = await this.query(
      `INSERT INTO irpf_alta_renda (
         company_id, ano, contribuinte_nome, contribuinte_cpf,
         rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
         resultado_simulacao, payload_json, title, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, company_id, ano, contribuinte_nome, contribuinte_cpf,
                 rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
                 resultado_simulacao, payload_json, title, created_by, created_at, updated_at`,
      [
        data.company_id,
        data.ano,
        data.contribuinte_nome,
        data.contribuinte_cpf,
        data.rendimentos_tributaveis,
        JSON.stringify(data.dados_dividendos),
        data.base_calculo_combinada,
        JSON.stringify(data.resultado_simulacao),
        data.payload_json ? JSON.stringify(data.payload_json) : null,
        data.title ?? null,
        data.created_by ?? null
      ],
      false
    );
    return this.mapRow(result.rows[0]);
  }
  async update(id, data) {
    const result = await this.query(
      `UPDATE irpf_alta_renda SET
         company_id = $2, ano = $3, contribuinte_nome = $4, contribuinte_cpf = $5,
         rendimentos_tributaveis = $6, dados_dividendos = $7, base_calculo_combinada = $8,
         resultado_simulacao = $9, payload_json = $10, title = $11, updated_at = NOW()
       WHERE id = $1
       RETURNING id, company_id, ano, contribuinte_nome, contribuinte_cpf,
                 rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
                 resultado_simulacao, payload_json, title, created_by, created_at, updated_at`,
      [
        id,
        data.company_id ?? null,
        data.ano,
        data.contribuinte_nome,
        data.contribuinte_cpf,
        data.rendimentos_tributaveis,
        JSON.stringify(data.dados_dividendos),
        data.base_calculo_combinada,
        JSON.stringify(data.resultado_simulacao),
        JSON.stringify(data.payload_json),
        data.title ?? null
      ],
      false
    );
    const row = result.rows[0];
    if (!row) throw new Error("IRPF_ALTA_RENDA_NOT_FOUND");
    return this.mapRow(row);
  }
  async delete(id) {
    await this.query("DELETE FROM irpf_alta_renda WHERE id = $1", [id], false);
  }
  async list(options) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    if (options.company_id) {
      conditions.push(`company_id = $${params.length + 1}`);
      params.push(options.company_id);
    }
    if (options.ano != null) {
      conditions.push(`ano = $${params.length + 1}`);
      params.push(options.ano);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM irpf_alta_renda ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const listResult = await this.query(
      `SELECT id, company_id, ano, contribuinte_nome, contribuinte_cpf,
              rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
              resultado_simulacao, payload_json, title, created_by, created_at, updated_at
       FROM irpf_alta_renda ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
      false
    );
    return {
      items: listResult.rows.map((r) => this.mapRow(r)),
      total
    };
  }
  mapRow(row) {
    return {
      ...row,
      rendimentos_tributaveis: Number(row.rendimentos_tributaveis),
      base_calculo_combinada: Number(row.base_calculo_combinada),
      dados_dividendos: Array.isArray(row.dados_dividendos) ? row.dados_dividendos : [],
      payload_json: row.payload_json != null && typeof row.payload_json === "object" ? row.payload_json : null
    };
  }
};

// src/modules/irpf-alta-renda/extract-from-pdf.ts
var import_openai2 = __toESM(require("openai"));
var OldFormatRendPJ = external_exports.object({ fonte: external_exports.string().optional(), cnpj: external_exports.string().optional(), valor: external_exports.number().nonnegative().default(0) });
var OldFormatRendPF = external_exports.object({ mes: external_exports.string().optional(), valor: external_exports.number().nonnegative().default(0) });
var OldFormatRendIsento = external_exports.object({ nome_fonte: external_exports.string().optional(), cnpj_fonte: external_exports.string().optional(), valor: external_exports.number().nonnegative().default(0) });
var OldFormatSchema = external_exports.object({
  ano: external_exports.number().int().min(2020).max(2035).default((/* @__PURE__ */ new Date()).getFullYear()),
  contribuinte: external_exports.object({ nome: external_exports.string().default(""), cpf: external_exports.string().default("") }),
  base_calculo_alta_renda: external_exports.object({
    tributaveis_pj: external_exports.array(OldFormatRendPJ).default([]),
    tributaveis_pf_alugueis: external_exports.array(OldFormatRendPF).default([]),
    isentos_lucros_dividendos: external_exports.array(OldFormatRendIsento).default([]),
    isentos_simples_nacional: external_exports.array(OldFormatRendIsento).default([])
  }),
  outros_rendimentos: external_exports.object({
    aplicacoes_financeiras_exclusiva: external_exports.number().nonnegative().default(0),
    juros_capital_proprio: external_exports.number().nonnegative().default(0),
    poupanca_lci_lca: external_exports.number().nonnegative().default(0)
  }).optional().default({}),
  patrimonio_imobiliario: external_exports.array(external_exports.object({ descricao: external_exports.string().optional(), valor_atual: external_exports.number().nonnegative().default(0) })).default([])
}).passthrough();
var SYSTEM_PROMPT_SINGLE_PASS = `Voc\xEA \xE9 um especialista em contabilidade tribut\xE1ria brasileira e extra\xE7\xE3o de tabelas da Declara\xE7\xE3o de IRPF.

Objetivo: reconstruir 100% dos dados da declara\xE7\xE3o em UM \xDANICO JSON, sem resumir listas.

Regras obrigat\xF3rias:
1) Integridade num\xE9rica:
- PROIBIDO retornar 0, 0.00 ou null quando houver valor monet\xE1rio leg\xEDvel associado ao item no texto.
- Se descri\xE7\xE3o e valor estiverem separados, fa\xE7a varredura na mesma linha ou na linha imediatamente abaixo (padr\xE3o tabular do IRPF).
- S\xF3 use null quando o valor realmente estiver ileg\xEDvel/ausente no documento.

2) Reconstru\xE7\xE3o de tabelas:
- Trate o texto extra\xEDdo como tabelas por linhas.
- Cada linha representa uma entidade \xFAnica: descri\xE7\xE3o e colunas monet\xE1rias da mesma linha pertencem ao mesmo item.
- Em "Bens e Direitos", respeite colunas como situa\xE7\xE3o em 31/12 de anos distintos; capture o valor do ano mais recente como valor_atual e preserve contexto em situacao_31dez quando dispon\xEDvel.

3) N\xE3o resumo:
- Extraia TODOS os itens de listas. N\xE3o agrupe, n\xE3o consolide e n\xE3o omita.
- Isso \xE9 obrigat\xF3rio para: "Bens e Direitos", "Rendimentos Isentos e N\xE3o Tribut\xE1veis" e "Pagamentos Efetuados".

4) Ano da declara\xE7\xE3o:
- Confirme no cabe\xE7alho: Exerc\xEDcio e Ano-Calend\xE1rio.
- Exemplo de regra: Exerc\xEDcio 2025 corresponde a Ano-Calend\xE1rio 2024.

5) Formato da resposta:
- A resposta deve ser estritamente um JSON v\xE1lido, sem markdown e sem texto adicional.
- O JSON deve ser compat\xEDvel com o schema can\xF4nico de declara\xE7\xE3o completa, contendo no m\xEDnimo:
  identificacao, dependentes, rendimentos_tributaveis_pj, rendimentos_tributaveis_pf, rendimentos_tributaveis_outros, rendimentos_isentos_nao_tributaveis, rendimentos_tributacao_exclusiva_definitiva, bens_direitos, dividas_onus, resumo, pagamentos_efetuados, doacoes_deducoes, lei_15_270_classificacao.
- Nunca invente CPF/CNPJ/fonte pagadora.`;
function previewForLog(value, maxLen = 2e3) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}... [truncado ${normalized.length - maxLen} chars]`;
}
async function extractSinglePassFromText(openai, text) {
  console.log("[extractIrpfFromPdf] Iniciando extra\xE7\xE3o em chamada \xFAnica. text.length:", text.length);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT_SINGLE_PASS },
      {
        role: "user",
        content: `Analise o conte\xFAdo integral da Declara\xE7\xE3o de IRPF abaixo e extraia todos os campos no formato JSON can\xF4nico.
N\xE3o resuma listas, n\xE3o omita itens e preserve os valores monet\xE1rios por linha.

${text}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0
  });
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Resposta vazia do modelo na extra\xE7\xE3o textual.");
  }
  console.log("[extractIrpfFromPdf] retorno bruto chamada \xFAnica:", previewForLog(content));
  return content;
}
var SYSTEM_PROMPT_FILES = `${SYSTEM_PROMPT_SINGLE_PASS}
Adicional para PDF escaneado:
- Considere poss\xEDveis ru\xEDdos de OCR e preserve alinhamento tabular quando poss\xEDvel.
- Mesmo com OCR parcial, extraia todos os itens leg\xEDveis das se\xE7\xF5es obrigat\xF3rias.`;
function hasMeaningfulMoney(value) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 0;
}
function hasAnyMoneyInSection(section) {
  if (!section) return false;
  if (hasMeaningfulMoney(section.total)) return true;
  for (const item of section.itens ?? []) {
    if (!item || typeof item !== "object") continue;
    for (const v of Object.values(item)) {
      if (hasMeaningfulMoney(v)) return true;
    }
  }
  return false;
}
function sumMoneyFromSectionItems(section) {
  if (!section?.itens?.length) return 0;
  let sum = 0;
  for (const item of section.itens) {
    if (!item || typeof item !== "object") continue;
    const value = item.valor;
    if (typeof value === "number" && Number.isFinite(value)) {
      sum += value;
    }
  }
  return Math.round(sum * 100) / 100;
}
function evaluateExtractionQuality(d) {
  const identificacao = d.identificacao ?? {};
  const resumo = d.resumo ?? {};
  const pj = d.rendimentos_tributaveis_pj;
  const pf = d.rendimentos_tributaveis_pf;
  const outrosTrib = d.rendimentos_tributaveis_outros;
  const isentos = d.rendimentos_isentos_nao_tributaveis;
  const exclusiva = d.rendimentos_tributacao_exclusiva_definitiva;
  const bens = d.bens_direitos;
  const dividas = d.dividas_onus;
  const checks = [
    {
      nome: "identificacao",
      ok: String(identificacao.nome ?? "").trim().length > 2 || String(identificacao.cpf ?? "").replace(/\D/g, "").length >= 11
    },
    {
      nome: "tributaveis",
      ok: hasAnyMoneyInSection(pj) || hasAnyMoneyInSection(pf) || hasAnyMoneyInSection(outrosTrib) || (pj?.itens?.length ?? 0) + (pf?.itens?.length ?? 0) + (outrosTrib?.itens?.length ?? 0) > 0
    },
    {
      nome: "isentos",
      ok: hasAnyMoneyInSection(isentos) || (isentos?.itens?.length ?? 0) > 0
    },
    {
      nome: "resumo",
      ok: Object.values(resumo).some((v) => hasMeaningfulMoney(v))
    },
    {
      nome: "bens_dividas",
      ok: hasAnyMoneyInSection(bens) || hasAnyMoneyInSection(dividas) || (bens?.itens?.length ?? 0) + (dividas?.itens?.length ?? 0) > 0
    }
  ];
  const points = checks.filter((c) => c.ok).length;
  const score = Math.round(points / checks.length * 100);
  const secoesFracas = checks.filter((c) => !c.ok).map((c) => c.nome);
  const moneySignals = [
    hasAnyMoneyInSection(pj),
    hasAnyMoneyInSection(pf),
    hasAnyMoneyInSection(outrosTrib),
    hasAnyMoneyInSection(isentos),
    hasAnyMoneyInSection(exclusiva),
    hasAnyMoneyInSection(bens),
    hasAnyMoneyInSection(dividas),
    Object.values(resumo).some((v) => hasMeaningfulMoney(v))
  ].filter(Boolean).length;
  const itemSignals = (pj?.itens?.length ?? 0) + (pf?.itens?.length ?? 0) + (outrosTrib?.itens?.length ?? 0) + (isentos?.itens?.length ?? 0) + (exclusiva?.itens?.length ?? 0) + (bens?.itens?.length ?? 0) + (dividas?.itens?.length ?? 0);
  const suspectedMostlyZero = moneySignals <= 1 && itemSignals <= 2;
  const completude = score >= 80 ? "alta" : score >= 45 ? "media" : "baixa";
  return { score, completude, secoesFracas, suspectedMostlyZero };
}
async function extractIrpfFromPdf(pdfBuffer) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY n\xE3o configurada. N\xE3o \xE9 poss\xEDvel extrair dados do PDF.");
  }
  let text;
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: pdfBuffer });
    let result;
    try {
      result = await parser.getText({ preserveStructure: true });
    } catch {
      result = await parser.getText();
    }
    text = typeof result?.text === "string" ? result.text : String(result ?? "");
  } catch {
    throw new Error("N\xE3o foi poss\xEDvel ler o PDF. Verifique se o arquivo \xE9 um PDF v\xE1lido.");
  }
  const openai = new import_openai2.default({ apiKey });
  const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "").trim();
  const hasText = cleanText.length > 200;
  console.log("[extractIrpfFromPdf] hasText:", hasText, "cleanText.length:", cleanText.length);
  console.log("[extractIrpfFromPdf] preview do texto extra\xEDdo do PDF:", previewForLog(cleanText, 2500));
  let rawContent;
  let diagnosticSource = hasText ? "pdf_texto" : "pdf_escaneado";
  const modelUsed = "gpt-4o";
  if (hasText) {
    rawContent = await extractSinglePassFromText(openai, cleanText);
  } else {
    console.log("[extractIrpfFromPdf] PDF escaneado, usando Files API");
    const { toFile } = await import("openai");
    const uploadedFile = await openai.files.create({
      file: await toFile(pdfBuffer, "declaracao_irpf.pdf", { type: "application/pdf" }),
      purpose: "user_data"
    });
    try {
      const response = await openai.responses.create({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              { type: "input_file", file_id: uploadedFile.id },
              {
                type: "input_text",
                text: `${SYSTEM_PROMPT_FILES}

Analise este PDF da Declara\xE7\xE3o de IRPF e extraia 100% dos dados. Retorne APENAS o JSON, sem markdown.`
              }
            ]
          }
        ],
        text: { format: { type: "json_object" } }
      });
      const outputItem = response.output?.find((o) => o.type === "message");
      rawContent = outputItem?.content?.find((c) => c.type === "output_text")?.text?.trim();
      if (rawContent) {
        console.log("[extractIrpfFromPdf] retorno bruto Files API:", previewForLog(rawContent));
      }
    } finally {
      await openai.files.delete(uploadedFile.id).catch(() => {
      });
    }
  }
  if (!rawContent) {
    throw new Error("Resposta vazia da extra\xE7\xE3o. Tente novamente ou preencha manualmente.");
  }
  let parsed;
  try {
    console.log("[extractIrpfFromPdf] rawContent.length:", rawContent.length);
    console.log("[extractIrpfFromPdf] rawContent preview:", previewForLog(rawContent));
    parsed = JSON.parse(rawContent);
    if (parsed && typeof parsed === "object") {
      console.log("[extractIrpfFromPdf] chaves no JSON parseado:", Object.keys(parsed));
    }
  } catch {
    throw new Error("Resposta da extra\xE7\xE3o em formato inv\xE1lido. Preencha os dados manualmente.");
  }
  const normalizedBase = normalizeParsedToDeclaracao(parsed);
  let validatedFull = DeclaracaoIrpfCompletaSchema.safeParse(normalizedBase);
  if (!validatedFull.success) {
    const retryNormalized = collapseUnexpectedObjectArrays(normalizedBase);
    validatedFull = DeclaracaoIrpfCompletaSchema.safeParse(retryNormalized);
  }
  const warnings = [];
  if (validatedFull.success) {
    const ano = validatedFull.data.identificacao?.exercicio ?? validatedFull.data.identificacao?.ano_calendario ?? (/* @__PURE__ */ new Date()).getFullYear();
    const dados = mapDeclaracaoCompletaToDados(validatedFull.data);
    const quality = evaluateExtractionQuality(validatedFull.data);
    const completudeBase = diagnosticSource === "pdf_escaneado" ? "media" : "alta";
    let completude = completudeBase;
    if (quality.completude === "baixa") completude = "baixa";
    if (quality.completude === "media" && completude === "alta") completude = "media";
    if (quality.suspectedMostlyZero) completude = "baixa";
    if (quality.secoesFracas.length > 0) {
      warnings.push(`Se\xE7\xF5es com baixa cobertura: ${quality.secoesFracas.join(", ")}.`);
    }
    if (quality.suspectedMostlyZero) {
      warnings.push("Extra\xE7\xE3o com poucos valores monet\xE1rios identificados. Para maior confiabilidade, utilize o arquivo .dec/.dbk sempre que dispon\xEDvel.");
    }
    warnings.push(`Confiabilidade da extra\xE7\xE3o: ${quality.completude}.`);
    warnings.push("Para maior precis\xE3o e consist\xEAncia dos dados, a importa\xE7\xE3o por arquivo .dec/.dbk \xE9 a op\xE7\xE3o mais confi\xE1vel.");
    console.log("[extractIrpfFromPdf] quality:", quality, "modelUsed:", modelUsed);
    return {
      declaracao_completa: validatedFull.data,
      ano,
      dados,
      diagnostico: {
        fonte: diagnosticSource,
        completude,
        avisos: warnings
      }
    };
  }
  const validatedOld = OldFormatSchema.safeParse(parsed);
  if (validatedOld.success) {
    console.log("[extractIrpfFromPdf] Formato antigo detectado; convertendo");
    const declaracao_completa = mapOldFormatToDeclaracaoCompleta(validatedOld.data);
    const dados = mapOldFormatToDados(validatedOld.data);
    const quality = evaluateExtractionQuality(declaracao_completa);
    warnings.push("Formato legado detectado na extra\xE7\xE3o. Recomenda-se valida\xE7\xE3o manual dos campos antes da simula\xE7\xE3o.");
    if (quality.secoesFracas.length > 0) {
      warnings.push(`Se\xE7\xF5es com baixa cobertura: ${quality.secoesFracas.join(", ")}.`);
    }
    if (quality.suspectedMostlyZero) {
      warnings.push("Extra\xE7\xE3o com poucos valores monet\xE1rios identificados. Para maior confiabilidade, utilize o arquivo .dec/.dbk sempre que dispon\xEDvel.");
    }
    warnings.push(`Confiabilidade da extra\xE7\xE3o: ${quality.completude}.`);
    warnings.push("Para maior precis\xE3o e consist\xEAncia dos dados, a importa\xE7\xE3o por arquivo .dec/.dbk \xE9 a op\xE7\xE3o mais confi\xE1vel.");
    return {
      declaracao_completa,
      ano: validatedOld.data.ano,
      dados,
      diagnostico: {
        fonte: diagnosticSource,
        completude: quality.completude === "alta" ? "media" : quality.completude,
        avisos: warnings
      }
    };
  }
  const firstErr = validatedFull.error?.errors?.[0];
  const path2 = firstErr?.path?.length ? firstErr.path.join(".") : "root";
  const msg = firstErr?.message ? `${firstErr.message} @ ${path2}` : "estrutura invalida";
  throw new Error("Formato inesperado. Extraia os dados manualmente. (" + msg + ")");
}
function normalizeParsedToDeclaracao(parsed) {
  if (Array.isArray(parsed)) {
    const firstObject = parsed.find((item) => item && typeof item === "object");
    if (firstObject) {
      return normalizeParsedToDeclaracao(firstObject);
    }
    return {};
  }
  if (parsed && typeof parsed === "object") {
    const p = parsed;
    const identificacao = normalizeObjectField(p.identificacao ?? p.contribuinte);
    const resumo = normalizeObjectField(p.resumo);
    const lei15270 = normalizeObjectField(p.lei_15_270_classificacao);
    const dependentes = normalizeStructuredArrayField(p.dependentes, "dependentes");
    const pagamentosEfetuados = normalizeStructuredArrayField(p.pagamentos_efetuados, "pagamentos");
    const doacoesDeducoes = normalizeStructuredArrayField(p.doacoes_deducoes, "doacoes");
    return coerceNumericFields({
      identificacao,
      dependentes,
      rendimentos_tributaveis_pj: normalizeSectionWithItems(p.rendimentos_tributaveis_pj, "rendimentos_tributaveis_pj"),
      rendimentos_tributaveis_pf: normalizeSectionWithItems(p.rendimentos_tributaveis_pf, "rendimentos_tributaveis_pf"),
      rendimentos_tributaveis_outros: normalizeSectionWithItems(p.rendimentos_tributaveis_outros, "rendimentos_tributaveis_outros"),
      rendimentos_isentos_nao_tributaveis: normalizeSectionWithItems(p.rendimentos_isentos_nao_tributaveis, "rendimentos_isentos_nao_tributaveis"),
      rendimentos_tributacao_exclusiva_definitiva: normalizeSectionWithItems(p.rendimentos_tributacao_exclusiva_definitiva, "rendimentos_tributacao_exclusiva_definitiva"),
      bens_direitos: normalizeSectionWithItems(p.bens_direitos, "bens_direitos"),
      dividas_onus: normalizeSectionWithItems(p.dividas_onus, "dividas_onus"),
      resumo: {
        base_calculo_ir: 0,
        imposto_devido: 0,
        imposto_pago_retencao: 0,
        imposto_a_restituir: 0,
        imposto_a_pagar: 0,
        ...resumo
      },
      lei_15_270_classificacao: {
        ganho_capital_excluido: 0,
        rendimentos_fiis_excluidos: 0,
        lucros_aprovados_ate_31dez2025: 0,
        outros_excluidos_art_16a: 0,
        ...lei15270
      },
      pagamentos_efetuados: pagamentosEfetuados,
      doacoes_deducoes: doacoesDeducoes,
      informacoes_complementares: p.informacoes_complementares ?? ""
    });
  }
  return parsed;
}
function normalizeArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value;
    if (Array.isArray(obj.itens)) return obj.itens;
    if (Object.keys(obj).length === 0) return [];
    return [obj];
  }
  return [];
}
function normalizeDependenteItem(item) {
  if (item && typeof item === "object" && !Array.isArray(item)) return item;
  if (typeof item === "string" && item.trim()) return { nome: item.trim(), cpf: "" };
  return null;
}
function normalizePagamentoItem(item) {
  if (item && typeof item === "object" && !Array.isArray(item)) return item;
  if (typeof item === "string" && item.trim()) return { tipo: item.trim(), valor: 0 };
  const value = coerceMoneyValue(item);
  if (value != null) return { tipo: void 0, valor: value };
  return null;
}
function normalizeDoacaoItem(item) {
  if (item && typeof item === "object" && !Array.isArray(item)) return item;
  if (typeof item === "string" && item.trim()) return { descricao: item.trim(), valor: 0 };
  const value = coerceMoneyValue(item);
  if (value != null) return { descricao: void 0, valor: value };
  return null;
}
function normalizeStructuredArrayField(value, kind) {
  const raw2 = normalizeArrayField(value);
  const normalized = raw2.map((item) => {
    if (kind === "dependentes") return normalizeDependenteItem(item);
    if (kind === "pagamentos") return normalizePagamentoItem(item);
    return normalizeDoacaoItem(item);
  });
  return normalized.filter((item) => Boolean(item));
}
function normalizeObjectField(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    const firstObject = value.find((item) => item && typeof item === "object" && !Array.isArray(item));
    if (firstObject) return firstObject;
  }
  return {};
}
function normalizeSectionItem(item, sectionKey) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return item;
  }
  const text = typeof item === "string" ? item.trim() : "";
  const parsedNumber = coerceMoneyValue(item);
  const asValue = parsedNumber ?? 0;
  if (sectionKey === "rendimentos_isentos_nao_tributaveis") {
    return { codigo: "", descricao: text || void 0, valor: asValue };
  }
  if (sectionKey === "dividas_onus") {
    return { descricao: text || void 0, valor: asValue };
  }
  if (sectionKey === "bens_direitos") {
    return { descricao: text || void 0, valor_atual: asValue, situacao_31dez: "0" };
  }
  if (sectionKey === "rendimentos_tributaveis_pj") {
    return { nome_fonte: text || void 0, valor: asValue };
  }
  if (sectionKey === "rendimentos_tributaveis_pf") {
    return { descricao: text || void 0, valor: asValue };
  }
  if (sectionKey === "rendimentos_tributacao_exclusiva_definitiva") {
    return { descricao: text || void 0, valor: asValue };
  }
  if (sectionKey === "rendimentos_tributaveis_outros") {
    return { descricao: text || void 0, valor: asValue };
  }
  return text || parsedNumber != null ? { descricao: text || void 0, valor: asValue } : null;
}
function normalizeSectionWithItems(value, sectionKey) {
  if (Array.isArray(value)) {
    return {
      total: 0,
      itens: value.map((item) => normalizeSectionItem(item, sectionKey)).filter((item) => Boolean(item))
    };
  }
  if (value && typeof value === "object") {
    const obj = value;
    const itens = normalizeArrayField(obj.itens ?? obj.items ?? obj.linhas).map((item) => normalizeSectionItem(item, sectionKey)).filter((item) => Boolean(item));
    const total = coerceMoneyValue(obj.total) ?? 0;
    return { total, itens };
  }
  return { total: 0, itens: [] };
}
var KNOWN_ARRAY_KEYS = /* @__PURE__ */ new Set([
  "dependentes",
  "pagamentos_efetuados",
  "doacoes_deducoes",
  "itens"
]);
function collapseUnexpectedObjectArrays(value, key) {
  if (Array.isArray(value)) {
    if (key && KNOWN_ARRAY_KEYS.has(key)) {
      return value.map((item) => collapseUnexpectedObjectArrays(item));
    }
    const firstObject = value.find((item) => item && typeof item === "object" && !Array.isArray(item));
    return firstObject ? collapseUnexpectedObjectArrays(firstObject) : {};
  }
  if (value && typeof value === "object") {
    const obj = value;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = collapseUnexpectedObjectArrays(v, k);
    }
    return out;
  }
  return value;
}
var NUMERIC_KEYS = /* @__PURE__ */ new Set([
  "exercicio",
  "ano_calendario",
  "total",
  "valor",
  "irrf",
  "base_calculo_ir",
  "imposto_devido",
  "imposto_pago_retencao",
  "imposto_ja_pago_carne_leao",
  "imposto_carne_leao",
  "imposto_a_restituir",
  "imposto_a_pagar",
  "situacao_31dez",
  "valor_atual",
  "ganho_capital_excluido",
  "rendimentos_fiis_excluidos",
  "lucros_aprovados_ate_31dez2025",
  "outros_excluidos_art_16a"
]);
var YEAR_KEYS = /* @__PURE__ */ new Set(["exercicio", "ano_calendario"]);
var MONEY_KEYS = /* @__PURE__ */ new Set([
  "total",
  "valor",
  "irrf",
  "base_calculo_ir",
  "imposto_devido",
  "imposto_pago_retencao",
  "imposto_ja_pago_carne_leao",
  "imposto_carne_leao",
  "imposto_a_restituir",
  "imposto_a_pagar",
  "situacao_31dez",
  "valor_atual",
  "ganho_capital_excluido",
  "rendimentos_fiis_excluidos",
  "lucros_aprovados_ate_31dez2025",
  "outros_excluidos_art_16a"
]);
var NON_NUMERIC_KEYS = /* @__PURE__ */ new Set([
  "cpf",
  "cnpj",
  "codigo",
  "mes",
  "nome",
  "nome_fonte",
  "nome_pagador",
  "descricao",
  "tipo_declaracao",
  "cpf_pagador",
  "cnpj_fonte",
  "informacoes_complementares"
]);
var STRING_KEYS = /* @__PURE__ */ new Set([
  "cpf",
  "cnpj",
  "codigo",
  "mes",
  "nome",
  "nome_fonte",
  "nome_pagador",
  "descricao",
  "tipo_declaracao",
  "cpf_pagador",
  "cnpj_fonte",
  "situacao_31dez",
  "parentesco",
  "competencia",
  "codigo_receita",
  "tipo",
  "data_nascimento",
  "titulo_eleitor"
]);
function parsePtBrNumber(raw2) {
  const normalized = raw2.replace(/[R$\s\u00A0]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n2 = Number(normalized);
  return Number.isFinite(n2) ? n2 : null;
}
function extractPtBrNumberFromText(raw2) {
  const candidates = raw2.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+(?:,\d{2})|-?\d+(?:\.\d+)?/g);
  if (!candidates?.length) return null;
  for (const candidate of candidates) {
    const parsed = parsePtBrNumber(candidate);
    if (parsed != null) return parsed;
    const fallback = Number(candidate.replace(",", "."));
    if (Number.isFinite(fallback)) return fallback;
  }
  return null;
}
function coerceMoneyValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsedDirect = parsePtBrNumber(trimmed);
    if (parsedDirect != null) return parsedDirect;
    return extractPtBrNumberFromText(trimmed);
  }
  return null;
}
function coerceNumericFields(value, key) {
  if (Array.isArray(value)) {
    return value.map((item) => coerceNumericFields(item, key));
  }
  if (value && typeof value === "object") {
    const obj = value;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = coerceNumericFields(v, k);
    }
    return out;
  }
  if (typeof value === "string" && key && NUMERIC_KEYS.has(key) && !NON_NUMERIC_KEYS.has(key)) {
    const parsed = coerceMoneyValue(value);
    if (parsed == null && MONEY_KEYS.has(key)) return 0;
    if (parsed == null && YEAR_KEYS.has(key)) return (/* @__PURE__ */ new Date()).getFullYear();
    return parsed ?? value;
  }
  if (typeof value === "number" && key && STRING_KEYS.has(key)) {
    return String(value);
  }
  return value;
}
function mapDeclaracaoCompletaToDados(d) {
  const ident = d.identificacao ?? d.contribuinte ?? {};
  const nome = String(ident?.nome ?? "").trim() || "Contribuinte (verifique)";
  const cpf = String(ident.cpf ?? "").replace(/\D/g, "");
  const rtPj = d.rendimentos_tributaveis_pj ?? { total: 0, itens: [] };
  const rtPf = d.rendimentos_tributaveis_pf ?? { total: 0, itens: [] };
  const rtPjTotal = (rtPj.total ?? 0) > 0 ? rtPj.total ?? 0 : sumMoneyFromSectionItems(rtPj);
  const rtPfTotal = (rtPf.total ?? 0) > 0 ? rtPf.total ?? 0 : sumMoneyFromSectionItems(rtPf);
  const tributaveis_pj = (rtPj.itens ?? []).map((i) => ({ fonte: i.nome_fonte ?? i.fonte ?? "", cnpj: i.cnpj, valor: round26(i.valor ?? 0) }));
  let tributaveis_pf_alugueis = (rtPf.itens ?? []).map((i) => ({ mes: i.mes ?? "", valor: round26(i.valor ?? 0) }));
  if (tributaveis_pf_alugueis.length === 0 && rtPfTotal > 0) {
    tributaveis_pf_alugueis = [{ mes: "Anual", valor: round26(rtPfTotal) }];
  }
  const isentos = d.rendimentos_isentos_nao_tributaveis?.itens ?? [];
  const isentos09 = isentos.filter((i) => String(i.codigo ?? "").includes("09")).map((i) => ({
    nome_fonte: i.nome_fonte ?? i.descricao ?? "Lucros e dividendos",
    cnpj_fonte: i.cnpj_fonte,
    valor: round26(i.valor ?? 0),
    codigo: "09"
  }));
  const isentos13 = isentos.filter((i) => String(i.codigo ?? "").includes("13")).map((i) => ({
    nome_fonte: i.nome_fonte ?? i.descricao ?? "S\xF3cio Simples",
    cnpj_fonte: i.cnpj_fonte,
    valor: round26(i.valor ?? 0),
    codigo: "13"
  }));
  const rendimentos_isentos_dividendos = [...isentos09, ...isentos13];
  const classificacaoDeterministica = classificarIsentosArt16A(
    isentos.map((i) => ({
      codigo: String(i.codigo ?? ""),
      descricao: i.descricao ?? i.nome_fonte,
      nome_fonte: i.nome_fonte,
      valor: round26(i.valor ?? 0)
    }))
  );
  const excl = d.rendimentos_tributacao_exclusiva_definitiva?.itens ?? [];
  const aplicacoes = excl.filter((i) => String(i.codigo ?? "").includes("06")).reduce((s, i) => s + (i.valor ?? 0), 0);
  const jcp = excl.filter((i) => String(i.codigo ?? "").includes("10")).reduce((s, i) => s + (i.valor ?? 0), 0);
  const poupanca = (d.rendimentos_isentos_nao_tributaveis?.itens ?? []).filter((i) => /poupanca|lci|lca|cra|cri/i.test(String(i.descricao ?? i.codigo ?? ""))).reduce((s, i) => s + (i.valor ?? 0), 0);
  const rendimentos_tributaveis = round26(rtPjTotal + rtPfTotal);
  const bens = d.bens_direitos?.itens ?? [];
  const patrimonio_imobiliario = bens.filter((i) => ["01", "11", "12"].includes(String(i.codigo ?? ""))).map((i) => ({ descricao: i.descricao ?? "", valor_atual: round26(i.valor_atual ?? 0) }));
  const resumo = d.resumo ?? {};
  const impostoPagoRetencao = round26(Number(resumo.imposto_pago_retencao ?? 0));
  const impostoCarneLeao = round26(Number(resumo.imposto_ja_pago_carne_leao ?? resumo.imposto_carne_leao ?? 0));
  const impostoAplicacoes = round26(
    excl.filter((i) => String(i.codigo ?? "").includes("06")).reduce((s, i) => s + (i.irrf ?? 0), 0)
  );
  const tributadosLei7713 = excl.map((i) => ({
    descricao: i.descricao ?? i.nome_fonte ?? `Codigo ${i.codigo ?? "N/A"}`,
    valor_bruto: round26(i.valor ?? 0),
    irrf: round26(i.irrf ?? 0),
    aliquota_irrf_percentual: 15
  }));
  const lei15270 = d.lei_15_270_classificacao ?? {};
  const ganhoCapital = round26(Number(lei15270.ganho_capital_excluido ?? 0));
  const fiisExcl = round26(Number(lei15270.rendimentos_fiis_excluidos ?? classificacaoDeterministica.rendimentos_fiis_excluidos ?? 0));
  const lucrosExcl = round26(Number(lei15270.lucros_aprovados_ate_31dez2025 ?? classificacaoDeterministica.lucros_aprovados_ate_31dez2025 ?? 0));
  const ganhoCapitalDeterministico = round26(Number(classificacaoDeterministica.ganho_capital_excluido ?? 0));
  const outrosExclLei = round26(Number(lei15270.outros_excluidos_art_16a ?? classificacaoDeterministica.outros_excluidos_art_16a ?? 0));
  const fiisFallback = fiisExcl === 0 ? round26(
    (d.rendimentos_isentos_nao_tributaveis?.itens ?? []).filter(
      (i) => /fii|fundo imobili|fundo de investimento imobili/i.test(String(i.descricao ?? i.codigo ?? ""))
    ).reduce((s, i) => s + (i.valor ?? 0), 0)
  ) : fiisExcl;
  const outrosExclFallback = outrosExclLei > 0 ? outrosExclLei : identificarOutrosExcluidosArt16A(isentos);
  return {
    contribuinte: { nome, cpf },
    rendimentos_tributaveis,
    rendimentos_isentos_dividendos,
    tributaveis_pj,
    tributaveis_pf_alugueis,
    isentos_lucros_dividendos: isentos09,
    isentos_simples_nacional: isentos13,
    outros_isentos_que_entram_base: classificacaoDeterministica.outros_isentos_que_entram_base,
    outros_rendimentos: {
      aplicacoes_financeiras_exclusiva: round26(aplicacoes),
      juros_capital_proprio: round26(jcp),
      poupanca_lci_lca: round26(poupanca)
    },
    patrimonio_imobiliario,
    imposto_ja_pago_retencao_fonte: impostoPagoRetencao,
    imposto_ja_pago_carne_leao: impostoCarneLeao,
    imposto_ja_pago_aplicacoes: impostoAplicacoes,
    imposto_antecipado_dividendos: 0,
    lucros_aprovados_ate_31dez2025: lucrosExcl,
    ganho_capital_excluido: ganhoCapital > 0 ? ganhoCapital : ganhoCapitalDeterministico,
    rendimentos_fiis_excluidos: fiisFallback,
    outros_excluidos_art_16a: outrosExclFallback,
    rendimentos_tributados_exclusivamente_lei_7713: tributadosLei7713,
    optou_ajuste_anual_lei_7713: false,
    rendimentos_aplicacoes_financeiras_pj: 0,
    aliquota_irrf_comparativo_percentual: 15
  };
}
function mapOldFormatToDeclaracaoCompleta(old) {
  const bc = old.base_calculo_alta_renda ?? {};
  const pjTotal = (bc.tributaveis_pj ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const pfTotal = (bc.tributaveis_pf_alugueis ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const div09 = (bc.isentos_lucros_dividendos ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const div13 = (bc.isentos_simples_nacional ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  return {
    identificacao: {
      nome: old.contribuinte?.nome ?? "",
      cpf: old.contribuinte?.cpf ?? "",
      exercicio: old.ano,
      ano_calendario: old.ano
    },
    dependentes: [],
    rendimentos_tributaveis_pj: { total: round26(pjTotal), itens: (bc.tributaveis_pj ?? []).map((i) => ({ nome_fonte: i.fonte, cnpj: i.cnpj, valor: i.valor })) },
    rendimentos_tributaveis_pf: {
      total: round26(pfTotal),
      itens: (bc.tributaveis_pf_alugueis ?? []).map((i) => ({ valor: i.valor, mes: i.mes }))
    },
    rendimentos_tributaveis_outros: { total: 0, itens: [] },
    rendimentos_isentos_nao_tributaveis: {
      total: round26(div09 + div13),
      itens: [
        ...(bc.isentos_lucros_dividendos ?? []).map((i) => ({ codigo: "09", nome_fonte: i.nome_fonte, cnpj_fonte: i.cnpj_fonte, valor: i.valor })),
        ...(bc.isentos_simples_nacional ?? []).map((i) => ({ codigo: "13", nome_fonte: i.nome_fonte, cnpj_fonte: i.cnpj_fonte, valor: i.valor }))
      ]
    },
    rendimentos_tributacao_exclusiva_definitiva: {
      total: round26((old.outros_rendimentos?.aplicacoes_financeiras_exclusiva ?? 0) + (old.outros_rendimentos?.juros_capital_proprio ?? 0)),
      itens: []
    },
    bens_direitos: {
      total: (old.patrimonio_imobiliario ?? []).reduce((s, i) => s + (i.valor_atual ?? 0), 0),
      itens: (old.patrimonio_imobiliario ?? []).map((i) => ({ codigo: "01", descricao: i.descricao, valor_atual: i.valor_atual }))
    },
    dividas_onus: { total: 0, itens: [] },
    resumo: { base_calculo_ir: 0, imposto_devido: 0, imposto_pago_retencao: 0, imposto_a_restituir: 0, imposto_a_pagar: 0 },
    pagamentos_efetuados: [],
    doacoes_deducoes: [],
    lei_15_270_classificacao: {
      ganho_capital_excluido: 0,
      rendimentos_fiis_excluidos: 0,
      lucros_aprovados_ate_31dez2025: 0,
      outros_excluidos_art_16a: 0
    },
    extraido_em: (/* @__PURE__ */ new Date()).toISOString(),
    fonte: "pdf_daa"
  };
}
function mapOldFormatToDados(old) {
  const bc = old.base_calculo_alta_renda ?? {};
  const rendPj = (bc.tributaveis_pj ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const rendPf = (bc.tributaveis_pf_alugueis ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const outros = old.outros_rendimentos ?? {};
  const isentos09 = (bc.isentos_lucros_dividendos ?? []).map((i) => ({
    nome_fonte: i.nome_fonte ?? "",
    cnpj_fonte: i.cnpj_fonte,
    valor: round26(i.valor ?? 0),
    codigo: "09"
  }));
  const isentos13 = (bc.isentos_simples_nacional ?? []).map((i) => ({
    nome_fonte: i.nome_fonte ?? "",
    cnpj_fonte: i.cnpj_fonte,
    valor: round26(i.valor ?? 0),
    codigo: "13"
  }));
  return {
    contribuinte: { nome: old.contribuinte?.nome ?? "", cpf: (old.contribuinte?.cpf ?? "").replace(/\D/g, "") },
    rendimentos_tributaveis: round26(rendPj + rendPf),
    rendimentos_isentos_dividendos: [...isentos09, ...isentos13],
    tributaveis_pj: (bc.tributaveis_pj ?? []).map((i) => ({ fonte: i.fonte ?? "", cnpj: i.cnpj, valor: round26(i.valor ?? 0) })),
    tributaveis_pf_alugueis: (bc.tributaveis_pf_alugueis ?? []).map((i) => ({ mes: i.mes ?? "", valor: round26(i.valor ?? 0) })),
    isentos_lucros_dividendos: isentos09,
    isentos_simples_nacional: isentos13,
    outros_isentos_que_entram_base: [],
    rendimentos_aplicacoes_financeiras_pj: 0,
    aliquota_irrf_comparativo_percentual: 15,
    rendimentos_tributados_exclusivamente_lei_7713: [],
    outros_rendimentos: {
      aplicacoes_financeiras_exclusiva: round26(outros.aplicacoes_financeiras_exclusiva ?? 0),
      juros_capital_proprio: round26(outros.juros_capital_proprio ?? 0),
      poupanca_lci_lca: round26(outros.poupanca_lci_lca ?? 0)
    },
    patrimonio_imobiliario: (old.patrimonio_imobiliario ?? []).map((i) => ({ descricao: i.descricao ?? "", valor_atual: round26(i.valor_atual ?? 0) })),
    imposto_ja_pago_retencao_fonte: 0,
    imposto_ja_pago_carne_leao: 0,
    imposto_ja_pago_aplicacoes: 0,
    imposto_antecipado_dividendos: 0,
    lucros_aprovados_ate_31dez2025: 0,
    ganho_capital_excluido: 0,
    rendimentos_fiis_excluidos: 0,
    outros_excluidos_art_16a: 0,
    optou_ajuste_anual_lei_7713: false
  };
}
function round26(n2) {
  return Math.round(n2 * 100) / 100;
}

// src/modules/irpf-alta-renda/parse-dec-dbk.ts
var MAX_FILE_SIZE = 5 * 1024 * 1024;
var CPF_LENGTH = 11;
function round27(n2) {
  return parseFloat((Math.round(n2 * 100) / 100).toFixed(2));
}
function parseValorMonetario(s) {
  if (!s || !/^\d+$/.test(s.replace(/\s/g, ""))) return 0;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 3) return 0;
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);
  return round27(parseInt(intPart || "0", 10) + parseInt(decPart, 10) / 100);
}
function parseValor13(s) {
  const d = (s || "").replace(/\D/g, "").slice(0, 13);
  if (d.length < 11) return 0;
  return round27(parseInt(d.slice(0, -2) || "0", 10) + parseInt(d.slice(-2), 10) / 100);
}
function extractCpf(s) {
  const digits = (s || "").replace(/\D/g, "");
  return digits.length >= CPF_LENGTH ? digits.slice(-CPF_LENGTH) : digits;
}
function extractAnoFromFilename(name) {
  const match2 = name.match(/_(20\d{2})_IRPF/i) || name.match(/(20\d{2})[-_]?(20\d{2})?/i) || name.match(/(20\d{2})/);
  return match2 ? parseInt(match2[1], 10) : null;
}
var DEC_DBK_PARSER_VERSION = 3;
var CODIGO_ISENTO_DESCRICAO = {
  "01": "Transferencias patrimoniais (heranca/doacao)",
  "03": "Transferencias patrimoniais entre conjuges/dependentes",
  "05": "Outros rendimentos isentos (subcategoria)",
  "06": "Rendimentos de aplicacoes financeiras (tributacao exclusiva)",
  "09": "Lucros e dividendos recebidos",
  "10": "Juros sobre capital proprio (JCP)",
  "11": "LCI/LCA/Poupanca (isento)",
  "12": "LCI/LCA/Poupanca (isento)",
  "13": "Rendimento de socio ou titular de microempresa/EPP Simples",
  "99": "Outros rendimentos isentos"
};
function parseFixedWidth(lines, filename) {
  const ano = extractAnoFromFilename(filename) ?? (/* @__PURE__ */ new Date()).getFullYear();
  let nome = "";
  let cpf = "";
  let baseCalculoIr = 0;
  let impostoDevido = 0;
  let impostoPagoRetencao = 0;
  let impostoPagoCarneLeao = 0;
  const itensPj = [];
  const itensPf = [];
  const itensIsentos09 = [];
  const itensIsentos13 = [];
  const dependentes = [];
  const bensDireitos = [];
  const codigosValor = {};
  const avisos = [];
  if (lines[0]?.startsWith("IRPF")) {
    const l1 = lines[0];
    const exercAno = l1.substring(8, 16).replace(/\s/g, "");
    if (exercAno.length >= 4) {
      const ex = parseInt(exercAno.substring(0, 4), 10);
      if (ex >= 2020 && ex <= 2030) {
      }
    }
    const segment = l1.substring(16, 50).split(/\s{2,}/)[0] ?? "";
    const cpfStr = segment.replace(/\D/g, "");
    if (cpfStr.length >= 11) {
      cpf = cpfStr.slice(-11);
    }
    const nomePart = l1.substring(37, 100).replace(/^\d+/, "").trim();
    if (nomePart.length > 3) {
      nome = nomePart.split(/\s{2,}/)[0]?.trim() || nomePart.substring(0, 60).trim();
    }
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const tipo = line.substring(0, 2);
    const lineCpf = line.substring(2, 13).replace(/\D/g, "");
    if (lineCpf.length === 11 && !cpf) cpf = lineCpf;
    if (tipo === "21") {
      const nomeEmp = line.substring(24, 74).trim();
      const afterName = line.substring(74);
      const match13 = afterName.match(/\d{13}/);
      const valor = match13 ? parseValor13(match13[0]) : 0;
      if (nomeEmp && valor > 0) {
        itensPj.push({ nome_fonte: nomeEmp, valor });
      }
    } else if (tipo === "22" || tipo === "23") {
      let cod;
      let v;
      if (tipo === "22") {
        cod = line.substring(25, 27).replace(/\D/g, "") || line.substring(23, 25).replace(/\D/g, "");
        const valStr = line.substring(36, 51).replace(/\D/g, "");
        v = valStr.length >= 13 ? parseValorMonetario(valStr) : 0;
      } else {
        cod = line.substring(14, 17).replace(/\D/g, "").padStart(2, "0").slice(-2);
        v = parseValor13(line.substring(17, 30));
      }
      if (cod && v > 0) {
        const c = cod.padStart(2, "0").slice(-2);
        const skipTipo22 = tipo === "22" && (c === "09" || c === "13" || c === "05" || c === "06" || c === "10");
        if (!skipTipo22) {
          codigosValor[c] = (codigosValor[c] || 0) + v;
        }
      }
    } else if (tipo === "24") {
      const cod = line.substring(15, 17).replace(/\D/g, "").padStart(2, "0").slice(-2);
      const v = parseValor13(line.substring(17, 30));
      if (cod && v > 0 && v < 1e12) {
        codigosValor[cod] = (codigosValor[cod] || 0) + v;
      }
    } else if (tipo === "26") {
      const codigo4 = line.substring(13, 17);
      const cod2 = codigo4.substring(0, 2);
      const cnpj14 = line.substring(17, 31).replace(/\D/g, "");
      const nomeFonte = line.substring(34, 94).trim();
      const valorStr = line.substring(105, 118).replace(/\D/g, "");
      const valor = valorStr.length >= 11 ? parseValor13(valorStr) : 0;
      if (cod2 === "09" && valor > 0) {
        itensIsentos09.push({ nome_fonte: nomeFonte || "Dividendos", cnpj_fonte: cnpj14 || void 0, valor });
      } else if (cod2 === "13" && valor > 0) {
        itensIsentos13.push({ nome_fonte: nomeFonte || "S\xF3cio Simples", cnpj_fonte: cnpj14 || void 0, valor });
      }
    } else if (tipo === "20") {
      const totalPj202 = parseValor13(line.substring(13, 26));
      const totalPf20 = parseValor13(line.substring(26, 39));
      if (totalPj202 > 0 || totalPf20 > 0) {
        codigosValor["__totalPj20"] = totalPj202;
        codigosValor["__totalPf20"] = totalPf20;
      }
      const imposto20 = parseValor13(line.substring(64, 77));
      const base20 = parseValor13(line.substring(78, 91));
      if (base20 > 0 && baseCalculoIr === 0) baseCalculoIr = base20;
      if (imposto20 >= 0 && impostoDevido === 0) impostoDevido = imposto20;
    } else if (tipo === "19") {
      const digitsOnly = line.substring(13).replace(/\D/g, "");
      const blocos = [];
      for (let p = 0; p + 13 <= digitsOnly.length; p += 13) {
        blocos.push(parseValor13(digitsOnly.substring(p, p + 13)));
      }
      const v5 = blocos[5] ?? 0;
      const v11 = blocos[11] ?? 0;
      if (v5 > 0 && v5 < 1e9) impostoPagoCarneLeao = v5;
      if (v11 > 0 && v11 < 1e9) impostoPagoRetencao = v11;
    } else if (tipo === "25") {
      const nomeDep = line.substring(13, 73).trim();
      const cpfDep = line.substring(73, 84).replace(/\D/g, "");
      if (nomeDep.length > 2) {
        dependentes.push({
          nome: nomeDep,
          cpf: cpfDep.length === 11 ? cpfDep : void 0,
          parentesco: line.substring(84, 110).trim() || void 0
        });
      }
    } else if (tipo === "27") {
      const cod = line.substring(13, 15).replace(/\D/g, "").padStart(2, "0").slice(-2);
      const valorStr = line.substring(15, 28).replace(/\D/g, "");
      const valor = valorStr.length >= 11 ? parseValor13(valorStr) : 0;
      const descricao = line.substring(28, 90).trim();
      if (cod && valor > 0 && valor < 1e12) {
        const desc = descricao || (cod === "01" ? "Im\xF3vel urbano" : cod === "02" ? "Ve\xEDculo" : cod === "11" ? "Im\xF3vel rural" : cod === "12" ? "Terreno" : `Bem/direito (${cod})`);
        bensDireitos.push({ codigo: cod, descricao: desc, valor_atual: round27(valor) });
      }
    }
  }
  const totalRendPj = codigosValor["__totalPj20"] ?? itensPj.reduce((s, i) => s + i.valor, 0);
  const totalRendPf = codigosValor["__totalPf20"] ?? itensPf.reduce((s, i) => s + i.valor, 0);
  const tot09 = codigosValor["09"] ?? itensIsentos09.reduce((s, i) => s + i.valor, 0);
  const tot13 = codigosValor["13"] ?? itensIsentos13.reduce((s, i) => s + i.valor, 0);
  const itensIsentosOutros = Object.entries(codigosValor).filter(([codigo, valor]) => !codigo.startsWith("__") && codigo !== "09" && codigo !== "13" && Number(valor) > 0).map(([codigo, valor]) => ({
    codigo,
    descricao: CODIGO_ISENTO_DESCRICAO[codigo] ?? `Rendimento isento codigo ${codigo}`,
    valor: round27(Number(valor))
  }));
  if (tot09 > 0 && itensIsentos09.length === 0) {
    itensIsentos09.push({ nome_fonte: "Dividendos (c\xF3d. 09)", valor: tot09 });
  }
  if (tot13 > 0 && itensIsentos13.length === 0) {
    itensIsentos13.push({ nome_fonte: "S\xF3cio Simples (c\xF3d. 13)", valor: tot13 });
  }
  if (totalRendPf > 0 && itensPf.length === 0) {
    avisos.push("O parser identificou total de rendimentos PF sem detalhamento por item. Revise manualmente alugu\xE9is/carn\xEA-le\xE3o.");
  }
  const somaItensPj = itensPj.reduce((s, i) => s + i.valor, 0);
  const totalPj20 = codigosValor["__totalPj20"];
  if (totalPj20 != null && somaItensPj > 0 && Math.abs(totalPj20 - somaItensPj) / totalPj20 > 0.01) {
    avisos.push(`Discrep\xE2ncia entre total PJ (tipo 20: R$ ${totalPj20.toLocaleString("pt-BR")}) e soma dos itens (R$ ${somaItensPj.toLocaleString("pt-BR")}). Verifique os dados.`);
  }
  if (impostoPagoRetencao === 0 && impostoPagoCarneLeao === 0) {
    avisos.push("Imposto j\xE1 pago por reten\xE7\xE3o/carn\xEA-le\xE3o n\xE3o identificado automaticamente no arquivo. Confirme estes campos antes de simular.");
  }
  if (!nome && cpf) nome = "Contribuinte (importado)";
  if (!nome && !cpf) nome = "Contribuinte (verifique os dados)";
  if (!cpf) cpf = "00000000000";
  return buildResult(
    ano,
    nome,
    cpf,
    totalRendPj,
    totalRendPf,
    itensPj,
    itensPf,
    itensIsentos09,
    itensIsentos13,
    itensIsentosOutros,
    baseCalculoIr,
    impostoDevido,
    impostoPagoRetencao,
    impostoPagoCarneLeao,
    tot09,
    tot13,
    dependentes,
    bensDireitos,
    {
      fonte: "dec_dbk_fixed_width",
      completude: totalRendPj + totalRendPf <= 0 ? "baixa" : avisos.length > 1 ? "media" : "alta",
      avisos
    }
  );
}
function buildResult(ano, nome, cpf, totalRendPj, totalRendPf, itensPj, itensPf, itensIsentos09, itensIsentos13, itensIsentosOutros, baseCalculoIr, impostoDevido, impostoPagoRetencao, impostoPagoCarneLeao, tot09 = 0, tot13 = 0, dependentes = [], bensDireitos = [], diagnostico) {
  const t09 = round27(tot09 > 0 ? tot09 : itensIsentos09.reduce((s, i) => s + i.valor, 0));
  const t13 = round27(tot13 > 0 ? tot13 : itensIsentos13.reduce((s, i) => s + i.valor, 0));
  const rendimentos_tributaveis = round27(totalRendPj + totalRendPf);
  const rendimentos_isentos_dividendos = [
    ...itensIsentos09.map((i) => ({ ...i, valor: round27(i.valor), codigo: "09" })),
    ...itensIsentos13.map((i) => ({ ...i, valor: round27(i.valor), codigo: "13" }))
  ];
  const classificacaoIsentos = classificarIsentosArt16A([
    ...itensIsentos09.map((i) => ({
      codigo: "09",
      descricao: i.nome_fonte,
      nome_fonte: i.nome_fonte,
      valor: round27(i.valor)
    })),
    ...itensIsentos13.map((i) => ({
      codigo: "13",
      descricao: i.nome_fonte,
      nome_fonte: i.nome_fonte,
      valor: round27(i.valor)
    })),
    ...itensIsentosOutros.map((i) => ({
      codigo: i.codigo,
      descricao: i.descricao,
      valor: round27(i.valor)
    }))
  ]);
  const totalBens = round27(bensDireitos.reduce((s, b) => s + b.valor_atual, 0));
  const patrimonioImobiliario = bensDireitos.filter((b) => ["01", "11", "12"].includes(b.codigo ?? "")).map((b) => ({ descricao: b.descricao ?? "", valor_atual: round27(b.valor_atual) }));
  const declaracao_completa = {
    identificacao: { nome, cpf, exercicio: ano, ano_calendario: ano - 1 },
    dependentes: dependentes.map((d) => ({ nome: d.nome ?? "", cpf: d.cpf ?? "", parentesco: d.parentesco })),
    rendimentos_tributaveis_pj: { total: round27(totalRendPj), itens: itensPj.map((i) => ({ ...i, valor: round27(i.valor) })) },
    rendimentos_tributaveis_pf: { total: round27(totalRendPf), itens: itensPf.map((i) => ({ ...i, valor: round27(i.valor) })) },
    rendimentos_tributaveis_outros: { total: 0, itens: [] },
    rendimentos_isentos_nao_tributaveis: {
      total: round27(t09 + t13 + itensIsentosOutros.reduce((s, i) => s + (i.valor ?? 0), 0)),
      itens: [
        ...itensIsentos09.map((i) => ({ codigo: "09", nome_fonte: i.nome_fonte, valor: round27(i.valor) })),
        ...itensIsentos13.map((i) => ({ codigo: "13", nome_fonte: i.nome_fonte, valor: round27(i.valor) })),
        ...itensIsentosOutros.map((i) => ({ codigo: i.codigo, descricao: i.descricao, valor: round27(i.valor) }))
      ]
    },
    rendimentos_tributacao_exclusiva_definitiva: { total: 0, itens: [] },
    bens_direitos: {
      total: totalBens,
      itens: bensDireitos.map((b) => ({
        codigo: b.codigo,
        descricao: b.descricao,
        valor_atual: round27(b.valor_atual)
      }))
    },
    dividas_onus: { total: 0, itens: [] },
    resumo: {
      base_calculo_ir: round27(baseCalculoIr || rendimentos_tributaveis),
      imposto_devido: round27(impostoDevido),
      imposto_pago_retencao: round27(impostoPagoRetencao + impostoPagoCarneLeao),
      imposto_a_restituir: 0,
      imposto_a_pagar: 0
    },
    pagamentos_efetuados: [],
    doacoes_deducoes: [],
    lei_15_270_classificacao: {
      ganho_capital_excluido: classificacaoIsentos.ganho_capital_excluido,
      rendimentos_fiis_excluidos: classificacaoIsentos.rendimentos_fiis_excluidos,
      lucros_aprovados_ate_31dez2025: classificacaoIsentos.lucros_aprovados_ate_31dez2025,
      outros_excluidos_art_16a: classificacaoIsentos.outros_excluidos_art_16a
    },
    fonte: "dec_dbk",
    extraido_em: (/* @__PURE__ */ new Date()).toISOString()
  };
  const dadosParsed = {
    contribuinte: { nome, cpf: cpf.replace(/\D/g, "").padStart(11, "0") },
    rendimentos_tributaveis,
    rendimentos_isentos_dividendos,
    tributaveis_pj: itensPj.map((i) => ({ fonte: i.nome_fonte ?? "", cnpj: i.cnpj ?? "", valor: round27(i.valor) })),
    tributaveis_pf_alugueis: itensPf.map((i) => ({ mes: i.mes ?? "", valor: round27(i.valor) })),
    patrimonio_imobiliario: patrimonioImobiliario,
    isentos_lucros_dividendos: itensIsentos09.map((i) => ({ nome_fonte: i.nome_fonte ?? "", cnpj_fonte: i.cnpj_fonte, valor: round27(i.valor) })),
    isentos_simples_nacional: itensIsentos13.map((i) => ({ nome_fonte: i.nome_fonte ?? "", cnpj_fonte: i.cnpj_fonte, valor: round27(i.valor) })),
    outros_isentos_que_entram_base: classificacaoIsentos.outros_isentos_que_entram_base,
    rendimentos_tributados_exclusivamente_lei_7713: classificacaoIsentos.rendimentos_tributados_exclusivamente_lei_7713,
    imposto_ja_pago_retencao_fonte: round27(impostoPagoRetencao),
    imposto_ja_pago_carne_leao: round27(impostoPagoCarneLeao),
    imposto_ja_pago_aplicacoes: 0,
    imposto_antecipado_dividendos: 0,
    lucros_aprovados_ate_31dez2025: classificacaoIsentos.lucros_aprovados_ate_31dez2025,
    ganho_capital_excluido: classificacaoIsentos.ganho_capital_excluido,
    rendimentos_fiis_excluidos: classificacaoIsentos.rendimentos_fiis_excluidos,
    outros_excluidos_art_16a: classificacaoIsentos.outros_excluidos_art_16a
  };
  const declaracaoValidada = DeclaracaoIrpfCompletaSchema.parse(declaracao_completa);
  const dadosValidados = DadosIrpfAltaRendaSchema.parse(dadosParsed);
  return {
    ano,
    dados: dadosValidados,
    declaracao_completa: declaracaoValidada,
    parser_version: DEC_DBK_PARSER_VERSION,
    diagnostico
  };
}
function parseDecDbk(buffer, filename = "") {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Arquivo muito grande. M\xE1ximo 5MB.");
  }
  let text;
  try {
    text = buffer.toString("utf-8");
    if (text.includes("\uFFFD")) {
      text = buffer.toString("latin1");
    }
  } catch {
    throw new Error("N\xE3o foi poss\xEDvel ler o arquivo. Verifique o encoding.");
  }
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  if (lines.length === 0) {
    throw new Error("Arquivo vazio ou formato inv\xE1lido.");
  }
  const hasPipe = lines.some((l) => l.includes("|"));
  const hasIrpfHeader = lines[0]?.startsWith("IRPF");
  if (hasPipe) {
    return parsePipeDelimited(lines, filename);
  }
  if (hasIrpfHeader || lines[0] && /^\d{2}\d{11}/.test(lines[0])) {
    return parseFixedWidth(lines, filename);
  }
  throw new Error(
    "Formato n\xE3o reconhecido. Use arquivo .dec ou .dbk do Programa IRPF ou e-CAC."
  );
}
function parsePipeDelimited(lines, filename) {
  const ano = extractAnoFromFilename(filename) ?? (/* @__PURE__ */ new Date()).getFullYear();
  const records = lines.map((line) => line.split("|").map((f) => f.trim()));
  let nome = "";
  let cpf = "";
  let baseCalculoIr = 0;
  let impostoDevido = 0;
  let impostoPagoRetencao = 0;
  const itensPj = [];
  const itensPf = [];
  const itensIsentos09 = [];
  const itensIsentos13 = [];
  const itensIsentosOutros = [];
  let totalRendPj = 0;
  let totalRendPf = 0;
  const avisos = [];
  for (const fields of records) {
    const tipo = (fields[0] ?? "").toUpperCase().slice(0, 6);
    if (tipo.startsWith("DECPF") || tipo.startsWith("RESPO") || tipo === "00" || tipo === "01") {
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i] ?? "";
        const cpfCandidate = extractCpf(f);
        if (cpfCandidate.length === CPF_LENGTH && !cpf) cpf = cpfCandidate;
        if (f.length > 3 && /^[A-Za-zÀ-ÿ\s]+$/.test(f) && f.length < 100 && !nome) {
          const clean = f.replace(/\d/g, "").trim();
          if (clean.length > 5) nome = clean;
        }
      }
    }
    if (tipo.startsWith("RTRT") || tipo === "10" || tipo === "11") {
      let valor = 0;
      let cnpj = "";
      let desc = "";
      for (let i = 1; i < fields.length; i++) {
        const v = parseValorMonetario(fields[i] ?? "");
        if (v > 0 && valor === 0) valor = v;
        const digits = (fields[i] ?? "").replace(/\D/g, "");
        if (digits.length === 14) cnpj = digits;
        if (typeof fields[i] === "string" && fields[i].length > 2 && !/^\d+$/.test(fields[i])) desc = fields[i];
      }
      if (valor > 0) {
        itensPj.push({ cnpj: cnpj || void 0, nome_fonte: desc || void 0, valor });
        totalRendPj += valor;
      }
    }
    if (tipo.startsWith("RTIRF") || tipo === "12") {
      const v = parseValorMonetario(fields[1] ?? fields[2] ?? "");
      if (v > 0) impostoPagoRetencao += v;
    }
    const codigoReceita = (fields[2] ?? fields[3] ?? "").replace(/\D/g, "");
    const valorField = fields[fields.length - 1] ?? fields[fields.length - 2] ?? "";
    if (/09|090/.test(codigoReceita) || tipo.includes("09")) {
      const v = parseValorMonetario(valorField);
      if (v > 0) itensIsentos09.push({ nome_fonte: fields[1] ?? "Dividendos", valor: v });
    }
    if (/13|130/.test(codigoReceita) || tipo.includes("13")) {
      const v = parseValorMonetario(valorField);
      if (v > 0) itensIsentos13.push({ nome_fonte: fields[1] ?? "S\xF3cio Simples", valor: v });
    }
    if (codigoReceita && !/^(09|090|13|130)$/.test(codigoReceita)) {
      const v = parseValorMonetario(valorField);
      if (v > 0) {
        const cod = codigoReceita.padStart(2, "0").slice(-2);
        itensIsentosOutros.push({
          codigo: cod,
          descricao: fields[1] || CODIGO_ISENTO_DESCRICAO[cod] || `Rendimento isento codigo ${cod}`,
          valor: v
        });
      }
    }
    if ((tipo === "TOTRES" || tipo === "99") && fields.length >= 3) {
      const bc = parseValorMonetario(fields[1] ?? fields[2] ?? "");
      const imp = parseValorMonetario(fields[2] ?? fields[3] ?? "");
      if (bc > 0) baseCalculoIr = bc;
      if (imp > 0) impostoDevido = imp;
    }
  }
  if (!nome && cpf) nome = "Contribuinte (importado)";
  if (!nome && !cpf) nome = "Contribuinte (verifique os dados)";
  if (!cpf) cpf = "00000000000";
  if (totalRendPf === 0) {
    avisos.push("Rendimentos tribut\xE1veis de PF n\xE3o foram encontrados no layout pipe; valide esse valor manualmente.");
  }
  if (impostoPagoRetencao === 0) {
    avisos.push("Imposto j\xE1 pago por reten\xE7\xE3o n\xE3o identificado automaticamente no layout pipe. Confirme antes de simular.");
  }
  return buildResult(
    ano,
    nome,
    cpf,
    totalRendPj,
    totalRendPf,
    itensPj,
    itensPf,
    itensIsentos09,
    itensIsentos13,
    itensIsentosOutros,
    baseCalculoIr,
    impostoDevido,
    impostoPagoRetencao,
    0,
    // impostoPagoCarneLeao (não extraído no layout pipe)
    0,
    0,
    [],
    // dependentes (layout pipe não parseia tipo 25)
    [],
    // bensDireitos (layout pipe não parseia tipo 27)
    {
      fonte: "dec_dbk_pipe",
      completude: totalRendPj + totalRendPf <= 0 ? "baixa" : avisos.length > 1 ? "media" : "alta",
      avisos
    }
  );
}

// src/modules/irpf-alta-renda/irpf-alta-renda.routes.ts
var irpfAltaRendaRoutes = new Hono2();
irpfAltaRendaRoutes.use("/*", tenantMiddleware);
irpfAltaRendaRoutes.use("/*", authMiddleware);
irpfAltaRendaRoutes.use("/*", requireModule("IRPF_ALTA_RENDA"));
var repo2 = new IrpfAltaRendaRepository();
var companyRepo5 = new CompanyRepository();
var service2 = new IrpfAltaRendaService(repo2, companyRepo5);
var MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
irpfAltaRendaRoutes.post("/extract-from-pdf", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return c.json({ error: { message: "Envie um arquivo PDF (campo file).", code: "FILE_REQUIRED" } }, 400);
    }
    if (!file.type?.includes("pdf") && !file.name?.toLowerCase().endsWith(".pdf")) {
      return c.json({ error: { message: "O arquivo deve ser um PDF.", code: "INVALID_FILE_TYPE" } }, 400);
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      return c.json({ error: { message: "O arquivo PDF deve ter no m\xE1ximo 10MB.", code: "FILE_TOO_LARGE" } }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await extractIrpfFromPdf(buffer);
    return c.json({ data: { ...result, arquivo_nome: file.name } }, 200);
  } catch (err) {
    return errorHandler2(err, c);
  }
});
irpfAltaRendaRoutes.get(
  "/import-declaration",
  (c) => c.json({ error: { message: "Use POST para importar arquivo .dec/.dbk.", code: "METHOD_NOT_ALLOWED" } }, 405)
);
irpfAltaRendaRoutes.post("/import-declaration", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return c.json({ error: { message: "Envie um arquivo .dec ou .dbk (campo file).", code: "FILE_REQUIRED" } }, 400);
    }
    const name = (file.name ?? "").toLowerCase();
    if (!name.endsWith(".dec") && !name.endsWith(".dbk")) {
      return c.json({ error: { message: "O arquivo deve ser .dec ou .dbk.", code: "INVALID_FILE_TYPE" } }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = parseDecDbk(buffer, file.name);
    return c.json({ data: { ...result, arquivo_nome: file.name } }, 200);
  } catch (err) {
    return errorHandler2(err, c);
  }
});
irpfAltaRendaRoutes.post(
  "/simulate",
  zValidator("json", SimulateIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const result = await service2.simulate(input);
      return c.json({ data: result }, 200);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
irpfAltaRendaRoutes.post(
  "/simulate-and-save",
  zValidator("json", SimulateAndSaveIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const userId = c.get("user")?.id;
      const { registro, resultado } = await service2.simulateAndSave(input, userId);
      return c.json({ data: { registro, resultado } }, 201);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
irpfAltaRendaRoutes.post(
  "/report-summary",
  zValidator("json", ReportSummaryIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const summary = await service2.buildReportSummary(input);
      return c.json({ data: summary }, 200);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
irpfAltaRendaRoutes.get(
  "/",
  zValidator("query", ListIrpfAltaRendaQuerySchema),
  async (c) => {
    try {
      const query2 = c.req.valid("query");
      const { items, total } = await service2.list({
        company_id: query2.company_id,
        ano: query2.ano,
        page: query2.page,
        limit: query2.limit
      });
      return c.json({
        data: { items, total, page: query2.page, limit: query2.limit }
      });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
irpfAltaRendaRoutes.get(
  "/:id",
  zValidator("param", IrpfAltaRendaIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const registro = await service2.getById(id);
      return c.json({ data: { registro } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
irpfAltaRendaRoutes.patch(
  "/:id",
  zValidator("param", IrpfAltaRendaIdParamSchema),
  zValidator("json", UpdateIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      const userId = c.get("user")?.id;
      const { registro, resultado } = await service2.update(id, input, userId);
      return c.json({ data: { registro, resultado } }, 200);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
irpfAltaRendaRoutes.delete(
  "/:id",
  zValidator("param", IrpfAltaRendaIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      await service2.delete(id);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);

// src/modules/properties/calculations.ts
var FAIXAS_IRPF_2026 = [
  { limite: 2428.8, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { limite: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { limite: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { limite: Infinity, aliquota: 0.275, deducao: 908.73 }
];
var PRESUNCAO_IRPJ = 0.32;
var PRESUNCAO_CSLL = 0.32;
var PRESUNCAO_IRPJ_16 = 0.16;
var LIMITE_PRESUNCAO_16_SERVICOS = 12e4;
var ALIQ_IRPJ2 = 0.15;
var ALIQ_IRPJ_ADICIONAL2 = 0.1;
var ALIQ_CSLL2 = 0.09;
var ALIQ_PIS2 = 65e-4;
var ALIQ_COFINS2 = 0.03;
var LIMITE_LUCRO_PRESUMIDO_ADICIONAL2 = 6e4;
var LIMITE_TRIMESTRAL_IN2306 = 125e4;
var LIMITE_ANUAL_IN2306 = 5e6;
function round28(n2) {
  return Math.round(n2 * 100) / 100;
}
function impostoIRPFMensal(baseCalculo) {
  if (baseCalculo <= 0) return 0;
  for (const faixa of FAIXAS_IRPF_2026) {
    if (baseCalculo <= faixa.limite) {
      return round28(baseCalculo * faixa.aliquota - faixa.deducao);
    }
  }
  return round28(baseCalculo * 0.275 - 908.73);
}
function calcularPF(aggregated, aliquotaEfetivaDirpf) {
  const { receita_total, despesas_dedutiveis_total, meses } = aggregated;
  const baseTotal = Math.max(0, receita_total - despesas_dedutiveis_total);
  let impostoTotal = 0;
  const trimestres = [];
  for (let t = 1; t <= 4; t++) {
    const startMonth = (t - 1) * 3;
    let recTrim = 0;
    let despTrim = 0;
    let impTrim = 0;
    for (let m = 0; m < 3; m++) {
      const mes = meses[startMonth + m];
      if (mes) {
        recTrim += mes.receita;
        despTrim += mes.despesas_dedutiveis;
        const baseMes = Math.max(0, mes.receita - mes.despesas_dedutiveis);
        impTrim += impostoIRPFMensal(baseMes);
      }
    }
    impostoTotal += impTrim;
    trimestres.push({
      trimestre: t,
      receita: round28(recTrim),
      despesas_dedutiveis: round28(despTrim),
      base_calculo: round28(Math.max(0, recTrim - despTrim)),
      imposto: round28(impTrim)
    });
  }
  const aliquotaEfetiva = aliquotaEfetivaDirpf !== void 0 && aliquotaEfetivaDirpf >= 0 ? aliquotaEfetivaDirpf / 100 : baseTotal > 0 ? impostoTotal / baseTotal : 0;
  return {
    receita_bruta_total: round28(receita_total),
    despesas_dedutiveis_total: round28(despesas_dedutiveis_total),
    base_calculo_total: round28(baseTotal),
    imposto_total: round28(impostoTotal),
    aliquota_efetiva_anual: round28(aliquotaEfetiva * 100),
    trimestres
  };
}
function adicionalIRPJ2(baseCalculoTrimestre) {
  if (baseCalculoTrimestre <= LIMITE_LUCRO_PRESUMIDO_ADICIONAL2) return 0;
  const baseAdicional = baseCalculoTrimestre - LIMITE_LUCRO_PRESUMIDO_ADICIONAL2;
  return round28(baseAdicional * ALIQ_IRPJ_ADICIONAL2);
}
function calcularPJ(aggregated, elegivelPresuncao16) {
  const { receita_total, meses } = aggregated;
  const presCsll = PRESUNCAO_CSLL;
  let receitaAcumulada = 0;
  let aplicouIN2306 = false;
  let irpjPostergadoTotal = 0;
  const trimestreData = [];
  for (let t = 1; t <= 4; t++) {
    const startMonth = (t - 1) * 3;
    let recTrim = 0;
    for (let m = 0; m < 3; m++) {
      const mes = meses[startMonth + m];
      if (mes) recTrim += mes.receita;
    }
    receitaAcumulada += recTrim;
    const usar16 = elegivelPresuncao16 && receitaAcumulada <= LIMITE_PRESUNCAO_16_SERVICOS;
    const presIrpj = usar16 ? PRESUNCAO_IRPJ_16 : PRESUNCAO_IRPJ;
    trimestreData.push({
      trimestre: t,
      receita: round28(recTrim),
      recTrim,
      presuncaoUsada: presIrpj
    });
  }
  const trimestres = [];
  let receitaAcumAnterior = 0;
  let indicePrimeiroExcesso = -1;
  for (let i = 0; i < trimestreData.length; i++) {
    const { trimestre, receita, recTrim, presuncaoUsada } = trimestreData[i];
    receitaAcumAnterior += recTrim;
    const excedenteTrimestral = Math.max(0, recTrim - LIMITE_TRIMESTRAL_IN2306);
    const fatorAcrescimo = excedenteTrimestral > 0 || receitaAcumAnterior > LIMITE_ANUAL_IN2306 ? 1.1 : 1;
    if (fatorAcrescimo > 1) aplicouIN2306 = true;
    const baseNormal = Math.min(recTrim, LIMITE_TRIMESTRAL_IN2306);
    const baseExcedente = excedenteTrimestral;
    const baseIrpj = baseNormal * presuncaoUsada + baseExcedente * presuncaoUsada * fatorAcrescimo;
    const baseCsll = baseNormal * presCsll + baseExcedente * presCsll * fatorAcrescimo;
    let irpj = round28(baseIrpj * ALIQ_IRPJ2);
    const irpjAdic = adicionalIRPJ2(baseIrpj);
    let irpjPostergado = 0;
    if (elegivelPresuncao16 && presuncaoUsada === PRESUNCAO_IRPJ && indicePrimeiroExcesso < 0) {
      indicePrimeiroExcesso = i;
      for (let q = 0; q < i; q++) {
        const qData = trimestreData[q];
        if (qData.presuncaoUsada === PRESUNCAO_IRPJ_16) {
          const base16 = qData.recTrim * PRESUNCAO_IRPJ_16;
          const base32 = qData.recTrim * PRESUNCAO_IRPJ;
          const difBase = base32 - base16;
          const difIrpj = round28(difBase * ALIQ_IRPJ2);
          const difAdic = adicionalIRPJ2(base32) - adicionalIRPJ2(base16);
          irpjPostergado += round28(difIrpj + difAdic);
        }
      }
      irpjPostergadoTotal += irpjPostergado;
    }
    const csll = round28(baseCsll * ALIQ_CSLL2);
    const pis = round28(recTrim * ALIQ_PIS2);
    const cofins = round28(recTrim * ALIQ_COFINS2);
    trimestres.push({
      trimestre,
      receita,
      base_irpj: round28(baseIrpj),
      base_csll: round28(baseCsll),
      presuncao_irpj_pct: presuncaoUsada * 100,
      irpj,
      irpj_adicional: irpjAdic,
      irpj_postergado: irpjPostergado,
      csll,
      pis,
      cofins
    });
  }
  const impostoTotal = trimestres.reduce(
    (s, x) => s + x.irpj + x.irpj_adicional + x.irpj_postergado + x.csll + x.pis + x.cofins,
    0
  );
  const aliquotaEfetiva = receita_total > 0 ? impostoTotal / receita_total * 100 : 0;
  return {
    receita_bruta_total: round28(receita_total),
    base_presumida_irpj: round28(
      trimestres.reduce((s, x) => s + x.base_irpj, 0)
    ),
    base_presumida_csll: round28(
      trimestres.reduce((s, x) => s + x.base_csll, 0)
    ),
    irpj: round28(trimestres.reduce((s, x) => s + x.irpj, 0)),
    irpj_adicional: round28(trimestres.reduce((s, x) => s + x.irpj_adicional, 0)),
    irpj_postergado: round28(irpjPostergadoTotal),
    csll: round28(trimestres.reduce((s, x) => s + x.csll, 0)),
    pis: round28(trimestres.reduce((s, x) => s + x.pis, 0)),
    cofins: round28(trimestres.reduce((s, x) => s + x.cofins, 0)),
    imposto_total: round28(impostoTotal),
    aliquota_efetiva: round28(aliquotaEfetiva),
    aplicou_in_2306: aplicouIN2306,
    trimestres
  };
}
var ALIQUOTA_CBS_2027_2028 = 9;
var REDUTOR_LOCACAO_RESIDENCIAL = 70;
var REDUTOR_SHORT_STAY = 50;
var ALIQUOTA_TRANSICAO_ART487 = 3.65;
function calcularReforma2027(aggregated, aliquotaIbsCbsOverride, redutorLocacaoPct, opcoes) {
  const { receita_total, custos_operacionais_total, ano: aggAno } = aggregated;
  const ano = opcoes?.ano ?? aggAno ?? 2027;
  const aliquotaNominal = aliquotaIbsCbsOverride ?? (ano >= 2027 && ano <= 2028 ? ALIQUOTA_CBS_2027_2028 : 26.5);
  const receitaLonga = opcoes?.receita_longa_total ?? 0;
  const receitaShort = opcoes?.receita_short_total ?? 0;
  const usarRedutorDiferenciado = opcoes?.usar_redutor_diferenciado_short === true && receitaShort > receitaLonga && receita_total > 0;
  const redutorLong = redutorLocacaoPct ?? opcoes?.redutor_locacao_pct ?? REDUTOR_LOCACAO_RESIDENCIAL;
  const redutorShort = opcoes?.redutor_short_stay_pct ?? REDUTOR_SHORT_STAY;
  let ibsCbsReceita;
  let creditosIbsCbs;
  let redutorExibicao;
  if (usarRedutorDiferenciado) {
    const partLong = receitaLonga / receita_total;
    const partShort = receitaShort / receita_total;
    const rateLong = aliquotaNominal / 100 * (1 - redutorLong / 100);
    const rateShort = aliquotaNominal / 100 * (1 - redutorShort / 100);
    ibsCbsReceita = round28(receita_total * (partLong * rateLong + partShort * rateShort));
    const rateMedio = receita_total > 0 ? ibsCbsReceita / receita_total : 0;
    creditosIbsCbs = round28(custos_operacionais_total * rateMedio);
    redutorExibicao = redutorLong;
  } else {
    const redutor = redutorLocacaoPct ?? opcoes?.redutor_locacao_pct ?? REDUTOR_LOCACAO_RESIDENCIAL;
    const aliquotaEfetivaRate = aliquotaNominal / 100 * (1 - redutor / 100);
    ibsCbsReceita = round28(receita_total * aliquotaEfetivaRate);
    creditosIbsCbs = round28(custos_operacionais_total * aliquotaEfetivaRate);
    redutorExibicao = redutor;
  }
  let ibsCbsLiquido = Math.max(0, round28(ibsCbsReceita - creditosIbsCbs));
  let aplicouTransicao = false;
  let impostoTransicao365;
  if (opcoes?.contrato_antes_16012025 && receita_total > 0) {
    impostoTransicao365 = round28(receita_total * (ALIQUOTA_TRANSICAO_ART487 / 100));
    if (impostoTransicao365 < ibsCbsLiquido) {
      ibsCbsLiquido = impostoTransicao365;
      aplicouTransicao = true;
    }
  }
  const aliquotaEfetiva = receita_total > 0 ? ibsCbsLiquido / receita_total * 100 : 0;
  return {
    receita_bruta_total: round28(receita_total),
    custos_operacionais_total: round28(custos_operacionais_total),
    creditos_ibs_cbs: creditosIbsCbs,
    ibs_cbs_sobre_receita: ibsCbsReceita,
    ibs_cbs_liquido: ibsCbsLiquido,
    imposto_total: round28(ibsCbsLiquido),
    aliquota_efetiva: round28(aliquotaEfetiva),
    aliquota_nominal_ibs_cbs: round28(aliquotaNominal),
    redutor_locacao_aplicado_pct: redutorExibicao,
    ...impostoTransicao365 != null && { imposto_transicao_365: impostoTransicao365 },
    ...aplicouTransicao && { aplicou_transicao_art487: true },
    ...usarRedutorDiferenciado && { redutor_diferenciado_short: true }
  };
}
function calcularBreakEven(cargaPFPercentual, cargaPJPercentual) {
  if (cargaPJPercentual >= cargaPFPercentual) return null;
  const diferenca = cargaPFPercentual - cargaPJPercentual;
  if (diferenca <= 0) return null;
  return round28(12e3);
}

// src/modules/properties/property.service.ts
var EMBASAMENTOS_LEGAIS = [
  {
    cenario: "pf",
    norma: "Lei 7.713/88",
    artigo: "Art. 3\xBA e seguintes",
    descricao: "Dedu\xE7\xF5es de despesas com im\xF3veis de uso residencial (IPTU, condom\xEDnio, juros, manuten\xE7\xE3o etc.) da base de c\xE1lculo do IR."
  },
  {
    cenario: "pf",
    norma: "Lei 9.250/95 e legisla\xE7\xE3o do IR",
    descricao: "Imposto de Renda sobre rendimentos de loca\xE7\xE3o: tabela progressiva mensal (Carn\xEA-Le\xE3o), aplic\xE1vel \xE0 base l\xEDquida ap\xF3s dedu\xE7\xF5es."
  },
  {
    cenario: "pf",
    norma: "EC 132/2023",
    descricao: "Reforma Tribut\xE1ria: previs\xE3o do IBS e da CBS no \xE2mbito do consumo."
  },
  {
    cenario: "pj",
    norma: "Lei 9.249/95",
    artigo: "Art. 15 e 16",
    descricao: "Lucro Presumido: presun\xE7\xE3o de lucro para IRPJ e CSLL (32% para loca\xE7\xE3o de im\xF3veis; 16% para servi\xE7os em condi\xE7\xF5es legais)."
  },
  {
    cenario: "pj",
    norma: "IN RFB 2.306/2026",
    descricao: "Acr\xE9scimo de 10% na presun\xE7\xE3o quando receita trimestral > R$ 1,25 mi ou anual > R$ 5 mi."
  },
  {
    cenario: "pj",
    norma: "Lei 10.637/02 e 10.833/03",
    descricao: "PIS e COFINS sobre faturamento (cumulativos no Lucro Presumido)."
  },
  {
    cenario: "reforma",
    norma: "LC 214/2025",
    artigo: "Art. 261, par\xE1grafo \xFAnico",
    descricao: "Redu\xE7\xE3o de 70% nas al\xEDquotas do IBS e da CBS nas opera\xE7\xF5es de loca\xE7\xE3o, cess\xE3o onerosa e arrendamento de bens im\xF3veis."
  },
  {
    cenario: "reforma",
    norma: "LC 214/2025",
    artigo: "Arts. 257 e 258",
    descricao: "Redutor de ajuste vinculado ao im\xF3vel para reduzir a base de c\xE1lculo nas opera\xE7\xF5es de aliena\xE7\xE3o (venda)."
  },
  {
    cenario: "reforma",
    norma: "LC 214/2025",
    artigo: "Art. 487",
    descricao: "Op\xE7\xE3o de 3,65% sobre faturamento bruto para contratos de loca\xE7\xE3o firmados at\xE9 16/01/2025 (regime de transi\xE7\xE3o at\xE9 fim do contrato ou 31/12/2028)."
  },
  {
    cenario: "reforma",
    norma: "Transi\xE7\xE3o 2027-2029",
    descricao: "Vig\xEAncia isolada da CBS (9%) em 2027 e 2028; o IBS passa a vigorar a partir de 2029, quando a al\xEDquota nominal IBS+CBS atinge a faixa de 26,5% a 28%."
  },
  {
    cenario: "reforma",
    norma: "Redutor diferenciado (LC 214/2025)",
    descricao: "Redu\xE7\xE3o de 50% nas al\xEDquotas do IBS/CBS para opera\xE7\xF5es de hospedagem e loca\xE7\xE3o de curt\xEDssima temporada (short stay)."
  }
];
var PropertyService = class {
  constructor(repo3, clientRepo7) {
    this.repo = repo3;
    this.clientRepo = clientRepo7;
  }
  async create(data) {
    const client = await this.clientRepo.findById(data.client_id);
    if (!client) {
      throw new AppError("Cliente n\xE3o encontrado", "CLIENT_NOT_FOUND", 404);
    }
    return this.repo.create({
      client_id: data.client_id,
      tipo_locacao: data.tipo_locacao,
      identificador: data.identificador,
      modo_entrada: data.modo_entrada ?? "detalhado"
    });
  }
  async getById(id) {
    const prop = await this.repo.findByIdWithClient(id);
    if (!prop) {
      throw new AppError("Im\xF3vel n\xE3o encontrado", "PROPERTY_NOT_FOUND", 404);
    }
    return prop;
  }
  async update(id, data) {
    await this.getById(id);
    if (data.client_id) {
      const client = await this.clientRepo.findById(data.client_id);
      if (!client) {
        throw new AppError("Cliente n\xE3o encontrado", "CLIENT_NOT_FOUND", 404);
      }
    }
    return this.repo.update(id, {
      client_id: data.client_id,
      tipo_locacao: data.tipo_locacao,
      identificador: data.identificador,
      modo_entrada: data.modo_entrada
    });
  }
  async delete(id) {
    await this.getById(id);
    await this.repo.delete(id);
  }
  async list(options) {
    return this.repo.list(options);
  }
  // --- Transactions ---
  async addTransaction(propertyId, data) {
    await this.getById(propertyId);
    return this.repo.createTransaction({
      property_id: propertyId,
      mes_referencia: data.mes_referencia,
      tipo: data.tipo,
      categoria: data.categoria,
      valor: data.valor,
      observacao: data.observacao
    });
  }
  async addTransactionsBatch(propertyId, transactions) {
    await this.getById(propertyId);
    return this.repo.createTransactionsBatch(propertyId, transactions);
  }
  async deleteTransaction(propertyId, txId) {
    const tx = await this.repo.getTransactionById(txId);
    if (!tx || tx.property_id !== propertyId) {
      throw new AppError("Transa\xE7\xE3o n\xE3o encontrada", "TRANSACTION_NOT_FOUND", 404);
    }
    await this.repo.deleteTransaction(txId);
  }
  async upsertMonthlyTotals(input) {
    const propertyId = input.property_id;
    if (!propertyId) {
      throw new AppError("property_id \xE9 obrigat\xF3rio", "VALIDATION_ERROR", 400);
    }
    const prop = await this.repo.findById(propertyId);
    if (!prop) {
      throw new AppError("Im\xF3vel n\xE3o encontrado", "PROPERTY_NOT_FOUND", 404);
    }
    if (prop.modo_entrada !== "reduzido") {
      throw new AppError(
        "Este im\xF3vel usa modo detalhado. Use lan\xE7amentos individuais.",
        "INVALID_MODE",
        400
      );
    }
    await this.repo.upsertMonthlyTotals(propertyId, input.ano, input.meses);
  }
  async getMonthlyTotals(propertyId, ano) {
    await this.getById(propertyId);
    return this.repo.getMonthlyTotals(propertyId, ano);
  }
  async listTransactions(propertyId, options) {
    await this.getById(propertyId);
    return this.repo.listTransactions(propertyId, options);
  }
  // --- Simulation ---
  async simulate(input) {
    for (const pid of input.property_ids) {
      const prop = await this.repo.findById(pid);
      if (!prop) {
        throw new AppError(
          `Im\xF3vel n\xE3o encontrado: ${pid}`,
          "PROPERTY_NOT_FOUND",
          404
        );
      }
    }
    const aggregatedMap = await this.repo.aggregateByPropertiesYear(
      input.property_ids,
      input.ano
    );
    let receitaTotal = 0;
    let despesasDedutiveisTotal = 0;
    let custosOperacionaisTotal = 0;
    const mesesSoma = [];
    for (let m = 1; m <= 12; m++) {
      const mesStr = `${input.ano}-${String(m).padStart(2, "0")}`;
      let rec = 0;
      let desp = 0;
      let custo = 0;
      for (const [, entry] of aggregatedMap) {
        const mesData = entry.aggregated.meses.find((x) => x.mes === mesStr);
        if (mesData) {
          rec += mesData.receita;
          desp += mesData.despesas_dedutiveis;
          custo += mesData.custos_operacionais;
        }
      }
      mesesSoma.push({
        mes: mesStr,
        receita: rec,
        despesas_dedutiveis: desp,
        custos_operacionais: custo
      });
      receitaTotal += rec;
      despesasDedutiveisTotal += desp;
      custosOperacionaisTotal += custo;
    }
    const aggregatedTotal = {
      ano: input.ano,
      receita_total: receitaTotal,
      despesas_dedutiveis_total: despesasDedutiveisTotal,
      custos_operacionais_total: custosOperacionaisTotal,
      meses: mesesSoma
    };
    const cenarioPF = calcularPF(
      aggregatedTotal,
      input.aliquota_efetiva_dirpf
    );
    const cenarioPJ = calcularPJ(
      aggregatedTotal,
      input.aplicar_presuncao_16_servicos ?? false
    );
    const redutorLocacaoSimulate = input.opcoes_reforma?.perfil_locacao === "hospedagem_temporada" ? 50 : input.opcoes_reforma?.redutor_locacao_pct ?? 70;
    const opcoesReformaSimulate = {
      ano: input.ano,
      aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      redutor_locacao_pct: redutorLocacaoSimulate,
      contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025
    };
    const cenarioReforma = calcularReforma2027(
      aggregatedTotal,
      input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      redutorLocacaoSimulate,
      opcoesReformaSimulate
    );
    const impostoTotalPFReforma = Math.round((cenarioPF.imposto_total + cenarioReforma.ibs_cbs_liquido) * 100) / 100;
    const aliquotaEfetivaPFReforma = aggregatedTotal.receita_total > 0 ? Math.round(
      impostoTotalPFReforma / aggregatedTotal.receita_total * 100 * 100
    ) / 100 : 0;
    const cenarioReformaPF = {
      ...cenarioReforma,
      imposto_total: impostoTotalPFReforma,
      aliquota_efetiva: aliquotaEfetivaPFReforma,
      ir_pf: cenarioPF.imposto_total
    };
    const breakEvenVal = calcularBreakEven(
      cenarioPF.aliquota_efetiva_anual,
      cenarioPJ.aliquota_efetiva
    );
    const break_even = breakEvenVal ? {
      valor_mensal_break_even: breakEvenVal,
      descricao: `Ponto aproximado onde PJ se torna mais vantajosa (carga PJ ${cenarioPJ.aliquota_efetiva.toFixed(1)}% < PF ${cenarioPF.aliquota_efetiva_anual.toFixed(1)}%)`
    } : void 0;
    const fluxo_caixa = [];
    for (const [pid, entry] of aggregatedMap) {
      const agg = entry.aggregated;
      const pfForProp = calcularPF(agg);
      const pjForProp = calcularPJ(agg, input.aplicar_presuncao_16_servicos ?? false);
      fluxo_caixa.push({
        property_id: pid,
        identificador: entry.identificador,
        receita_total: agg.receita_total,
        despesas_total: agg.despesas_dedutiveis_total + agg.custos_operacionais_total,
        impostos_pf: pfForProp.imposto_total,
        impostos_pj: pjForProp.imposto_total,
        lucro_liquido_pf: agg.receita_total - agg.despesas_dedutiveis_total - agg.custos_operacionais_total - pfForProp.imposto_total,
        lucro_liquido_pj: agg.receita_total - agg.despesas_dedutiveis_total - agg.custos_operacionais_total - pjForProp.imposto_total
      });
    }
    return {
      ano: input.ano,
      cenarios: {
        pf: cenarioPF,
        pj: cenarioPJ,
        reforma_2027_pf: cenarioReformaPF,
        reforma_2027_pj: cenarioReforma,
        reforma_2027: cenarioReforma
      },
      break_even,
      fluxo_caixa,
      memoria_calculo: {
        ano: input.ano,
        modo: "imoveis",
        property_ids: input.property_ids,
        aliquota_efetiva_dirpf: input.aliquota_efetiva_dirpf,
        aplicar_presuncao_16_servicos: input.aplicar_presuncao_16_servicos,
        aliquota_ibs_cbs_reforma: cenarioReforma.aliquota_nominal_ibs_cbs,
        redutor_locacao_pct: redutorLocacaoSimulate,
        receita_total: aggregatedTotal.receita_total,
        despesas_dedutiveis_total: aggregatedTotal.despesas_dedutiveis_total,
        custos_operacionais_total: aggregatedTotal.custos_operacionais_total,
        detalhe_pf: {
          receita_bruta_total: cenarioPF.receita_bruta_total,
          despesas_dedutiveis_total: cenarioPF.despesas_dedutiveis_total,
          base_calculo_total: cenarioPF.base_calculo_total,
          imposto_total: cenarioPF.imposto_total,
          aliquota_efetiva_anual: cenarioPF.aliquota_efetiva_anual,
          trimestres: cenarioPF.trimestres
        },
        detalhe_pj: {
          receita_bruta_total: cenarioPJ.receita_bruta_total,
          presuncao_irpj_pct: input.aplicar_presuncao_16_servicos ?? false ? 16 : 32,
          presuncao_csll_pct: 32,
          base_presumida_irpj: cenarioPJ.base_presumida_irpj,
          base_presumida_csll: cenarioPJ.base_presumida_csll,
          irpj: cenarioPJ.irpj,
          irpj_adicional: cenarioPJ.irpj_adicional,
          irpj_postergado: cenarioPJ.irpj_postergado,
          csll: cenarioPJ.csll,
          pis: cenarioPJ.pis,
          cofins: cenarioPJ.cofins,
          imposto_total: cenarioPJ.imposto_total,
          aliquota_efetiva: cenarioPJ.aliquota_efetiva,
          aplicou_in_2306: cenarioPJ.aplicou_in_2306,
          trimestres: cenarioPJ.trimestres
        },
        detalhe_reforma: {
          aliquota_nominal_ibs_cbs: cenarioReforma.aliquota_nominal_ibs_cbs,
          redutor_locacao_pct: cenarioReforma.redutor_locacao_aplicado_pct,
          aliquota_efetiva: cenarioReformaPF.aliquota_efetiva,
          receita_bruta_total: cenarioReforma.receita_bruta_total,
          custos_operacionais_total: cenarioReforma.custos_operacionais_total,
          creditos_ibs_cbs: cenarioReforma.creditos_ibs_cbs,
          ibs_cbs_sobre_receita: cenarioReforma.ibs_cbs_sobre_receita,
          ibs_cbs_liquido: cenarioReforma.ibs_cbs_liquido,
          imposto_total: cenarioReformaPF.imposto_total,
          ir_pf: cenarioReformaPF.ir_pf
        }
      },
      embasamentos_legais: EMBASAMENTOS_LEGAIS
    };
  }
  /** Simulação standalone: dados diretos por mês, sem cadastro de imóveis */
  async simulateStandalone(input) {
    const mesesSoma = input.meses.map((m) => {
      const receita = (m.receita_aluguel_tradicional ?? 0) + (m.receita_aluguel_curto ?? 0) + (m.receita_garagem ?? 0) + (m.receita_outras ?? 0);
      const despesasDedutiveis = (m.iptu ?? 0) + (m.condominio ?? 0) + (m.seguro_imovel ?? 0) + (m.juros_financiamento ?? 0) + (m.manutencao_conservacao ?? 0) + (m.outras_dedutiveis ?? 0);
      const custosOperacionais = (m.reformas_melhorias ?? 0) + (m.mobilia_equipamentos ?? 0) + (m.limpeza_higienizacao ?? 0) + (m.comissao_corretagem ?? 0) + (m.taxa_plataforma ?? 0) + (m.outros_custos ?? 0);
      return {
        mes: m.mes_referencia,
        receita,
        despesas_dedutiveis: despesasDedutiveis,
        custos_operacionais: custosOperacionais
      };
    });
    const receitaTotal = mesesSoma.reduce((s, x) => s + x.receita, 0);
    const despesasDedutiveisTotal = mesesSoma.reduce(
      (s, x) => s + x.despesas_dedutiveis,
      0
    );
    const custosOperacionaisTotal = mesesSoma.reduce(
      (s, x) => s + x.custos_operacionais,
      0
    );
    const receitaLongaTotal = input.meses.reduce(
      (s, m) => s + (m.receita_aluguel_tradicional ?? 0),
      0
    );
    const receitaShortTotal = input.meses.reduce(
      (s, m) => s + (m.receita_aluguel_curto ?? 0),
      0
    );
    const aplicarPresuncao16 = receitaTotal < 12e4 && receitaShortTotal > receitaLongaTotal;
    const aggregatedTotal = {
      ano: input.ano,
      receita_total: receitaTotal,
      despesas_dedutiveis_total: despesasDedutiveisTotal,
      custos_operacionais_total: custosOperacionaisTotal,
      meses: mesesSoma
    };
    const cenarioPF = calcularPF(aggregatedTotal);
    const cenarioPJ = calcularPJ(aggregatedTotal, aplicarPresuncao16);
    const cenarioPJ32Fixo = aplicarPresuncao16 ? calcularPJ(aggregatedTotal, false) : null;
    const redutorLocacao = input.opcoes_reforma?.perfil_locacao === "hospedagem_temporada" ? 50 : input.opcoes_reforma?.redutor_locacao_pct ?? 70;
    const usarRedutorDiferenciado = input.opcoes_reforma?.perfil_locacao === "hospedagem_temporada" || receitaShortTotal > receitaLongaTotal;
    const opcoesReformaStandalone = {
      ano: input.ano,
      aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      redutor_locacao_pct: redutorLocacao,
      redutor_short_stay_pct: input.opcoes_reforma?.redutor_short_stay_pct,
      contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025,
      usar_redutor_diferenciado_short: usarRedutorDiferenciado,
      receita_longa_total: receitaLongaTotal,
      receita_short_total: receitaShortTotal
    };
    const cenarioReforma = calcularReforma2027(
      aggregatedTotal,
      input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      redutorLocacao,
      opcoesReformaStandalone
    );
    const impostoTotalPFReformaStandalone = Math.round((cenarioPF.imposto_total + cenarioReforma.ibs_cbs_liquido) * 100) / 100;
    const aliquotaEfetivaPFReformaStandalone = receitaTotal > 0 ? Math.round(
      impostoTotalPFReformaStandalone / receitaTotal * 100 * 100
    ) / 100 : 0;
    const cenarioReformaPFStandalone = {
      ...cenarioReforma,
      imposto_total: impostoTotalPFReformaStandalone,
      aliquota_efetiva: aliquotaEfetivaPFReformaStandalone,
      ir_pf: cenarioPF.imposto_total
    };
    const breakEvenVal = calcularBreakEven(
      cenarioPF.aliquota_efetiva_anual,
      cenarioPJ.aliquota_efetiva
    );
    const break_even = breakEvenVal ? {
      valor_mensal_break_even: breakEvenVal,
      descricao: `Ponto aproximado onde PJ se torna mais vantajosa (carga PJ ${cenarioPJ.aliquota_efetiva.toFixed(1)}% < PF ${cenarioPF.aliquota_efetiva_anual.toFixed(1)}%)`
    } : void 0;
    return {
      ano: input.ano,
      cenarios: {
        pf: cenarioPF,
        pj: cenarioPJ,
        reforma_2027_pf: cenarioReformaPFStandalone,
        reforma_2027_pj: cenarioReforma,
        reforma_2027: cenarioReforma
      },
      break_even,
      fluxo_caixa: [
        {
          property_id: "00000000-0000-0000-0000-000000000000",
          identificador: "Simula\xE7\xE3o",
          receita_total: receitaTotal,
          despesas_total: despesasDedutiveisTotal + custosOperacionaisTotal,
          impostos_pf: cenarioPF.imposto_total,
          impostos_pj: cenarioPJ.imposto_total,
          lucro_liquido_pf: receitaTotal - despesasDedutiveisTotal - custosOperacionaisTotal - cenarioPF.imposto_total,
          lucro_liquido_pj: receitaTotal - despesasDedutiveisTotal - custosOperacionaisTotal - cenarioPJ.imposto_total
        }
      ],
      memoria_calculo: {
        ano: input.ano,
        modo: "standalone",
        aplicar_presuncao_16_servicos: aplicarPresuncao16,
        aliquota_ibs_cbs_reforma: cenarioReforma.aliquota_nominal_ibs_cbs,
        redutor_locacao_pct: redutorLocacao,
        cenario_32_fixo_imposto: cenarioPJ32Fixo?.imposto_total,
        receita_total: receitaTotal,
        despesas_dedutiveis_total: despesasDedutiveisTotal,
        custos_operacionais_total: custosOperacionaisTotal,
        detalhe_pf: {
          receita_bruta_total: cenarioPF.receita_bruta_total,
          despesas_dedutiveis_total: cenarioPF.despesas_dedutiveis_total,
          base_calculo_total: cenarioPF.base_calculo_total,
          imposto_total: cenarioPF.imposto_total,
          aliquota_efetiva_anual: cenarioPF.aliquota_efetiva_anual,
          trimestres: cenarioPF.trimestres
        },
        detalhe_pj: {
          receita_bruta_total: cenarioPJ.receita_bruta_total,
          presuncao_irpj_pct: aplicarPresuncao16 ? 16 : 32,
          presuncao_csll_pct: 32,
          base_presumida_irpj: cenarioPJ.base_presumida_irpj,
          base_presumida_csll: cenarioPJ.base_presumida_csll,
          irpj: cenarioPJ.irpj,
          irpj_adicional: cenarioPJ.irpj_adicional,
          irpj_postergado: cenarioPJ.irpj_postergado,
          csll: cenarioPJ.csll,
          pis: cenarioPJ.pis,
          cofins: cenarioPJ.cofins,
          imposto_total: cenarioPJ.imposto_total,
          aliquota_efetiva: cenarioPJ.aliquota_efetiva,
          aplicou_in_2306: cenarioPJ.aplicou_in_2306,
          trimestres: cenarioPJ.trimestres
        },
        detalhe_reforma: {
          aliquota_nominal_ibs_cbs: cenarioReforma.aliquota_nominal_ibs_cbs,
          redutor_locacao_pct: cenarioReforma.redutor_locacao_aplicado_pct,
          aliquota_efetiva: cenarioReformaPFStandalone.aliquota_efetiva,
          receita_bruta_total: cenarioReforma.receita_bruta_total,
          custos_operacionais_total: cenarioReforma.custos_operacionais_total,
          creditos_ibs_cbs: cenarioReforma.creditos_ibs_cbs,
          ibs_cbs_sobre_receita: cenarioReforma.ibs_cbs_sobre_receita,
          ibs_cbs_liquido: cenarioReforma.ibs_cbs_liquido,
          imposto_total: cenarioReformaPFStandalone.imposto_total,
          ir_pf: cenarioReformaPFStandalone.ir_pf
        }
      },
      embasamentos_legais: EMBASAMENTOS_LEGAIS
    };
  }
};

// src/modules/properties/property.repository.ts
var PropertyRepository = class extends BaseRepository {
  async findById(id) {
    const result = await this.query(
      `SELECT id, client_id, tipo_locacao, identificador, COALESCE(modo_entrada, 'detalhado') as modo_entrada, created_at, updated_at
       FROM properties WHERE id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }
  async findByIdWithClient(id) {
    const result = await this.query(
      `SELECT p.id, p.client_id, p.tipo_locacao, p.identificador, COALESCE(p.modo_entrada, 'detalhado') as modo_entrada, p.created_at, p.updated_at,
              c.name as client_name
       FROM properties p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }
  async create(data) {
    const modo = data.modo_entrada ?? "detalhado";
    const result = await this.query(
      `INSERT INTO properties (client_id, tipo_locacao, identificador, modo_entrada)
       VALUES ($1, $2, $3, $4)
       RETURNING id, client_id, tipo_locacao, identificador, modo_entrada, created_at, updated_at`,
      [data.client_id, data.tipo_locacao, data.identificador, modo],
      false
    );
    return result.rows[0];
  }
  async update(id, data) {
    const updates = [];
    const params = [];
    let idx = 1;
    if (data.client_id !== void 0) {
      updates.push(`client_id = $${idx++}`);
      params.push(data.client_id);
    }
    if (data.tipo_locacao !== void 0) {
      updates.push(`tipo_locacao = $${idx++}`);
      params.push(data.tipo_locacao);
    }
    if (data.identificador !== void 0) {
      updates.push(`identificador = $${idx++}`);
      params.push(data.identificador);
    }
    if (data.modo_entrada !== void 0) {
      updates.push(`modo_entrada = $${idx++}`);
      params.push(data.modo_entrada);
    }
    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error("Property not found");
      return existing;
    }
    params.push(id);
    const result = await this.query(
      `UPDATE properties SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${idx} 
       RETURNING id, client_id, tipo_locacao, identificador, COALESCE(modo_entrada, 'detalhado') as modo_entrada, created_at, updated_at`,
      params,
      false
    );
    return result.rows[0];
  }
  async delete(id) {
    await this.query("DELETE FROM properties WHERE id = $1", [id], false);
  }
  async list(options) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    if (options.client_id) {
      conditions.push(`p.client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM properties p ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);
    params.push(limit, offset);
    const listResult = await this.query(
      `SELECT p.id, p.client_id, p.tipo_locacao, p.identificador, COALESCE(p.modo_entrada, 'detalhado') as modo_entrada, p.created_at, p.updated_at,
              c.name as client_name
       FROM properties p
       LEFT JOIN clients c ON c.id = p.client_id
       ${whereClause}
       ORDER BY p.identificador ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
      false
    );
    return { properties: listResult.rows, total };
  }
  // --- Transactions ---
  async createTransaction(data) {
    const result = await this.query(
      `INSERT INTO property_transactions (property_id, mes_referencia, tipo, categoria, valor, observacao)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, property_id, mes_referencia, tipo, categoria, valor, observacao, created_at, updated_at`,
      [
        data.property_id,
        data.mes_referencia,
        data.tipo,
        data.categoria,
        data.valor,
        data.observacao ?? null
      ],
      false
    );
    return result.rows[0];
  }
  async createTransactionsBatch(propertyId, transactions) {
    const results = [];
    for (const t of transactions) {
      const created = await this.createTransaction({
        property_id: propertyId,
        ...t
      });
      results.push(created);
    }
    return results;
  }
  async getTransactionById(txId) {
    const result = await this.query(
      `SELECT id, property_id, mes_referencia, tipo, categoria, valor, observacao, created_at, updated_at
       FROM property_transactions WHERE id = $1`,
      [txId],
      false
    );
    return result.rows[0] || null;
  }
  async deleteTransaction(txId) {
    await this.query(
      "DELETE FROM property_transactions WHERE id = $1",
      [txId],
      false
    );
  }
  async listTransactions(propertyId, options) {
    const params = [propertyId];
    const conditions = ["property_id = $1"];
    if (options?.ano) {
      conditions.push(`mes_referencia LIKE $${params.length + 1}`);
      params.push(`${options.ano}-%`);
    }
    if (options?.mes) {
      conditions.push(`mes_referencia = $${params.length + 1}`);
      params.push(options.mes);
    }
    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const result = await this.query(
      `SELECT id, property_id, mes_referencia, tipo, categoria, valor, observacao, created_at, updated_at
       FROM property_transactions ${whereClause}
       ORDER BY mes_referencia ASC`,
      params,
      false
    );
    return result.rows;
  }
  // --- Modo Reduzido: Totais Mensais ---
  async upsertMonthlyTotals(propertyId, _ano, meses) {
    for (const m of meses) {
      await this.query(
        `INSERT INTO property_monthly_totals (property_id, mes_referencia, receita_longa, receita_short, despesas_dedutiveis, custos_operacionais)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (property_id, mes_referencia)
         DO UPDATE SET receita_longa = $3, receita_short = $4, despesas_dedutiveis = $5, custos_operacionais = $6, updated_at = NOW()`,
        [
          propertyId,
          m.mes_referencia,
          m.receita_longa,
          m.receita_short,
          m.despesas_dedutiveis,
          m.custos_operacionais
        ],
        false
      );
    }
  }
  async getMonthlyTotals(propertyId, ano) {
    const result = await this.query(
      `SELECT mes_referencia, receita_longa, receita_short, despesas_dedutiveis, custos_operacionais
       FROM property_monthly_totals
       WHERE property_id = $1 AND mes_referencia LIKE $2
       ORDER BY mes_referencia`,
      [propertyId, `${ano}-%`],
      false
    );
    return result.rows.map((r) => ({
      mes_referencia: r.mes_referencia,
      receita_longa: parseFloat(r.receita_longa) || 0,
      receita_short: parseFloat(r.receita_short) || 0,
      despesas_dedutiveis: parseFloat(r.despesas_dedutiveis) || 0,
      custos_operacionais: parseFloat(r.custos_operacionais) || 0
    }));
  }
  /**
   * Agrega transações ou totais mensais por propriedade e ano para os cálculos tributários.
   * Retorna receita, despesas_dedutiveis e custos_operacionais por mês (Jan-Dec).
   */
  async aggregateByPropertiesYear(propertyIds, ano) {
    const map = /* @__PURE__ */ new Map();
    if (propertyIds.length === 0) return map;
    const props = await Promise.all(
      propertyIds.map((id) => this.findByIdWithClient(id))
    );
    for (let i = 0; i < propertyIds.length; i++) {
      const prop = props[i];
      const pid = propertyIds[i];
      if (!prop) continue;
      const modoEntrada = prop.modo_entrada ?? "detalhado";
      if (modoEntrada === "reduzido") {
        const totals = await this.getMonthlyTotals(pid, ano);
        const mesesData2 = {};
        for (let m = 1; m <= 12; m++) {
          const mesStr = `${ano}-${String(m).padStart(2, "0")}`;
          mesesData2[mesStr] = {
            receita: 0,
            despesas_dedutiveis: 0,
            custos_operacionais: 0
          };
        }
        for (const t of totals) {
          const d = mesesData2[t.mes_referencia];
          if (d) {
            d.receita = t.receita_longa + t.receita_short;
            d.despesas_dedutiveis = t.despesas_dedutiveis;
            d.custos_operacionais = t.custos_operacionais;
          }
        }
        const meses2 = [];
        for (let m = 1; m <= 12; m++) {
          const mesStr = `${ano}-${String(m).padStart(2, "0")}`;
          const d = mesesData2[mesStr];
          meses2.push({
            mes: mesStr,
            receita: d.receita,
            despesas_dedutiveis: d.despesas_dedutiveis,
            custos_operacionais: d.custos_operacionais
          });
        }
        const receita_total2 = meses2.reduce((s, x) => s + x.receita, 0);
        const despesas_dedutiveis_total2 = meses2.reduce((s, x) => s + x.despesas_dedutiveis, 0);
        const custos_operacionais_total2 = meses2.reduce((s, x) => s + x.custos_operacionais, 0);
        map.set(pid, {
          property_id: pid,
          identificador: prop.identificador,
          aggregated: {
            ano,
            receita_total: receita_total2,
            despesas_dedutiveis_total: despesas_dedutiveis_total2,
            custos_operacionais_total: custos_operacionais_total2,
            meses: meses2
          }
        });
        continue;
      }
      const result = await this.query(
        `SELECT p.id as property_id, p.identificador,
                pt.mes_referencia, pt.tipo,
                SUM(pt.valor) as total_valor
         FROM properties p
         JOIN property_transactions pt ON pt.property_id = p.id
         WHERE p.id = $1 AND pt.mes_referencia LIKE $2
         GROUP BY p.id, p.identificador, pt.mes_referencia, pt.tipo`,
        [pid, `${ano}-%`],
        false
      );
      const rows = result.rows;
      const identificador = prop.identificador;
      const mesesData = {};
      for (let m = 1; m <= 12; m++) {
        const mesStr = `${ano}-${String(m).padStart(2, "0")}`;
        mesesData[mesStr] = {
          receita: 0,
          despesas_dedutiveis: 0,
          custos_operacionais: 0
        };
      }
      for (const row of rows) {
        const mes = row.mes_referencia;
        if (!mesesData[mes]) {
          mesesData[mes] = {
            receita: 0,
            despesas_dedutiveis: 0,
            custos_operacionais: 0
          };
        }
        const val = Number(row.total_valor);
        if (row.tipo === "receita") mesesData[mes].receita += val;
        else if (row.tipo === "despesa_dedutivel")
          mesesData[mes].despesas_dedutiveis += val;
        else if (row.tipo === "custo_operacional")
          mesesData[mes].custos_operacionais += val;
      }
      const meses = [];
      for (let m = 1; m <= 12; m++) {
        const mesStr = `${ano}-${String(m).padStart(2, "0")}`;
        const d = mesesData[mesStr] ?? {
          receita: 0,
          despesas_dedutiveis: 0,
          custos_operacionais: 0
        };
        meses.push({
          mes: mesStr,
          receita: d.receita,
          despesas_dedutiveis: d.despesas_dedutiveis,
          custos_operacionais: d.custos_operacionais
        });
      }
      const receita_total = meses.reduce((s, x) => s + x.receita, 0);
      const despesas_dedutiveis_total = meses.reduce(
        (s, x) => s + x.despesas_dedutiveis,
        0
      );
      const custos_operacionais_total = meses.reduce(
        (s, x) => s + x.custos_operacionais,
        0
      );
      map.set(pid, {
        property_id: pid,
        identificador,
        aggregated: {
          ano,
          receita_total,
          despesas_dedutiveis_total,
          custos_operacionais_total,
          meses
        }
      });
    }
    return map;
  }
};

// src/modules/properties/property.routes.ts
var propertyRoutes = new Hono2();
propertyRoutes.use("*", async (c, next) => {
  fetch("http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hypothesisId: "H2", location: "property.routes.ts:entry", message: "Property routes received request", data: { path: c.req.path, method: c.req.method, url: c.req.url }, timestamp: Date.now() }) }).catch(() => {
  });
  await next();
});
propertyRoutes.use("/*", tenantMiddleware);
propertyRoutes.use("/*", authMiddleware);
propertyRoutes.use("/*", requireModule("GESTAO_IMOVEIS"));
var propertyRepo = new PropertyRepository();
var clientRepo6 = new ClientRepository();
var propertyService = new PropertyService(propertyRepo, clientRepo6);
propertyRoutes.post(
  "/simulate",
  zValidator("json", SimulatePropertyTaxInputSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const result = await propertyService.simulate(input);
      const data = PropertyTaxSimulationResponseSchema.parse(result);
      return c.json({ data }, 200);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.post(
  "/simulate-standalone",
  zValidator("json", SimulateStandaloneInputSchema),
  async (c) => {
    fetch("http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hypothesisId: "H2", location: "property.routes.ts:simulate-standalone-handler", message: "POST /simulate-standalone handler entered", data: { path: c.req.path, method: c.req.method }, timestamp: Date.now() }) }).catch(() => {
    });
    try {
      const input = c.req.valid("json");
      const result = await propertyService.simulateStandalone(input);
      const data = PropertyTaxSimulationResponseSchema.parse(result);
      return c.json({ data }, 200);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.get(
  "/",
  zValidator("query", ListPropertiesQuerySchema),
  async (c) => {
    try {
      const query2 = c.req.valid("query");
      const result = await propertyService.list({
        client_id: query2.client_id,
        page: query2.page,
        limit: query2.limit
      });
      return c.json({
        data: {
          properties: result.properties,
          total: result.total,
          page: query2.page,
          limit: query2.limit
        }
      });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.get(
  "/:id",
  zValidator("param", PropertyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const property = await propertyService.getById(id);
      return c.json({ data: { property } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.post(
  "/",
  zValidator("json", CreatePropertySchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const property = await propertyService.create(data);
      return c.json({ data: { property } }, 201);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.patch(
  "/:id",
  zValidator("param", PropertyIdParamSchema),
  zValidator("json", UpdatePropertySchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const property = await propertyService.update(id, data);
      return c.json({ data: { property } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.delete(
  "/:id",
  zValidator("param", PropertyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      await propertyService.delete(id);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.put(
  "/:id/monthly-totals",
  zValidator("param", PropertyIdParamSchema),
  zValidator("json", UpsertMonthlyTotalsSchema.omit({ property_id: true })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      await propertyService.upsertMonthlyTotals({ ...body, property_id: id });
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.get(
  "/:id/monthly-totals",
  zValidator("param", PropertyIdParamSchema),
  zValidator("query", external_exports.object({ ano: external_exports.coerce.number().int() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { ano } = c.req.valid("query");
      const totals = await propertyService.getMonthlyTotals(id, ano);
      return c.json({ data: { totals } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.get(
  "/:id/transactions",
  zValidator("param", PropertyIdParamSchema),
  zValidator("query", ListTransactionsQuerySchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const query2 = c.req.valid("query");
      const transactions = await propertyService.listTransactions(id, {
        ano: query2.ano,
        mes: query2.mes
      });
      return c.json({ data: { transactions } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.post(
  "/:id/transactions",
  zValidator("param", PropertyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = await c.req.json();
      if (Array.isArray(body)) {
        const validated = body.map(
          (item) => PropertyTransactionSchema.parse(item)
        );
        const transactions = await propertyService.addTransactionsBatch(
          id,
          validated
        );
        return c.json({ data: { transactions } }, 201);
      }
      const data = PropertyTransactionSchema.parse(body);
      const transaction = await propertyService.addTransaction(id, data);
      return c.json({ data: { transaction } }, 201);
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);
propertyRoutes.delete(
  "/:id/transactions/:txId",
  zValidator("param", TransactionIdParamSchema),
  async (c) => {
    try {
      const { id, txId } = c.req.valid("param");
      await propertyService.deleteTransaction(id, txId);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler2(err, c);
    }
  }
);

// src/modules/debug/debug.routes.ts
var debugRoutes = new Hono2();
debugRoutes.get("/cors", (c) => {
  const corsOriginRaw = process.env.CORS_ORIGIN ?? "";
  const corsDomainsRaw = process.env.CORS_ORIGIN_DOMAINS ?? "";
  const corsOrigins = corsOriginRaw ? corsOriginRaw.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean) : [];
  const corsDomains = corsDomainsRaw ? corsDomainsRaw.split(",").map((d) => d.trim().toLowerCase().replace(/^\./, "")).filter(Boolean) : [];
  const testOrigin = c.req.query("origin") ?? "https://iataxsistemas.com.br";
  const normalized = testOrigin.replace(/\/+$/, "");
  let wouldAllow = false;
  if (corsOrigins.length === 0 && corsDomains.length === 0) {
    wouldAllow = true;
  } else if (corsOrigins.includes(normalized)) {
    wouldAllow = true;
  } else {
    const originHost = normalized.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    const originBase = originHost.replace(/^www\./, "");
    for (const allowed of corsOrigins) {
      const allowedBase = allowed.replace(/^https?:\/\//, "").split("/")[0].toLowerCase().replace(/^www\./, "");
      if (originBase === allowedBase) {
        wouldAllow = true;
        break;
      }
    }
    if (!wouldAllow) {
      for (const domain of corsDomains) {
        if (originBase === domain || originBase.endsWith("." + domain)) {
          wouldAllow = true;
          break;
        }
      }
    }
  }
  return c.json({
    corsOrigin: {
      configured: corsOriginRaw.length > 0,
      rawLength: corsOriginRaw.length,
      originsCount: corsOrigins.length,
      firstChars: corsOriginRaw ? corsOriginRaw.substring(0, 50) + (corsOriginRaw.length > 50 ? "..." : "") : "(vazio)"
    },
    corsOriginDomains: {
      configured: corsDomainsRaw.length > 0,
      domainsCount: corsDomains.length,
      values: corsDomains
    },
    testOrigin,
    wouldAllow,
    nodeEnv: process.env.NODE_ENV
  });
});
debugRoutes.get("/modules-db", async (c) => {
  try {
    const [modulesRes, companiesRes, tenantModulesRes, simuladorRes] = await Promise.all([
      query(
        "SELECT id, name, key, description FROM modules ORDER BY name"
      ),
      query(
        "SELECT id, name, domain FROM companies ORDER BY name"
      ),
      query(
        `SELECT tm.tenant_id, tm.module_id, tm.enabled_until, m.key AS module_key, m.name AS module_name
         FROM tenant_modules tm
         JOIN modules m ON m.id = tm.module_id
         ORDER BY tm.tenant_id, m.key`
      ),
      query(
        `SELECT tm.tenant_id, c.name AS company_name, tm.enabled_until
         FROM tenant_modules tm
         JOIN modules m ON m.id = tm.module_id
         LEFT JOIN companies c ON c.id = tm.tenant_id
         WHERE m.key = 'SIMULADOR_IN_2306'
         ORDER BY tm.tenant_id`
      )
    ]);
    return c.json({
      modules: modulesRes.rows,
      companies: companiesRes.rows,
      tenant_modules: tenantModulesRes.rows,
      simulador_in_2306_active_for: simuladorRes.rows,
      now: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : String(e) },
      500
    );
  }
});

// src/modules/index.ts
var app = new Hono2();
function getCorsConfig() {
  const raw2 = process.env.CORS_ORIGIN ?? "";
  const domainsRaw = process.env.CORS_ORIGIN_DOMAINS ?? "";
  const origins = raw2 ? raw2.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean) : [];
  const domains = domainsRaw ? domainsRaw.split(",").map((d) => d.trim().toLowerCase().replace(/^\./, "")).filter(Boolean) : [];
  return { origins, domains };
}
function isOriginAllowed(origin, origins, domains) {
  if (!origin) return null;
  const normalized = origin.replace(/\/+$/, "");
  if (origins.length === 0 && domains.length === 0) return origin;
  if (origins.includes(normalized)) return origin;
  const originHost = normalized.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
  const originBase = originHost.replace(/^www\./, "");
  for (const allowed of origins) {
    const allowedBase = allowed.replace(/^https?:\/\//, "").split("/")[0].toLowerCase().replace(/^www\./, "");
    if (originBase === allowedBase) return origin;
  }
  for (const domain of domains) {
    if (originBase === domain || originBase.endsWith("." + domain)) return origin;
  }
  return null;
}
app.use("/*", cors({
  origin: (origin) => {
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin ?? "")) return origin ?? "*";
    const { origins, domains } = getCorsConfig();
    return isOriginAllowed(origin ?? void 0, origins, domains) ?? null;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
  credentials: true,
  maxAge: 86400
}));
app.onError((error, c) => {
  return errorHandler2(error, c);
});
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/users", userRoutes);
app.route("/api/v1/companies", companyRoutes);
app.route("/api/v1/clients", clientRoutes);
app.route("/api/v1/plans", planRoutes);
app.route("/api/v1/modules", featureToggleRoutes);
app.route("/api/v1/subscriptions", subscriptionRoutes);
app.route("/api/v1/webhooks", billingWebhookRoutes);
app.route("/api/v1/billing", billingApiRoutes);
app.route("/api/v1/fiscal-files", fiscalFileRoutes);
app.route("/api/v1/system", systemRoutes);
app.route("/api/v1/rating-validator", ratingValidatorRoutes);
app.route("/api/v1/editais", editalRoutes);
app.route("/api/v1/judicial-processes", judicialProcessRoutes);
app.route("/api/v1/simulador-in-2306", simuladorIN2306Routes);
app.route("/api/v1/irpf-alta-renda", irpfAltaRendaRoutes);
app.route("/api/v1/properties", propertyRoutes);
app.route("/api/v1/debug", debugRoutes);
app.get("/health", (c) => c.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
app.get("/", (c) => c.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: "Route not found",
        code: "NOT_FOUND",
        path: c.req.path,
        url: c.req.url,
        method: c.req.method
      }
    },
    404
  );
});
var modules_default = app;

// api/index.ts
if (!process.env.DATABASE_URL) {
  (0, import_dotenv2.config)({ path: import_path3.default.resolve(process.cwd(), "../../.env") });
}
var index_default = handle(modules_default);
