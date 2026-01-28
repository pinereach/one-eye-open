var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-r9fija/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/pages-Diisby/functionsWorker-0.7604161206261271.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __export = /* @__PURE__ */ __name((target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
}, "__export");
var urls2 = /* @__PURE__ */ new Set();
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
__name2(checkURL2, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL2(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});
var external_exports = {};
__export(external_exports, {
  BRAND: /* @__PURE__ */ __name(() => BRAND, "BRAND"),
  DIRTY: /* @__PURE__ */ __name(() => DIRTY, "DIRTY"),
  EMPTY_PATH: /* @__PURE__ */ __name(() => EMPTY_PATH, "EMPTY_PATH"),
  INVALID: /* @__PURE__ */ __name(() => INVALID, "INVALID"),
  NEVER: /* @__PURE__ */ __name(() => NEVER, "NEVER"),
  OK: /* @__PURE__ */ __name(() => OK, "OK"),
  ParseStatus: /* @__PURE__ */ __name(() => ParseStatus, "ParseStatus"),
  Schema: /* @__PURE__ */ __name(() => ZodType, "Schema"),
  ZodAny: /* @__PURE__ */ __name(() => ZodAny, "ZodAny"),
  ZodArray: /* @__PURE__ */ __name(() => ZodArray, "ZodArray"),
  ZodBigInt: /* @__PURE__ */ __name(() => ZodBigInt, "ZodBigInt"),
  ZodBoolean: /* @__PURE__ */ __name(() => ZodBoolean, "ZodBoolean"),
  ZodBranded: /* @__PURE__ */ __name(() => ZodBranded, "ZodBranded"),
  ZodCatch: /* @__PURE__ */ __name(() => ZodCatch, "ZodCatch"),
  ZodDate: /* @__PURE__ */ __name(() => ZodDate, "ZodDate"),
  ZodDefault: /* @__PURE__ */ __name(() => ZodDefault, "ZodDefault"),
  ZodDiscriminatedUnion: /* @__PURE__ */ __name(() => ZodDiscriminatedUnion, "ZodDiscriminatedUnion"),
  ZodEffects: /* @__PURE__ */ __name(() => ZodEffects, "ZodEffects"),
  ZodEnum: /* @__PURE__ */ __name(() => ZodEnum, "ZodEnum"),
  ZodError: /* @__PURE__ */ __name(() => ZodError, "ZodError"),
  ZodFirstPartyTypeKind: /* @__PURE__ */ __name(() => ZodFirstPartyTypeKind, "ZodFirstPartyTypeKind"),
  ZodFunction: /* @__PURE__ */ __name(() => ZodFunction, "ZodFunction"),
  ZodIntersection: /* @__PURE__ */ __name(() => ZodIntersection, "ZodIntersection"),
  ZodIssueCode: /* @__PURE__ */ __name(() => ZodIssueCode, "ZodIssueCode"),
  ZodLazy: /* @__PURE__ */ __name(() => ZodLazy, "ZodLazy"),
  ZodLiteral: /* @__PURE__ */ __name(() => ZodLiteral, "ZodLiteral"),
  ZodMap: /* @__PURE__ */ __name(() => ZodMap, "ZodMap"),
  ZodNaN: /* @__PURE__ */ __name(() => ZodNaN, "ZodNaN"),
  ZodNativeEnum: /* @__PURE__ */ __name(() => ZodNativeEnum, "ZodNativeEnum"),
  ZodNever: /* @__PURE__ */ __name(() => ZodNever, "ZodNever"),
  ZodNull: /* @__PURE__ */ __name(() => ZodNull, "ZodNull"),
  ZodNullable: /* @__PURE__ */ __name(() => ZodNullable, "ZodNullable"),
  ZodNumber: /* @__PURE__ */ __name(() => ZodNumber, "ZodNumber"),
  ZodObject: /* @__PURE__ */ __name(() => ZodObject, "ZodObject"),
  ZodOptional: /* @__PURE__ */ __name(() => ZodOptional, "ZodOptional"),
  ZodParsedType: /* @__PURE__ */ __name(() => ZodParsedType, "ZodParsedType"),
  ZodPipeline: /* @__PURE__ */ __name(() => ZodPipeline, "ZodPipeline"),
  ZodPromise: /* @__PURE__ */ __name(() => ZodPromise, "ZodPromise"),
  ZodReadonly: /* @__PURE__ */ __name(() => ZodReadonly, "ZodReadonly"),
  ZodRecord: /* @__PURE__ */ __name(() => ZodRecord, "ZodRecord"),
  ZodSchema: /* @__PURE__ */ __name(() => ZodType, "ZodSchema"),
  ZodSet: /* @__PURE__ */ __name(() => ZodSet, "ZodSet"),
  ZodString: /* @__PURE__ */ __name(() => ZodString, "ZodString"),
  ZodSymbol: /* @__PURE__ */ __name(() => ZodSymbol, "ZodSymbol"),
  ZodTransformer: /* @__PURE__ */ __name(() => ZodEffects, "ZodTransformer"),
  ZodTuple: /* @__PURE__ */ __name(() => ZodTuple, "ZodTuple"),
  ZodType: /* @__PURE__ */ __name(() => ZodType, "ZodType"),
  ZodUndefined: /* @__PURE__ */ __name(() => ZodUndefined, "ZodUndefined"),
  ZodUnion: /* @__PURE__ */ __name(() => ZodUnion, "ZodUnion"),
  ZodUnknown: /* @__PURE__ */ __name(() => ZodUnknown, "ZodUnknown"),
  ZodVoid: /* @__PURE__ */ __name(() => ZodVoid, "ZodVoid"),
  addIssueToContext: /* @__PURE__ */ __name(() => addIssueToContext, "addIssueToContext"),
  any: /* @__PURE__ */ __name(() => anyType, "any"),
  array: /* @__PURE__ */ __name(() => arrayType, "array"),
  bigint: /* @__PURE__ */ __name(() => bigIntType, "bigint"),
  boolean: /* @__PURE__ */ __name(() => booleanType, "boolean"),
  coerce: /* @__PURE__ */ __name(() => coerce, "coerce"),
  custom: /* @__PURE__ */ __name(() => custom, "custom"),
  date: /* @__PURE__ */ __name(() => dateType, "date"),
  datetimeRegex: /* @__PURE__ */ __name(() => datetimeRegex, "datetimeRegex"),
  defaultErrorMap: /* @__PURE__ */ __name(() => en_default, "defaultErrorMap"),
  discriminatedUnion: /* @__PURE__ */ __name(() => discriminatedUnionType, "discriminatedUnion"),
  effect: /* @__PURE__ */ __name(() => effectsType, "effect"),
  enum: /* @__PURE__ */ __name(() => enumType, "enum"),
  function: /* @__PURE__ */ __name(() => functionType, "function"),
  getErrorMap: /* @__PURE__ */ __name(() => getErrorMap, "getErrorMap"),
  getParsedType: /* @__PURE__ */ __name(() => getParsedType, "getParsedType"),
  instanceof: /* @__PURE__ */ __name(() => instanceOfType, "instanceof"),
  intersection: /* @__PURE__ */ __name(() => intersectionType, "intersection"),
  isAborted: /* @__PURE__ */ __name(() => isAborted, "isAborted"),
  isAsync: /* @__PURE__ */ __name(() => isAsync, "isAsync"),
  isDirty: /* @__PURE__ */ __name(() => isDirty, "isDirty"),
  isValid: /* @__PURE__ */ __name(() => isValid, "isValid"),
  late: /* @__PURE__ */ __name(() => late, "late"),
  lazy: /* @__PURE__ */ __name(() => lazyType, "lazy"),
  literal: /* @__PURE__ */ __name(() => literalType, "literal"),
  makeIssue: /* @__PURE__ */ __name(() => makeIssue, "makeIssue"),
  map: /* @__PURE__ */ __name(() => mapType, "map"),
  nan: /* @__PURE__ */ __name(() => nanType, "nan"),
  nativeEnum: /* @__PURE__ */ __name(() => nativeEnumType, "nativeEnum"),
  never: /* @__PURE__ */ __name(() => neverType, "never"),
  null: /* @__PURE__ */ __name(() => nullType, "null"),
  nullable: /* @__PURE__ */ __name(() => nullableType, "nullable"),
  number: /* @__PURE__ */ __name(() => numberType, "number"),
  object: /* @__PURE__ */ __name(() => objectType, "object"),
  objectUtil: /* @__PURE__ */ __name(() => objectUtil, "objectUtil"),
  oboolean: /* @__PURE__ */ __name(() => oboolean, "oboolean"),
  onumber: /* @__PURE__ */ __name(() => onumber, "onumber"),
  optional: /* @__PURE__ */ __name(() => optionalType, "optional"),
  ostring: /* @__PURE__ */ __name(() => ostring, "ostring"),
  pipeline: /* @__PURE__ */ __name(() => pipelineType, "pipeline"),
  preprocess: /* @__PURE__ */ __name(() => preprocessType, "preprocess"),
  promise: /* @__PURE__ */ __name(() => promiseType, "promise"),
  quotelessJson: /* @__PURE__ */ __name(() => quotelessJson, "quotelessJson"),
  record: /* @__PURE__ */ __name(() => recordType, "record"),
  set: /* @__PURE__ */ __name(() => setType, "set"),
  setErrorMap: /* @__PURE__ */ __name(() => setErrorMap, "setErrorMap"),
  strictObject: /* @__PURE__ */ __name(() => strictObjectType, "strictObject"),
  string: /* @__PURE__ */ __name(() => stringType, "string"),
  symbol: /* @__PURE__ */ __name(() => symbolType, "symbol"),
  transformer: /* @__PURE__ */ __name(() => effectsType, "transformer"),
  tuple: /* @__PURE__ */ __name(() => tupleType, "tuple"),
  undefined: /* @__PURE__ */ __name(() => undefinedType, "undefined"),
  union: /* @__PURE__ */ __name(() => unionType, "union"),
  unknown: /* @__PURE__ */ __name(() => unknownType, "unknown"),
  util: /* @__PURE__ */ __name(() => util, "util"),
  void: /* @__PURE__ */ __name(() => voidType, "void")
});
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  __name(assertIs, "assertIs");
  __name2(assertIs, "assertIs");
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  __name(assertNever, "assertNever");
  __name2(assertNever, "assertNever");
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
  __name(joinValues, "joinValues");
  __name2(joinValues, "joinValues");
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
var getParsedType = /* @__PURE__ */ __name2((data) => {
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
}, "getParsedType");
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
var quotelessJson = /* @__PURE__ */ __name2((obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, "quotelessJson");
var ZodError = class _ZodError extends Error {
  static {
    __name(this, "_ZodError");
  }
  static {
    __name2(this, "ZodError");
  }
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
    const processError = /* @__PURE__ */ __name2((error) => {
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
    }, "processError");
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
var errorMap = /* @__PURE__ */ __name2((issue, _ctx) => {
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
}, "errorMap");
var en_default = errorMap;
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
__name2(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");
__name2(getErrorMap, "getErrorMap");
var makeIssue = /* @__PURE__ */ __name2((params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
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
}, "makeIssue");
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
__name(addIssueToContext, "addIssueToContext");
__name2(addIssueToContext, "addIssueToContext");
var ParseStatus = class _ParseStatus {
  static {
    __name(this, "_ParseStatus");
  }
  static {
    __name2(this, "ParseStatus");
  }
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
var DIRTY = /* @__PURE__ */ __name2((value) => ({ status: "dirty", value }), "DIRTY");
var OK = /* @__PURE__ */ __name2((value) => ({ status: "valid", value }), "OK");
var isAborted = /* @__PURE__ */ __name2((x) => x.status === "aborted", "isAborted");
var isDirty = /* @__PURE__ */ __name2((x) => x.status === "dirty", "isDirty");
var isValid = /* @__PURE__ */ __name2((x) => x.status === "valid", "isValid");
var isAsync = /* @__PURE__ */ __name2((x) => typeof Promise !== "undefined" && x instanceof Promise, "isAsync");
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));
var ParseInputLazyPath = class {
  static {
    __name(this, "ParseInputLazyPath");
  }
  static {
    __name2(this, "ParseInputLazyPath");
  }
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
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
var handleResult = /* @__PURE__ */ __name2((ctx, result) => {
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
}, "handleResult");
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = /* @__PURE__ */ __name2((iss, ctx) => {
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
  }, "customMap");
  return { errorMap: customMap, description };
}
__name(processCreateParams, "processCreateParams");
__name2(processCreateParams, "processCreateParams");
var ZodType = class {
  static {
    __name(this, "ZodType");
  }
  static {
    __name2(this, "ZodType");
  }
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
    const getIssueProperties = /* @__PURE__ */ __name2((val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    }, "getIssueProperties");
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = /* @__PURE__ */ __name2(() => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      }), "setError");
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
      validate: /* @__PURE__ */ __name2((data) => this["~validate"](data), "validate")
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
__name(timeRegexSource, "timeRegexSource");
__name2(timeRegexSource, "timeRegexSource");
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
__name(timeRegex, "timeRegex");
__name2(timeRegex, "timeRegex");
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
__name(datetimeRegex, "datetimeRegex");
__name2(datetimeRegex, "datetimeRegex");
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidIP, "isValidIP");
__name2(isValidIP, "isValidIP");
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
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
__name(isValidJWT, "isValidJWT");
__name2(isValidJWT, "isValidJWT");
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidCidr, "isValidCidr");
__name2(isValidCidr, "isValidCidr");
var ZodString = class _ZodString extends ZodType {
  static {
    __name(this, "_ZodString");
  }
  static {
    __name2(this, "ZodString");
  }
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
__name(floatSafeRemainder, "floatSafeRemainder");
__name2(floatSafeRemainder, "floatSafeRemainder");
var ZodNumber = class _ZodNumber extends ZodType {
  static {
    __name(this, "_ZodNumber");
  }
  static {
    __name2(this, "ZodNumber");
  }
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
  static {
    __name(this, "_ZodBigInt");
  }
  static {
    __name2(this, "ZodBigInt");
  }
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
  static {
    __name(this, "ZodBoolean");
  }
  static {
    __name2(this, "ZodBoolean");
  }
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
  static {
    __name(this, "_ZodDate");
  }
  static {
    __name2(this, "ZodDate");
  }
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
  static {
    __name(this, "ZodSymbol");
  }
  static {
    __name2(this, "ZodSymbol");
  }
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
  static {
    __name(this, "ZodUndefined");
  }
  static {
    __name2(this, "ZodUndefined");
  }
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
  static {
    __name(this, "ZodNull");
  }
  static {
    __name2(this, "ZodNull");
  }
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
  static {
    __name(this, "ZodAny");
  }
  static {
    __name2(this, "ZodAny");
  }
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
  static {
    __name(this, "ZodUnknown");
  }
  static {
    __name2(this, "ZodUnknown");
  }
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
  static {
    __name(this, "ZodNever");
  }
  static {
    __name2(this, "ZodNever");
  }
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
  static {
    __name(this, "ZodVoid");
  }
  static {
    __name2(this, "ZodVoid");
  }
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
  static {
    __name(this, "_ZodArray");
  }
  static {
    __name2(this, "ZodArray");
  }
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
      shape: /* @__PURE__ */ __name2(() => newShape, "shape")
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
__name(deepPartialify, "deepPartialify");
__name2(deepPartialify, "deepPartialify");
var ZodObject = class _ZodObject extends ZodType {
  static {
    __name(this, "_ZodObject");
  }
  static {
    __name2(this, "ZodObject");
  }
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
        errorMap: /* @__PURE__ */ __name2((issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }, "errorMap")
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
      shape: /* @__PURE__ */ __name2(() => ({
        ...this._def.shape(),
        ...augmentation
      }), "shape")
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
      shape: /* @__PURE__ */ __name2(() => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }), "shape"),
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
      shape: /* @__PURE__ */ __name2(() => shape, "shape")
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
      shape: /* @__PURE__ */ __name2(() => shape, "shape")
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
      shape: /* @__PURE__ */ __name2(() => newShape, "shape")
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
      shape: /* @__PURE__ */ __name2(() => newShape, "shape")
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name2(() => shape, "shape"),
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name2(() => shape, "shape"),
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
  static {
    __name(this, "ZodUnion");
  }
  static {
    __name2(this, "ZodUnion");
  }
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
    __name(handleResults, "handleResults");
    __name2(handleResults, "handleResults");
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
var getDiscriminator = /* @__PURE__ */ __name2((type) => {
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
}, "getDiscriminator");
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  static {
    __name(this, "_ZodDiscriminatedUnion");
  }
  static {
    __name2(this, "ZodDiscriminatedUnion");
  }
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
__name(mergeValues, "mergeValues");
__name2(mergeValues, "mergeValues");
var ZodIntersection = class extends ZodType {
  static {
    __name(this, "ZodIntersection");
  }
  static {
    __name2(this, "ZodIntersection");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = /* @__PURE__ */ __name2((parsedLeft, parsedRight) => {
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
    }, "handleParsed");
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
  static {
    __name(this, "_ZodTuple");
  }
  static {
    __name2(this, "ZodTuple");
  }
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
  static {
    __name(this, "_ZodRecord");
  }
  static {
    __name2(this, "ZodRecord");
  }
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
  static {
    __name(this, "ZodMap");
  }
  static {
    __name2(this, "ZodMap");
  }
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
  static {
    __name(this, "_ZodSet");
  }
  static {
    __name2(this, "ZodSet");
  }
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
    __name(finalizeSet, "finalizeSet");
    __name2(finalizeSet, "finalizeSet");
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
  static {
    __name(this, "_ZodFunction");
  }
  static {
    __name2(this, "ZodFunction");
  }
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
    __name(makeArgsIssue, "makeArgsIssue");
    __name2(makeArgsIssue, "makeArgsIssue");
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
    __name(makeReturnsIssue, "makeReturnsIssue");
    __name2(makeReturnsIssue, "makeReturnsIssue");
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
  static {
    __name(this, "ZodLazy");
  }
  static {
    __name2(this, "ZodLazy");
  }
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
  static {
    __name(this, "ZodLiteral");
  }
  static {
    __name2(this, "ZodLiteral");
  }
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
__name(createZodEnum, "createZodEnum");
__name2(createZodEnum, "createZodEnum");
var ZodEnum = class _ZodEnum extends ZodType {
  static {
    __name(this, "_ZodEnum");
  }
  static {
    __name2(this, "ZodEnum");
  }
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
  static {
    __name(this, "ZodNativeEnum");
  }
  static {
    __name2(this, "ZodNativeEnum");
  }
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
  static {
    __name(this, "ZodPromise");
  }
  static {
    __name2(this, "ZodPromise");
  }
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
  static {
    __name(this, "ZodEffects");
  }
  static {
    __name2(this, "ZodEffects");
  }
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
      addIssue: /* @__PURE__ */ __name2((arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      }, "addIssue"),
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
      const executeRefinement = /* @__PURE__ */ __name2((acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      }, "executeRefinement");
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
  static {
    __name(this, "ZodOptional");
  }
  static {
    __name2(this, "ZodOptional");
  }
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
  static {
    __name(this, "ZodNullable");
  }
  static {
    __name2(this, "ZodNullable");
  }
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
  static {
    __name(this, "ZodDefault");
  }
  static {
    __name2(this, "ZodDefault");
  }
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
  static {
    __name(this, "ZodCatch");
  }
  static {
    __name2(this, "ZodCatch");
  }
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
  static {
    __name(this, "ZodNaN");
  }
  static {
    __name2(this, "ZodNaN");
  }
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
  static {
    __name(this, "ZodBranded");
  }
  static {
    __name2(this, "ZodBranded");
  }
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
  static {
    __name(this, "_ZodPipeline");
  }
  static {
    __name2(this, "ZodPipeline");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = /* @__PURE__ */ __name2(async () => {
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
      }, "handleAsync");
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
  static {
    __name(this, "ZodReadonly");
  }
  static {
    __name2(this, "ZodReadonly");
  }
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = /* @__PURE__ */ __name2((data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    }, "freeze");
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
__name(cleanParams, "cleanParams");
__name2(cleanParams, "cleanParams");
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
__name(custom, "custom");
__name2(custom, "custom");
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
var instanceOfType = /* @__PURE__ */ __name2((cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), "instanceOfType");
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
var ostring = /* @__PURE__ */ __name2(() => stringType().optional(), "ostring");
var onumber = /* @__PURE__ */ __name2(() => numberType().optional(), "onumber");
var oboolean = /* @__PURE__ */ __name2(() => booleanType().optional(), "oboolean");
var coerce = {
  string: /* @__PURE__ */ __name2(((arg) => ZodString.create({ ...arg, coerce: true })), "string"),
  number: /* @__PURE__ */ __name2(((arg) => ZodNumber.create({ ...arg, coerce: true })), "number"),
  boolean: /* @__PURE__ */ __name2(((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })), "boolean"),
  bigint: /* @__PURE__ */ __name2(((arg) => ZodBigInt.create({ ...arg, coerce: true })), "bigint"),
  date: /* @__PURE__ */ __name2(((arg) => ZodDate.create({ ...arg, coerce: true })), "date")
};
var NEVER = INVALID;
function getDb(env) {
  if (!env.DB) {
    throw new Error('Database binding "DB" is not configured. Please configure D1 database binding in Cloudflare Dashboard > Pages > Settings > Bindings.');
  }
  return env.DB;
}
__name(getDb, "getDb");
__name2(getDb, "getDb");
async function dbQuery(db, sql, params = []) {
  try {
    const result = await db.prepare(sql).bind(...params).all();
    return result.results || [];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
__name(dbQuery, "dbQuery");
__name2(dbQuery, "dbQuery");
async function dbFirst(db, sql, params = []) {
  try {
    const result = await db.prepare(sql).bind(...params).first();
    return result || null;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
__name(dbFirst, "dbFirst");
__name2(dbFirst, "dbFirst");
async function dbRun(db, sql, params = []) {
  try {
    return await db.prepare(sql).bind(...params).run();
  } catch (error) {
    console.error("Database run error:", error);
    throw error;
  }
}
__name(dbRun, "dbRun");
__name2(dbRun, "dbRun");
var SESSION_DURATION_DAYS = 14;
async function hashPassword(password) {
  return password;
}
__name(hashPassword, "hashPassword");
__name2(hashPassword, "hashPassword");
async function verifyPassword(password, storedPassword) {
  return password === storedPassword;
}
__name(verifyPassword, "verifyPassword");
__name2(verifyPassword, "verifyPassword");
function getSessionExpiry(days = SESSION_DURATION_DAYS) {
  return Math.floor(Date.now() / 1e3) + days * 24 * 60 * 60;
}
__name(getSessionExpiry, "getSessionExpiry");
__name2(getSessionExpiry, "getSessionExpiry");
async function getSecretKey(env) {
  const secret = env.SESSION_SECRET || "default-secret-key-change-in-production";
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const keyBuffer = await crypto.subtle.digest("SHA-256", keyData);
  return crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(getSecretKey, "getSecretKey");
__name2(getSecretKey, "getSecretKey");
async function createToken(user, env) {
  const payload = {
    userId: user.id,
    username: user.username,
    exp: getSessionExpiry()
  };
  const payloadJson = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const payloadData = encoder.encode(payloadJson);
  const key = await getSecretKey(env);
  const signature = await crypto.subtle.sign("HMAC", key, payloadData);
  const payloadB64 = btoa(payloadJson);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${payloadB64}.${sigB64}`;
}
__name(createToken, "createToken");
__name2(createToken, "createToken");
async function verifyToken(token, env) {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);
    if (payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    const encoder = new TextEncoder();
    const payloadData = encoder.encode(payloadJson);
    const signature = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const key = await getSecretKey(env);
    const isValid2 = await crypto.subtle.verify("HMAC", key, signature, payloadData);
    if (!isValid2) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
__name2(verifyToken, "verifyToken");
async function getUserFromToken(db, token, env) {
  const payload = await verifyToken(token, env);
  if (!payload) {
    return null;
  }
  const user = await dbFirst(
    db,
    `SELECT id, username FROM users WHERE id = ?`,
    [payload.userId]
  );
  return user;
}
__name(getUserFromToken, "getUserFromToken");
__name2(getUserFromToken, "getUserFromToken");
function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
__name(getCookieValue, "getCookieValue");
__name2(getCookieValue, "getCookieValue");
function setSessionCookie(token, days = SESSION_DURATION_DAYS) {
  const maxAge = days * 24 * 60 * 60;
  return `session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
__name(setSessionCookie, "setSessionCookie");
__name2(setSessionCookie, "setSessionCookie");
function clearSessionCookie() {
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
__name(clearSessionCookie, "clearSessionCookie");
__name2(clearSessionCookie, "clearSessionCookie");
async function requireAuth2(request, env) {
  const cookieHeader = request.headers.get("Cookie");
  const token = getCookieValue(cookieHeader, "session");
  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
  const db = getDb(env);
  const user = await getUserFromToken(db, token, env);
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
  return { user };
}
__name(requireAuth2, "requireAuth2");
__name2(requireAuth2, "requireAuth");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
__name2(jsonResponse, "jsonResponse");
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}
__name(errorResponse, "errorResponse");
__name2(errorResponse, "errorResponse");
async function getOppositeOrders(db, outcomeId, side, excludeUserId) {
  const oppositeSideNum = side === "bid" ? 1 : 0;
  const params = [outcomeId, oppositeSideNum];
  let userExclusion = "";
  if (excludeUserId) {
    userExclusion = " AND (o.user_id IS NULL OR o.user_id != ?)";
    const excludeUserIdNum = typeof excludeUserId === "string" ? parseInt(excludeUserId, 10) : excludeUserId;
    if (isNaN(excludeUserIdNum)) {
      console.error("Invalid excludeUserId:", excludeUserId, "parsed as:", excludeUserIdNum);
      throw new Error(`Invalid excludeUserId: ${excludeUserId}`);
    }
    params.push(excludeUserIdNum);
  }
  const sql = `
    SELECT o.*, oc.market_id
    FROM orders o
    JOIN outcomes oc ON o.outcome = oc.outcome_id
    WHERE o.outcome = ? AND o.side = ? AND o.status IN ('open', 'partial')${userExclusion}
    ORDER BY 
      CASE WHEN o.side = 0 THEN o.price END DESC,
      CASE WHEN o.side = 1 THEN o.price END ASC,
      o.create_time ASC
  `;
  try {
    const dbOrders = await dbQuery(db, sql, params);
    return dbOrders.map((o) => ({
      id: o.id.toString(),
      market_id: o.market_id,
      user_id: o.user_id?.toString() || "",
      side: o.side === 0 ? "bid" : "ask",
      price_cents: o.price,
      qty_contracts: o.contract_size || 0,
      qty_remaining: o.contract_size || 0,
      // Use contract_size as qty_remaining
      status: o.status,
      created_at: o.create_time
    }));
  } catch (error) {
    throw error;
  }
}
__name(getOppositeOrders, "getOppositeOrders");
__name2(getOppositeOrders, "getOppositeOrders");
function canMatch(bidPrice, askPrice) {
  return bidPrice >= askPrice;
}
__name(canMatch, "canMatch");
__name2(canMatch, "canMatch");
async function matchOrder(_db, takerOrder, oppositeOrders) {
  const fills = [];
  let remainingQty = takerOrder.qty_remaining;
  for (const makerOrder of oppositeOrders) {
    if (remainingQty <= 0) break;
    const canMatchOrders = takerOrder.side === "bid" ? canMatch(takerOrder.price_cents, makerOrder.price_cents) : canMatch(makerOrder.price_cents, takerOrder.price_cents);
    if (!canMatchOrders) {
      continue;
    }
    const matchPrice = makerOrder.price_cents;
    const matchQty = Math.min(remainingQty, makerOrder.qty_remaining);
    fills.push({
      price_cents: matchPrice,
      qty_contracts: matchQty,
      maker_order_id: makerOrder.id
    });
    remainingQty -= matchQty;
  }
  return fills;
}
__name(matchOrder, "matchOrder");
__name2(matchOrder, "matchOrder");
async function updateOrderStatus(db, orderId, qtyFilled) {
  if (qtyFilled <= 0) return;
  const orderIdNum = typeof orderId === "string" ? parseInt(orderId, 10) : orderId;
  const order = await dbFirst(db, "SELECT id, contract_size, status FROM orders WHERE id = ?", [orderIdNum]);
  if (!order) return;
  const currentQty = order.contract_size ?? 0;
  const effectiveFilled = Math.min(qtyFilled, currentQty);
  const newRemaining = currentQty - effectiveFilled;
  let newStatus;
  if (newRemaining <= 0) {
    newStatus = "filled";
  } else if (newRemaining < currentQty) {
    newStatus = "partial";
  } else {
    newStatus = order.status || "open";
  }
  await dbRun(
    db,
    "UPDATE orders SET contract_size = ?, status = ? WHERE id = ?",
    [Math.max(0, newRemaining), newStatus, orderIdNum]
  );
}
__name(updateOrderStatus, "updateOrderStatus");
__name2(updateOrderStatus, "updateOrderStatus");
async function createTrade(db, _marketId, _takerOrderId, _makerOrderId, priceCents, qtyContracts, outcomeId, takerUserId, makerUserId, takerSide) {
  const token = crypto.randomUUID();
  const createTime = Math.floor(Date.now() / 1e3);
  if (takerUserId != null && takerSide != null) {
    try {
      const result = await dbRun(
        db,
        `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff, outcome, taker_user_id, maker_user_id, taker_side)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
        [token, priceCents, qtyContracts, createTime, outcomeId || null, takerUserId, makerUserId ?? null, takerSide]
      );
      const tradeId = result.meta.last_row_id || 0;
      console.log(`[createTrade] Created trade id=${tradeId}, price=${priceCents}, contracts=${qtyContracts}, outcome=${outcomeId || "null"}, taker_side=${takerSide}`);
      return tradeId;
    } catch (err) {
      if (!err?.message?.includes("no such column")) throw err;
    }
  }
  try {
    const result = await dbRun(
      db,
      `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff, outcome)
       VALUES (?, ?, ?, ?, 0, 0, ?)`,
      [token, priceCents, qtyContracts, createTime, outcomeId || null]
    );
    const tradeId = result.meta.last_row_id || 0;
    console.log(`[createTrade] Created trade id=${tradeId}, price=${priceCents}, contracts=${qtyContracts}, outcome=${outcomeId || "null"}`);
    return tradeId;
  } catch (error) {
    const msg = error?.message ?? "";
    if (msg.includes("no such column: outcome")) {
      const result = await dbRun(
        db,
        `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff)
         VALUES (?, ?, ?, ?, 0, 0)`,
        [token, priceCents, qtyContracts, createTime]
      );
      return result.meta.last_row_id || 0;
    }
    throw error;
  }
}
__name(createTrade, "createTrade");
__name2(createTrade, "createTrade");
async function updatePosition(db, outcomeId, userId, side, priceCents, qtyContracts) {
  const userIdNum = typeof userId === "string" ? parseInt(userId, 10) : userId;
  const positionDb = await dbFirst(
    db,
    "SELECT * FROM positions WHERE outcome = ? AND user_id = ?",
    [outcomeId, userIdNum]
  );
  let currentNetPosition = positionDb?.net_position || 0;
  let currentPriceBasis = positionDb?.price_basis || 0;
  let currentClosedProfit = positionDb?.closed_profit || 0;
  let newNetPosition = currentNetPosition;
  let newPriceBasis = currentPriceBasis;
  let newClosedProfit = currentClosedProfit;
  if (side === "bid") {
    if (currentNetPosition < 0) {
      const closeQty = Math.min(qtyContracts, Math.abs(currentNetPosition));
      const remainingQty = qtyContracts - closeQty;
      newNetPosition = currentNetPosition + closeQty;
      if (closeQty > 0 && currentPriceBasis > 0) {
        const profit = (currentPriceBasis - priceCents) * closeQty;
        newClosedProfit = currentClosedProfit + profit;
      }
      if (remainingQty > 0) {
        newNetPosition = newNetPosition + remainingQty;
        if (currentPriceBasis > 0 && currentNetPosition < 0) {
          const totalValue = Math.abs(currentNetPosition) * currentPriceBasis + remainingQty * priceCents;
          newPriceBasis = Math.round(totalValue / newNetPosition);
        } else {
          newPriceBasis = priceCents;
        }
      } else if (newNetPosition === 0) {
        newPriceBasis = 0;
      } else {
        newPriceBasis = currentPriceBasis;
      }
    } else {
      newNetPosition = currentNetPosition + qtyContracts;
      if (currentNetPosition > 0 && currentPriceBasis > 0) {
        const totalValue = currentNetPosition * currentPriceBasis + qtyContracts * priceCents;
        newPriceBasis = Math.round(totalValue / newNetPosition);
      } else {
        newPriceBasis = priceCents;
      }
    }
  } else {
    if (currentNetPosition > 0) {
      const closeQty = Math.min(qtyContracts, currentNetPosition);
      const remainingQty = qtyContracts - closeQty;
      newNetPosition = currentNetPosition - closeQty;
      if (closeQty > 0 && currentPriceBasis > 0) {
        const profit = (priceCents - currentPriceBasis) * closeQty;
        newClosedProfit = currentClosedProfit + profit;
      }
      if (remainingQty > 0) {
        newNetPosition = newNetPosition - remainingQty;
        if (currentPriceBasis > 0 && currentNetPosition > 0) {
          const totalValue = currentNetPosition * currentPriceBasis + remainingQty * priceCents;
          newPriceBasis = Math.round(totalValue / Math.abs(newNetPosition));
        } else {
          newPriceBasis = priceCents;
        }
      } else if (newNetPosition === 0) {
        newPriceBasis = 0;
      } else {
        newPriceBasis = currentPriceBasis;
      }
    } else {
      newNetPosition = currentNetPosition - qtyContracts;
      if (currentNetPosition < 0 && currentPriceBasis > 0) {
        const totalValue = Math.abs(currentNetPosition) * currentPriceBasis + qtyContracts * priceCents;
        newPriceBasis = Math.round(totalValue / Math.abs(newNetPosition));
      } else {
        newPriceBasis = priceCents;
      }
    }
  }
  if (!positionDb) {
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
      [userIdNum, outcomeId, newNetPosition, newPriceBasis, Math.floor(Date.now() / 1e3)]
    );
  } else {
    await dbRun(
      db,
      `UPDATE positions 
       SET net_position = ?, price_basis = ?, closed_profit = ?
       WHERE outcome = ? AND user_id = ?`,
      [
        newNetPosition,
        newPriceBasis,
        newClosedProfit,
        outcomeId,
        userIdNum
      ]
    );
  }
}
__name(updatePosition, "updatePosition");
__name2(updatePosition, "updatePosition");
async function calculateExposure(db, userId, _maxExposureCents) {
  const positions = await dbQuery(
    db,
    "SELECT * FROM positions WHERE user_id = ?",
    [userId]
  );
  const openOrders = await dbQuery(
    db,
    "SELECT * FROM orders WHERE user_id = ? AND status IN ('open', 'partial')",
    [userId]
  );
  let worstCaseLoss = 0;
  for (const position of positions) {
    if (position.qty_long > 0 && position.avg_price_long_cents !== null) {
      worstCaseLoss += position.qty_long * position.avg_price_long_cents;
    }
    if (position.qty_short > 0 && position.avg_price_short_cents !== null) {
      worstCaseLoss += position.qty_short * (1e4 - position.avg_price_short_cents);
    }
  }
  for (const order of openOrders) {
    if (order.side === "bid") {
      worstCaseLoss += order.qty_remaining * order.price_cents;
    } else {
      worstCaseLoss += order.qty_remaining * (1e4 - order.price_cents);
    }
  }
  return {
    currentExposure: worstCaseLoss,
    worstCaseLoss
  };
}
__name(calculateExposure, "calculateExposure");
__name2(calculateExposure, "calculateExposure");
async function executeMatching(db, takerOrder, outcomeId) {
  console.log(`[executeMatching] Starting matching for order ${takerOrder.id}, outcomeId=${outcomeId}, side=${takerOrder.side}`);
  const fills = [];
  const trades = [];
  const oppositeOrders = await getOppositeOrders(db, outcomeId, takerOrder.side, takerOrder.user_id);
  console.log(`[executeMatching] Found ${oppositeOrders.length} opposite orders`);
  const matchedFills = await matchOrder(db, takerOrder, oppositeOrders);
  console.log(`[executeMatching] Matched ${matchedFills.length} fills`);
  const takerIdStr = String(takerOrder.id);
  const validFills = matchedFills.filter((f) => String(f.maker_order_id) !== takerIdStr);
  for (const fill of validFills) {
    await updateOrderStatus(db, fill.maker_order_id, fill.qty_contracts);
    const makerOrderId = typeof fill.maker_order_id === "string" ? parseInt(fill.maker_order_id, 10) : fill.maker_order_id;
    const makerOrderDb = await dbFirst(db, "SELECT id, user_id, outcome, side FROM orders WHERE id = ?", [makerOrderId]);
    const takerUserId = typeof takerOrder.user_id === "string" ? parseInt(takerOrder.user_id, 10) : Number(takerOrder.user_id);
    const takerSideNum = takerOrder.side === "bid" ? 0 : 1;
    const makerUserId = makerOrderDb?.user_id ?? null;
    const tradeId = await createTrade(
      db,
      takerOrder.market_id,
      takerOrder.id,
      fill.maker_order_id,
      fill.price_cents,
      fill.qty_contracts,
      outcomeId,
      Number.isNaN(takerUserId) ? null : takerUserId,
      makerUserId,
      takerSideNum
    );
    if (makerOrderDb) {
      if (!Number.isNaN(takerUserId)) {
        await updatePosition(
          db,
          outcomeId,
          takerUserId,
          takerOrder.side,
          fill.price_cents,
          fill.qty_contracts
        );
      }
      if (makerUserId != null) {
        await updatePosition(
          db,
          outcomeId,
          makerUserId,
          makerOrderDb.side === 0 ? "bid" : "ask",
          fill.price_cents,
          fill.qty_contracts
        );
      }
    }
    const tradeDb = await dbFirst(db, "SELECT * FROM trades WHERE id = ?", [tradeId]);
    if (tradeDb) {
      trades.push({
        id: tradeDb.id.toString(),
        market_id: takerOrder.market_id,
        taker_order_id: takerOrder.id,
        maker_order_id: fill.maker_order_id,
        price_cents: tradeDb.price,
        qty_contracts: tradeDb.contracts,
        created_at: tradeDb.create_time
      });
    }
    fills.push(fill);
  }
  const totalFilled = fills.reduce((sum, f) => sum + f.qty_contracts, 0);
  if (totalFilled > 0 && totalFilled <= takerOrder.qty_remaining) {
    await updateOrderStatus(db, takerOrder.id, totalFilled);
  }
  console.log(`[executeMatching] Completed: ${fills.length} fills, ${trades.length} trades created`);
  return { fills, trades };
}
__name(executeMatching, "executeMatching");
__name2(executeMatching, "executeMatching");
var orderSchema = external_exports.object({
  outcome_id: external_exports.string(),
  side: external_exports.enum(["bid", "ask"]),
  price: external_exports.number().int().min(100).max(9900),
  // 1-99 dollars in cents (whole numbers only)
  contract_size: external_exports.number().int().positive(),
  tif: external_exports.string().optional().default("GTC"),
  // Time in force, default to Good Till Cancel
  token: external_exports.string().optional()
});
var onRequestPost = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId;
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const userId = authResult.user.id;
  const db = getDb(env);
  try {
    const body = await request.json();
    const validated = orderSchema.parse(body);
    const market = await dbFirst(
      db,
      "SELECT * FROM markets WHERE market_id = ?",
      [marketId]
    );
    if (!market) {
      return errorResponse("Market not found", 404);
    }
    const outcome = await dbFirst(
      db,
      "SELECT * FROM outcomes WHERE outcome_id = ? AND market_id = ?",
      [validated.outcome_id, marketId]
    );
    if (!outcome) {
      return errorResponse("Outcome not found", 404);
    }
    const maxExposureCents = parseInt(env.MAX_EXPOSURE_CENTS || "500000", 10);
    const exposure = await calculateExposure(db, userId, maxExposureCents);
    const sideNum = validated.side === "bid" ? 0 : 1;
    const potentialExposure = sideNum === 0 ? validated.contract_size * validated.price : validated.contract_size * (1e4 - validated.price);
    if (exposure.currentExposure + potentialExposure > maxExposureCents) {
      return errorResponse(
        `Exposure limit exceeded. Current: $${(exposure.currentExposure / 100).toFixed(2)}, Limit: $${(maxExposureCents / 100).toFixed(2)}`,
        400
      );
    }
    const token = validated.token || crypto.randomUUID();
    const result = await dbRun(
      db,
      `INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Math.floor(Date.now() / 1e3),
        userId,
        // user.id is now a number
        token,
        -1,
        // order_id default
        validated.outcome_id,
        validated.price,
        "open",
        validated.tif || "GTC",
        sideNum,
        validated.contract_size,
        validated.contract_size
        // Store original size - this should NEVER change after order creation
      ]
    );
    const orderId = result.meta.last_row_id;
    if (!orderId) {
      return errorResponse("Failed to create order", 500);
    }
    await dbRun(db, "UPDATE orders SET order_id = ? WHERE id = ?", [orderId, orderId]);
    const order = await dbFirst(
      db,
      `SELECT o.*, oc.market_id 
       FROM orders o
       JOIN outcomes oc ON o.outcome = oc.outcome_id
       WHERE o.id = ?`,
      [orderId]
    );
    if (!order) {
      return errorResponse("Failed to retrieve created order", 500);
    }
    const matchingOrder = {
      id: order.id.toString(),
      market_id: order.market_id || marketId,
      user_id: order.user_id.toString(),
      side: order.side === 0 ? "bid" : "ask",
      price_cents: order.price,
      qty_contracts: order.contract_size || 0,
      qty_remaining: order.contract_size || 0,
      // Use contract_size as initial qty_remaining
      status: order.status,
      created_at: order.create_time
    };
    let allFills;
    let allTrades;
    const firstMatch = await executeMatching(db, matchingOrder, validated.outcome_id);
    allFills = firstMatch.fills;
    allTrades = firstMatch.trades;
    const updatedOrderDb = await dbFirst(
      db,
      `SELECT o.*, oc.market_id 
       FROM orders o
       JOIN outcomes oc ON o.outcome = oc.outcome_id
       WHERE o.id = ?`,
      [orderId]
    );
    let updatedOrder = updatedOrderDb ? {
      id: updatedOrderDb.id.toString(),
      market_id: updatedOrderDb.market_id || marketId,
      user_id: updatedOrderDb.user_id?.toString() || "",
      side: updatedOrderDb.side === 0 ? "bid" : "ask",
      price_cents: updatedOrderDb.price,
      qty_contracts: updatedOrderDb.contract_size || 0,
      qty_remaining: updatedOrderDb.contract_size || 0,
      status: updatedOrderDb.status,
      created_at: updatedOrderDb.create_time
    } : null;
    if (updatedOrder && (updatedOrder.status === "open" || updatedOrder.status === "partial")) {
      const orderPrice = updatedOrder.price_cents;
      const orderSide = updatedOrder.side;
      let shouldRetry = false;
      if (orderSide === "bid") {
        const bestAsk = await dbFirst(
          db,
          `SELECT price FROM orders 
           WHERE outcome = ? AND side = 1 AND status IN ('open', 'partial')
           ORDER BY price ASC, create_time ASC
           LIMIT 1`,
          [validated.outcome_id]
        );
        shouldRetry = !!(bestAsk && bestAsk.price <= orderPrice);
      } else {
        const bestBid = await dbFirst(
          db,
          `SELECT price FROM orders 
           WHERE outcome = ? AND side = 0 AND status IN ('open', 'partial')
           ORDER BY price DESC, create_time ASC
           LIMIT 1`,
          [validated.outcome_id]
        );
        shouldRetry = !!(bestBid && bestBid.price >= orderPrice);
      }
      if (shouldRetry) {
        const currentOrderDb = await dbFirst(
          db,
          `SELECT o.id, o.create_time, o.user_id, o.contract_size, o.price, o.status, o.side, oc.market_id 
           FROM orders o
           JOIN outcomes oc ON o.outcome = oc.outcome_id
           WHERE o.id = ?`,
          [orderId]
        );
        if (currentOrderDb && (currentOrderDb.contract_size ?? 0) > 0) {
          const retryOrder = {
            id: currentOrderDb.id.toString(),
            market_id: currentOrderDb.market_id || marketId,
            user_id: currentOrderDb.user_id?.toString() || "",
            side: currentOrderDb.side === 0 ? "bid" : "ask",
            price_cents: currentOrderDb.price,
            qty_contracts: currentOrderDb.contract_size || 0,
            qty_remaining: currentOrderDb.contract_size || 0,
            status: currentOrderDb.status,
            created_at: currentOrderDb.create_time
          };
          const retry = await executeMatching(db, retryOrder, validated.outcome_id);
          allFills = [...allFills, ...retry.fills];
          allTrades = [...allTrades, ...retry.trades];
          const afterRetryDb = await dbFirst(
            db,
            `SELECT o.*, oc.market_id 
             FROM orders o
             JOIN outcomes oc ON o.outcome = oc.outcome_id
             WHERE o.id = ?`,
            [orderId]
          );
          if (afterRetryDb) {
            updatedOrder = {
              id: afterRetryDb.id.toString(),
              market_id: afterRetryDb.market_id || marketId,
              user_id: afterRetryDb.user_id?.toString() || "",
              side: afterRetryDb.side === 0 ? "bid" : "ask",
              price_cents: afterRetryDb.price,
              qty_contracts: afterRetryDb.contract_size || 0,
              qty_remaining: afterRetryDb.contract_size || 0,
              status: afterRetryDb.status,
              created_at: afterRetryDb.create_time
            };
          }
        } else {
          console.warn(`[orders] Order ${orderId} still open/partial with crossing book but no remaining size to match`);
        }
      }
    }
    return jsonResponse(
      {
        order: updatedOrder,
        fills: allFills,
        trades: allTrades
      },
      201
    );
  } catch (error) {
    if (error instanceof external_exports.ZodError) {
      const priceError = error.errors.find((e) => e.path.includes("price"));
      if (priceError) {
        return errorResponse("Price must be a whole number between $1 and $99 (100-9900 cents)", 400);
      }
      return errorResponse(error.errors[0].message, 400);
    }
    console.error("Order placement error:", error);
    return errorResponse("Failed to place order", 500);
  }
}, "onRequestPost");
var onRequestGet = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId;
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const userId = authResult.user.id;
  const db = getDb(env);
  const positionsDb = await dbQuery(
    db,
    `SELECT 
       p.*,
       o.name as outcome_name,
       o.ticker as outcome_ticker,
       m.short_name as market_name
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     JOIN markets m ON o.market_id = m.market_id
     WHERE o.market_id = ? AND p.user_id = ?`,
    [marketId, userId]
  );
  let positionsWithPrice = positionsDb.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    outcome: p.outcome,
    create_time: p.create_time,
    closed_profit: p.closed_profit,
    settled_profit: p.settled_profit,
    net_position: p.net_position,
    price_basis: p.price_basis,
    is_settled: p.is_settled,
    market_name: p.market_name,
    outcome_name: p.outcome_name,
    outcome_ticker: p.outcome_ticker,
    current_price: null
  }));
  if (positionsDb.length > 0) {
    const posOutcomeIds = [...new Set(positionsDb.map((p) => p.outcome))];
    const ph = posOutcomeIds.map(() => "?").join(",");
    const bidsRows = await dbQuery(
      db,
      `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 0 AND status IN ('open','partial') ORDER BY outcome, price DESC, create_time ASC`,
      posOutcomeIds
    );
    const asksRows = await dbQuery(
      db,
      `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 1 AND status IN ('open','partial') ORDER BY outcome, price ASC, create_time ASC`,
      posOutcomeIds
    );
    const bestBidByOutcome = {};
    bidsRows.forEach((r) => {
      if (bestBidByOutcome[r.outcome] == null) bestBidByOutcome[r.outcome] = r.price;
    });
    const bestAskByOutcome = {};
    asksRows.forEach((r) => {
      if (bestAskByOutcome[r.outcome] == null) bestAskByOutcome[r.outcome] = r.price;
    });
    positionsWithPrice = positionsDb.map((p) => {
      const bidPrice = bestBidByOutcome[p.outcome] ?? null;
      const askPrice = bestAskByOutcome[p.outcome] ?? null;
      const current_price = bidPrice !== null && askPrice !== null ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
      return {
        id: p.id,
        user_id: p.user_id,
        outcome: p.outcome,
        create_time: p.create_time,
        closed_profit: p.closed_profit,
        settled_profit: p.settled_profit,
        net_position: p.net_position,
        price_basis: p.price_basis,
        is_settled: p.is_settled,
        market_name: p.market_name,
        outcome_name: p.outcome_name,
        outcome_ticker: p.outcome_ticker,
        current_price
      };
    });
  }
  return jsonResponse({ positions: positionsWithPrice });
}, "onRequestGet");
var CONTRACT_SIZE_CENTS = 1e4;
async function settleMarket(db, marketId, settleValue) {
  if (settleValue !== 0 && settleValue !== CONTRACT_SIZE_CENTS) {
    throw new Error(`Settle value must be 0 or ${CONTRACT_SIZE_CENTS}`);
  }
  const positionsDb = await dbQuery(
    db,
    `SELECT p.* 
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     WHERE o.market_id = ?`,
    [marketId]
  );
  const pnlResults = [];
  for (const position of positionsDb) {
    let pnlCents = 0;
    let settledProfit = 0;
    if (position.net_position > 0 && position.price_basis > 0) {
      const profitPerContract = settleValue - position.price_basis;
      settledProfit = position.net_position * profitPerContract;
      pnlCents = settledProfit;
    }
    if (position.net_position < 0 && position.price_basis > 0) {
      const profitPerContract = position.price_basis - settleValue;
      settledProfit = Math.abs(position.net_position) * profitPerContract;
      pnlCents = settledProfit;
    }
    await dbRun(
      db,
      `UPDATE positions 
       SET settled_profit = ?, is_settled = 1
       WHERE id = ?`,
      [settledProfit, position.id]
    );
    pnlResults.push({
      userId: position.user_id?.toString() || "",
      marketId,
      pnlCents
    });
  }
  await dbRun(
    db,
    `UPDATE outcomes SET settled_price = ? WHERE market_id = ?`,
    [settleValue, marketId]
  );
  return pnlResults;
}
__name(settleMarket, "settleMarket");
__name2(settleMarket, "settleMarket");
var settleSchema = external_exports.object({
  settle_value: external_exports.number().int().refine((v) => v === 0 || v === 1e4, {
    message: "Settle value must be 0 or 10000"
  })
});
var onRequestPost2 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId;
  const authResult = await requireAuth(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const db = getDb(env);
  try {
    const body = await request.json();
    const validated = settleSchema.parse(body);
    const market = await dbFirst(
      db,
      "SELECT * FROM markets WHERE market_id = ?",
      [marketId]
    );
    if (!market) {
      return errorResponse("Market not found", 404);
    }
    const pnlResults = await settleMarket(db, marketId, validated.settle_value);
    return jsonResponse({
      marketId,
      settleValue: validated.settle_value,
      pnlResults
    });
  } catch (error) {
    if (error instanceof external_exports.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error("Settlement error:", error);
    return errorResponse("Settlement failed", 500);
  }
}, "onRequestPost");
var onRequestGet2 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const db = getDb(env);
  let currentUserId = null;
  try {
    const cookieHeader = request.headers.get("Cookie");
    const token = getCookieValue(cookieHeader, "session");
    if (token) {
      const user = await getUserFromToken(db, token, env);
      if (user?.id) currentUserId = typeof user.id === "number" ? user.id : parseInt(String(user.id), 10);
    }
  } catch {
  }
  let tradesDb = [];
  try {
    tradesDb = await dbQuery(
      db,
      `SELECT 
         trades.id,
         trades.token,
         trades.price,
         trades.contracts,
         trades.create_time,
         trades.risk_off_contracts,
         trades.risk_off_price_diff,
         trades.outcome,
         trades.taker_user_id,
         trades.maker_user_id,
         trades.taker_side,
         outcomes.name as outcome_name,
         outcomes.ticker as outcome_ticker
       FROM trades
       LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
       WHERE outcomes.market_id = ?
       ORDER BY trades.id DESC
       LIMIT ?`,
      [marketId, limit]
    );
  } catch (_err) {
    try {
      tradesDb = await dbQuery(
        db,
        `SELECT 
           trades.id,
           trades.token,
           trades.price,
           trades.contracts,
           trades.create_time,
           trades.risk_off_contracts,
           trades.risk_off_price_diff,
           trades.outcome,
           outcomes.name as outcome_name,
           outcomes.ticker as outcome_ticker
         FROM trades
         LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
         WHERE outcomes.market_id = ?
         ORDER BY trades.id DESC
         LIMIT ?`,
        [marketId, limit]
      );
    } catch (e2) {
      console.warn("Could not query trades, returning empty list:", e2.message);
      tradesDb = [];
    }
  }
  const trades = tradesDb.map((t) => {
    const createTime = t.create_time != null ? t.create_time : (t.id ?? 0) * 1e3;
    let side = null;
    if (currentUserId != null && t.taker_side != null) {
      if (t.taker_user_id === currentUserId) side = t.taker_side;
      else if (t.maker_user_id != null && t.maker_user_id === currentUserId) side = t.taker_side === 0 ? 1 : 0;
    }
    return {
      id: t.id,
      token: t.token,
      price: t.price,
      contracts: t.contracts,
      create_time: createTime,
      risk_off_contracts: t.risk_off_contracts ?? 0,
      risk_off_price_diff: t.risk_off_price_diff ?? 0,
      outcome_name: t.outcome_name,
      outcome_ticker: t.outcome_ticker,
      side
      // 0 = buy/bid, 1 = sell/ask (current user's side when authenticated)
    };
  });
  return jsonResponse({ trades });
}, "onRequestGet");
var loginSchema = external_exports.object({
  username: external_exports.string().min(1),
  password: external_exports.string().min(1)
});
var onRequestPost3 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);
    const db = getDb(env);
    const user = await dbFirst(
      db,
      "SELECT id, username, password FROM users WHERE username = ?",
      [validated.username]
    );
    if (!user) {
      return errorResponse("Invalid username or password", 401);
    }
    const isValid2 = await verifyPassword(validated.password, user.password);
    if (!isValid2) {
      return errorResponse("Invalid username or password", 401);
    }
    const userForToken = {
      id: user.id,
      username: user.username
    };
    const token = await createToken(userForToken, env);
    const { password, ...userWithoutPassword } = user;
    const response = jsonResponse({ user: userWithoutPassword });
    response.headers.set("Set-Cookie", setSessionCookie(token));
    return response;
  } catch (error) {
    if (error instanceof external_exports.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error("Login error:", error);
    return errorResponse("Login failed", 500);
  }
}, "onRequestPost");
var onRequestPost4 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const response = jsonResponse({ message: "Logged out successfully" });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}, "onRequestPost");
var onRequestGet3 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const cookieHeader = request.headers.get("Cookie");
  const token = getCookieValue(cookieHeader, "session");
  if (!token) {
    return jsonResponse({ user: null });
  }
  const db = getDb(env);
  const user = await getUserFromToken(db, token, env);
  return jsonResponse({ user });
}, "onRequestGet");
var registerSchema = external_exports.object({
  username: external_exports.string().min(1).max(100),
  password: external_exports.string().min(1)
});
var onRequestPost5 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);
    const db = getDb(env);
    const existing = await dbFirst(
      db,
      "SELECT id FROM users WHERE username = ?",
      [validated.username]
    );
    if (existing) {
      return errorResponse("Username already taken", 409);
    }
    const passwordHash = await hashPassword(validated.password);
    const result = await dbRun(
      db,
      `INSERT INTO users (username, password)
       VALUES (?, ?)`,
      [validated.username, passwordHash]
    );
    console.log("Registration result:", {
      success: result.success,
      meta: result.meta,
      username: validated.username
    });
    if (!result.success || !result.meta.last_row_id) {
      console.error("Failed to create user:", result);
      return errorResponse("Failed to create user", 500);
    }
    const user = await dbFirst(
      db,
      "SELECT id, username FROM users WHERE id = ?",
      [result.meta.last_row_id]
    );
    if (!user) {
      return errorResponse("Failed to retrieve created user", 500);
    }
    const token = await createToken(user, env);
    const response = jsonResponse({ user }, 201);
    response.headers.set("Set-Cookie", setSessionCookie(token));
    return response;
  } catch (error) {
    if (error instanceof external_exports.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error("Registration error:", error);
    return errorResponse("Registration failed", 500);
  }
}, "onRequestPost");
var outcomeSchema = external_exports.object({
  name: external_exports.string().min(1, "Outcome name is required"),
  ticker: external_exports.string().min(1, "Ticker is required"),
  strike: external_exports.string().optional().default(""),
  outcome_id: external_exports.string().min(1).optional()
  // Optional deterministic id (e.g. h2h: outcome-h2h-ALEX-AVAYOU) to avoid duplicates
});
var marketSuggestionSchema = external_exports.object({
  short_name: external_exports.string().min(1, "Market name is required"),
  symbol: external_exports.string().min(1, "Symbol is required"),
  max_winners: external_exports.number().int().min(1).max(12).default(1),
  min_winners: external_exports.number().int().min(1).max(12).default(1),
  outcomes: external_exports.array(outcomeSchema).min(1, "At least one outcome is required").max(12, "Maximum 12 outcomes allowed"),
  round_number: external_exports.number().optional()
  // Optional round number for Round O/U markets
});
var onRequestPost6 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const db = getDb(env);
  try {
    const body = await request.json();
    const validated = marketSuggestionSchema.parse(body);
    const isRoundOU = validated.short_name.includes("Round") && validated.short_name.includes("Over/Under");
    const isTotalBirdies = validated.short_name.includes("Total Birdies");
    const marketType = isRoundOU ? "round_ou" : isTotalBirdies ? "total_birdies" : null;
    let marketId;
    if (isTotalBirdies) {
      const existingMarket = await dbFirst(
        db,
        `SELECT market_id FROM markets WHERE market_id = 'market-total-birdies'`
      );
      if (existingMarket) {
        marketId = existingMarket.market_id;
      } else {
        marketId = "market-total-birdies";
        await dbRun(
          db,
          `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            marketId,
            "Total Birdies",
            "BIRDIES",
            validated.max_winners,
            validated.min_winners,
            Math.floor(Date.now() / 1e3),
            "total_birdies"
          ]
        );
      }
    } else if (isRoundOU && validated.round_number) {
      const roundMatch = validated.short_name.match(/Round (\d+)/);
      const roundNum = validated.round_number || (roundMatch ? parseInt(roundMatch[1], 10) : null);
      if (roundNum) {
        const existingMarket = await dbFirst(
          db,
          `SELECT market_id FROM markets 
           WHERE market_type = 'round_ou' 
           AND short_name LIKE ?`,
          [`Round ${roundNum} Over/Under%`]
        );
        if (existingMarket) {
          marketId = existingMarket.market_id;
        } else {
          marketId = `market-round-${roundNum}-ou`;
          await dbRun(
            db,
            `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              marketId,
              `Round ${roundNum} Over/Under`,
              `R${roundNum}OU`,
              validated.max_winners,
              validated.min_winners,
              Math.floor(Date.now() / 1e3),
              marketType
            ]
          );
        }
      } else {
        marketId = `market-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await dbRun(
          db,
          `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            marketId,
            validated.short_name,
            validated.symbol,
            validated.max_winners,
            validated.min_winners,
            Math.floor(Date.now() / 1e3),
            marketType
          ]
        );
      }
    } else {
      marketId = `market-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await dbRun(
        db,
        `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          marketId,
          validated.short_name,
          validated.symbol,
          validated.max_winners,
          validated.min_winners,
          Math.floor(Date.now() / 1e3),
          marketType
        ]
      );
    }
    const outcomeIds = [];
    for (const outcome of validated.outcomes) {
      const outcomeId = outcome.outcome_id || `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await dbRun(
        db,
        `INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, created_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          outcomeId,
          outcome.name,
          outcome.ticker,
          marketId,
          outcome.strike || "",
          Math.floor(Date.now() / 1e3)
        ]
      );
      outcomeIds.push(outcomeId);
    }
    return jsonResponse({
      success: true,
      market_id: marketId,
      outcome_ids: outcomeIds
    }, 201);
  } catch (error) {
    if (error instanceof external_exports.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error("Market suggestion error:", error);
    return errorResponse("Failed to create market suggestion", 500);
  }
}, "onRequestPost");
var onRequestGet4 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const roundId = url.searchParams.get("roundId");
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const db = getDb(env);
  try {
    const rounds = await dbQuery(
      db,
      `SELECT * FROM rounds ORDER BY date DESC LIMIT 10`,
      []
    ).catch(() => []);
    const roundScores = roundId ? await dbQuery(
      db,
      `SELECT * FROM round_scores WHERE round_id = ?`,
      [roundId]
    ).catch(() => []) : [];
    return jsonResponse({ rounds, roundScores });
  } catch (err) {
    return errorResponse(err.message || "Failed to fetch scoring data", 500);
  }
}, "onRequestGet");
var onRequestPost7 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const roundId = url.searchParams.get("roundId");
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  if (!roundId) {
    return errorResponse("roundId is required", 400);
  }
  const body = await request.json();
  const { cross_score, net_score } = body;
  const db = getDb(env);
  const userId = authResult.user.id;
  try {
    await db.prepare(
      `INSERT INTO round_scores (id, round_id, user_id, cross_score, net_score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(round_id, user_id) DO UPDATE SET
         cross_score = excluded.cross_score,
         net_score = excluded.net_score,
         updated_at = excluded.updated_at`
    ).bind(
      `${roundId}-${userId}`,
      roundId,
      userId,
      cross_score || null,
      net_score || null,
      Date.now()
    ).run();
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(err.message || "Failed to update score", 500);
  }
}, "onRequestPost");
var onRequestGet5 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const course = url.searchParams.get("course");
  const year = url.searchParams.get("year");
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const db = getDb(env);
  try {
    let query = "SELECT * FROM scores WHERE 1=1";
    const params = [];
    if (course && course !== "all") {
      query += " AND course = ?";
      params.push(course);
    }
    if (year && year !== "all") {
      query += " AND year = ?";
      params.push(parseInt(year, 10));
    }
    query += " ORDER BY course, year, player";
    const scores = await dbQuery(db, query, params);
    const response = jsonResponse({ scores });
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const requestedYear = year && year !== "all" ? parseInt(year, 10) : null;
    if (requestedYear != null && !Number.isNaN(requestedYear) && requestedYear < currentYear) {
      response.headers.set("Cache-Control", "public, max-age=604800");
    }
    return response;
  } catch (err) {
    console.error("[scores GET] Error:", err);
    return errorResponse(err.message || "Failed to fetch scores", 500);
  }
}, "onRequestGet");
var onRequestPost8 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const body = await request.json();
  const { course, year, player, score, index_number } = body;
  if (!course || !year || !player) {
    return errorResponse("course, year, and player are required", 400);
  }
  const db = getDb(env);
  try {
    await dbRun(
      db,
      `INSERT INTO scores (course, year, player, score, index_number, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(course, year, player) DO UPDATE SET
         score = excluded.score,
         index_number = excluded.index_number,
         updated_at = excluded.updated_at`,
      [
        course,
        parseInt(year, 10),
        player,
        score === null || score === "" ? null : parseInt(score, 10),
        index_number || null,
        Math.floor(Date.now() / 1e3)
      ]
    );
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[scores POST] Error:", err);
    return errorResponse(err.message || "Failed to update score", 500);
  }
}, "onRequestPost");
var onRequestGet6 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId;
  const db = getDb(env);
  let currentUserId = null;
  try {
    const cookieHeader = request.headers.get("Cookie");
    const token = getCookieValue(cookieHeader, "session");
    if (token) {
      const user = await getUserFromToken(db, token, env);
      if (user?.id) currentUserId = typeof user.id === "number" ? user.id : parseInt(String(user.id), 10);
    }
  } catch {
  }
  const market = await dbFirst(db, "SELECT * FROM markets WHERE market_id = ?", [marketId]);
  if (!market) {
    return errorResponse("Market not found", 404);
  }
  const outcomes = await dbQuery(
    db,
    "SELECT * FROM outcomes WHERE market_id = ? ORDER BY created_date ASC",
    [market.market_id]
  );
  const orderbookByOutcome = {};
  const outcomeIds = outcomes.map((o) => o.outcome_id);
  outcomes.forEach((o) => {
    orderbookByOutcome[o.outcome_id] = { bids: [], asks: [] };
  });
  if (outcomeIds.length > 0) {
    const placeholders = outcomeIds.map(() => "?").join(",");
    const orderRow = {
      id: 0,
      create_time: 0,
      user_id: null,
      token: "",
      order_id: 0,
      outcome: "",
      price: 0,
      status: "",
      tif: "",
      side: 0,
      contract_size: null
    };
    const bidsDb = await dbQuery(
      db,
      `SELECT * FROM orders 
       WHERE outcome IN (${placeholders}) AND side = 0 AND status IN ('open', 'partial')
       ORDER BY outcome, price DESC, create_time ASC`,
      outcomeIds
    );
    const asksDb = await dbQuery(
      db,
      `SELECT * FROM orders 
       WHERE outcome IN (${placeholders}) AND side = 1 AND status IN ('open', 'partial')
       ORDER BY outcome, price ASC, create_time ASC`,
      outcomeIds
    );
    const mapOrder = /* @__PURE__ */ __name2((o) => ({
      id: o.id,
      create_time: o.create_time,
      user_id: o.user_id,
      token: o.token,
      order_id: o.order_id,
      outcome: o.outcome,
      price: o.price,
      status: o.status,
      tif: o.tif,
      side: o.side,
      contract_size: o.contract_size
    }), "mapOrder");
    bidsDb.forEach((o) => {
      orderbookByOutcome[o.outcome].bids.push(mapOrder(o));
    });
    asksDb.forEach((o) => {
      orderbookByOutcome[o.outcome].asks.push(mapOrder(o));
    });
  }
  const tradesLimit = 20;
  let tradesDb = [];
  try {
    tradesDb = await dbQuery(
      db,
      `SELECT 
         trades.id, trades.token, trades.price, trades.contracts, trades.create_time,
         trades.risk_off_contracts, trades.risk_off_price_diff, trades.outcome,
         trades.taker_user_id, trades.maker_user_id, trades.taker_side,
         outcomes.name as outcome_name, outcomes.ticker as outcome_ticker
       FROM trades
       LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
       WHERE outcomes.market_id = ?
       ORDER BY trades.id DESC
       LIMIT ?`,
      [marketId, tradesLimit]
    );
  } catch (_err) {
    try {
      tradesDb = await dbQuery(
        db,
        `SELECT trades.id, trades.token, trades.price, trades.contracts, trades.create_time,
                trades.risk_off_contracts, trades.risk_off_price_diff, trades.outcome,
                outcomes.name as outcome_name, outcomes.ticker as outcome_ticker
         FROM trades LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
         WHERE outcomes.market_id = ? ORDER BY trades.id DESC LIMIT ?`,
        [marketId, tradesLimit]
      );
    } catch {
      tradesDb = [];
    }
  }
  const trades = tradesDb.map((t) => {
    const createTime = t.create_time != null ? t.create_time : (t.id ?? 0) * 1e3;
    let side = null;
    if (currentUserId != null && t.taker_side != null) {
      if (t.taker_user_id === currentUserId) side = t.taker_side;
      else if (t.maker_user_id != null && t.maker_user_id === currentUserId) side = t.taker_side === 0 ? 1 : 0;
    }
    return {
      id: t.id,
      token: t.token,
      price: t.price,
      contracts: t.contracts,
      create_time: createTime,
      risk_off_contracts: t.risk_off_contracts ?? 0,
      risk_off_price_diff: t.risk_off_price_diff ?? 0,
      outcome_name: t.outcome_name,
      outcome_ticker: t.outcome_ticker,
      side
    };
  });
  let positions = [];
  if (currentUserId != null) {
    const positionsDb = await dbQuery(
      db,
      `SELECT p.*, o.name as outcome_name, o.ticker as outcome_ticker, m.short_name as market_name
       FROM positions p
       JOIN outcomes o ON p.outcome = o.outcome_id
       JOIN markets m ON o.market_id = m.market_id
       WHERE o.market_id = ? AND p.user_id = ?
       ORDER BY p.create_time DESC`,
      [marketId, currentUserId]
    );
    if (positionsDb.length > 0) {
      const posOutcomeIds = [...new Set(positionsDb.map((p) => p.outcome))];
      const ph = posOutcomeIds.map(() => "?").join(",");
      const bidsRows = await dbQuery(
        db,
        `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 0 AND status IN ('open','partial') ORDER BY outcome, price DESC, create_time ASC`,
        posOutcomeIds
      );
      const asksRows = await dbQuery(
        db,
        `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 1 AND status IN ('open','partial') ORDER BY outcome, price ASC, create_time ASC`,
        posOutcomeIds
      );
      const bestBidByOutcome = {};
      bidsRows.forEach((r) => {
        if (bestBidByOutcome[r.outcome] == null) bestBidByOutcome[r.outcome] = r.price;
      });
      const bestAskByOutcome = {};
      asksRows.forEach((r) => {
        if (bestAskByOutcome[r.outcome] == null) bestAskByOutcome[r.outcome] = r.price;
      });
      positions = positionsDb.map((p) => {
        const bidPrice = bestBidByOutcome[p.outcome] ?? null;
        const askPrice = bestAskByOutcome[p.outcome] ?? null;
        const current_price = bidPrice != null && askPrice != null ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
        return {
          id: p.id,
          user_id: p.user_id,
          outcome: p.outcome,
          create_time: p.create_time,
          closed_profit: p.closed_profit,
          settled_profit: p.settled_profit,
          net_position: p.net_position,
          price_basis: p.price_basis,
          is_settled: p.is_settled,
          market_name: p.market_name,
          outcome_name: p.outcome_name,
          outcome_ticker: p.outcome_ticker,
          current_price
        };
      });
    }
  }
  return jsonResponse({
    market,
    outcomes,
    orderbook: orderbookByOutcome,
    trades,
    positions
  });
}, "onRequestGet");
var onRequestDelete = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, params } = context;
  const orderId = params.orderId;
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const userId = authResult.user.id;
  const db = getDb(env);
  const order = await dbFirst(
    db,
    "SELECT id, user_id, status FROM orders WHERE id = ?",
    [parseInt(orderId, 10)]
  );
  if (!order) {
    return errorResponse("Order not found", 404);
  }
  if (order.user_id !== userId) {
    return errorResponse("Unauthorized", 403);
  }
  if (order.status !== "open" && order.status !== "partial") {
    return errorResponse("Cannot cancel order with status: " + order.status, 400);
  }
  await dbRun(
    db,
    "UPDATE orders SET status = ? WHERE id = ?",
    ["canceled", parseInt(orderId, 10)]
  );
  return jsonResponse({ success: true });
}, "onRequestDelete");
function arrayToCSV(data) {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(
    (row) => headers.map((header) => {
      const value = row[header];
      if (value === null || value === void 0) return "";
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
  );
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
__name(arrayToCSV, "arrayToCSV");
__name2(arrayToCSV, "arrayToCSV");
var onRequestGet7 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const db = getDb(env);
  if (type === "trades") {
    const sql = `
      SELECT 
        t.id,
        t.token,
        t.price,
        t.contracts,
        t.create_time,
        t.risk_off_contracts,
        t.risk_off_price_diff
      FROM trades t
      ORDER BY t.create_time DESC
    `;
    const trades = await dbQuery(db, sql, []);
    const csv = arrayToCSV(trades);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="trades.csv"'
      }
    });
  }
  return errorResponse("Invalid export type. Use: trades", 400);
}, "onRequestGet");
var onRequestGet8 = /* @__PURE__ */ __name2(async (context) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const db = getDb(env);
    const markets = await dbQuery(db, "SELECT * FROM markets ORDER BY created_date DESC", []);
    const marketIds = markets.map((m) => m.market_id);
    let allOutcomes = [];
    if (marketIds.length > 0) {
      const placeholders = marketIds.map(() => "?").join(",");
      allOutcomes = await dbQuery(
        db,
        `SELECT * FROM outcomes WHERE market_id IN (${placeholders}) ORDER BY market_id, created_date ASC`,
        marketIds
      );
    }
    const outcomesByMarket = {};
    marketIds.forEach((id) => {
      outcomesByMarket[id] = [];
    });
    allOutcomes.forEach((o) => {
      if (outcomesByMarket[o.market_id]) outcomesByMarket[o.market_id].push(o);
    });
    const marketsWithOutcomes = markets.map((market) => ({
      ...market,
      outcomes: outcomesByMarket[market.market_id] || []
    }));
    return jsonResponse({ markets: marketsWithOutcomes });
  } catch (error) {
    console.error("Error in /api/markets:", error);
    return errorResponse(error.message || "Failed to fetch markets", 500);
  }
}, "onRequestGet");
var onRequestGet9 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const userId = authResult.user.id;
  const db = getDb(env);
  const ordersDb = await dbQuery(
    db,
    `SELECT 
      o.*,
      oc.name as outcome_name,
      oc.market_id,
      m.short_name as market_name
     FROM orders o
     JOIN outcomes oc ON o.outcome = oc.outcome_id
     JOIN markets m ON oc.market_id = m.market_id
     WHERE o.user_id = ?
     ORDER BY o.create_time DESC
     LIMIT ?`,
    [userId, limit]
  );
  const needsTradeFallback = ordersDb.filter(
    (o) => (o.status === "filled" || o.status === "partial") && (o.original_contract_size == null || o.original_contract_size === 0)
  );
  const uniquePairs = Array.from(
    new Set(needsTradeFallback.map((o) => `${o.outcome}\0${o.price}`))
  ).map((key2) => {
    const [outcome, price] = key2.split("\0");
    return { outcome, price: parseInt(price, 10) };
  });
  let tradeRows = [];
  if (uniquePairs.length > 0) {
    const conditions = uniquePairs.map(() => "(outcome = ? AND price = ?)").join(" OR ");
    const params = uniquePairs.flatMap((p) => [p.outcome, p.price]);
    tradeRows = await dbQuery(
      db,
      `SELECT outcome, price, contracts, id FROM trades WHERE ${conditions} ORDER BY id DESC`,
      params
    );
  }
  const key = /* @__PURE__ */ __name2((outcome, price) => `${outcome}\0${price}`, "key");
  const byPair = {};
  uniquePairs.forEach((p) => {
    byPair[key(p.outcome, p.price)] = { latestContracts: 0, sumContracts: 0 };
  });
  tradeRows.forEach((r) => {
    const k = key(r.outcome, r.price);
    if (byPair[k]) {
      if (byPair[k].latestContracts === 0) byPair[k].latestContracts = r.contracts;
      byPair[k].sumContracts += r.contracts;
    }
  });
  const orders = ordersDb.map((o) => {
    let displaySize = o.contract_size || 0;
    if (o.status === "filled") {
      if (o.original_contract_size != null && o.original_contract_size > 0) {
        displaySize = o.original_contract_size;
      } else {
        const fallback = byPair[key(o.outcome, o.price)];
        displaySize = fallback?.latestContracts ?? 0;
      }
    } else if (o.status === "partial") {
      if (o.original_contract_size != null && o.original_contract_size > 0) {
        displaySize = o.original_contract_size - (o.contract_size || 0);
      } else {
        const fallback = byPair[key(o.outcome, o.price)];
        displaySize = fallback?.sumContracts ?? 0;
      }
    }
    let originalSize = o.original_contract_size;
    if (originalSize == null || originalSize === 0) {
      if (o.status === "open" || o.status === "canceled") {
        originalSize = o.contract_size || 0;
      } else if (o.status === "filled") {
        const fallback = byPair[key(o.outcome, o.price)];
        originalSize = fallback?.latestContracts ?? 0;
      } else if (o.status === "partial") {
        const remaining = o.contract_size || 0;
        const fallback = byPair[key(o.outcome, o.price)];
        originalSize = fallback?.sumContracts != null ? remaining + fallback.sumContracts : o.contract_size || 0;
      } else {
        originalSize = o.contract_size || 0;
      }
    }
    const remainingSize = o.contract_size || 0;
    return {
      id: o.id,
      create_time: o.create_time,
      user_id: o.user_id,
      token: o.token,
      order_id: o.order_id,
      outcome: o.outcome,
      price: o.price,
      status: o.status,
      tif: o.tif,
      side: o.side,
      contract_size: displaySize,
      original_size: originalSize,
      remaining_size: remainingSize,
      outcome_name: o.outcome_name,
      market_name: o.market_name
    };
  });
  return jsonResponse({ orders });
}, "onRequestGet");
var onRequestGet10 = /* @__PURE__ */ __name2(async (context) => {
  try {
    const { env } = context;
    if (!env.DB) {
      return errorResponse("Database not configured. Please check D1 binding in Cloudflare Dashboard.", 500);
    }
    const db = getDb(env);
    const participants = await dbQuery(
      db,
      "SELECT * FROM participants ORDER BY name ASC"
    );
    return jsonResponse({ participants });
  } catch (error) {
    console.error("Participants endpoint error:", error);
    return errorResponse(
      `Database error: ${error?.message || "Unknown error"}. Check Cloudflare Dashboard > Pages > Settings > Bindings for D1 configuration.`,
      500
    );
  }
}, "onRequestGet");
async function recalculatePriceBasis(db, userId, outcomeId, currentNetPosition) {
  const orders = await dbQuery(
    db,
    `SELECT price, side, contract_size, create_time
     FROM orders
     WHERE outcome = ? AND user_id = ? AND status IN ('filled', 'partial') AND contract_size > 0
     ORDER BY create_time ASC`,
    [outcomeId, userId]
  );
  if (orders.length === 0) {
    return null;
  }
  let longContracts = [];
  let shortContracts = [];
  for (const order of orders) {
    const qty = order.contract_size || 0;
    if (qty === 0) continue;
    if (order.side === 0) {
      if (shortContracts.length > 0) {
        let remainingToClose = qty;
        while (remainingToClose > 0 && shortContracts.length > 0) {
          const firstShort = shortContracts[0];
          if (firstShort.qty <= remainingToClose) {
            remainingToClose -= firstShort.qty;
            shortContracts.shift();
          } else {
            firstShort.qty -= remainingToClose;
            remainingToClose = 0;
          }
        }
        if (remainingToClose > 0) {
          longContracts.push({ price: order.price, qty: remainingToClose });
        }
      } else {
        longContracts.push({ price: order.price, qty });
      }
    } else {
      if (longContracts.length > 0) {
        let remainingToClose = qty;
        while (remainingToClose > 0 && longContracts.length > 0) {
          const firstLong = longContracts[0];
          if (firstLong.qty <= remainingToClose) {
            remainingToClose -= firstLong.qty;
            longContracts.shift();
          } else {
            firstLong.qty -= remainingToClose;
            remainingToClose = 0;
          }
        }
        if (remainingToClose > 0) {
          shortContracts.push({ price: order.price, qty: remainingToClose });
        }
      } else {
        shortContracts.push({ price: order.price, qty });
      }
    }
  }
  if (currentNetPosition > 0 && longContracts.length > 0) {
    let totalValue = 0;
    let totalQty = 0;
    for (const contract of longContracts) {
      totalValue += contract.price * contract.qty;
      totalQty += contract.qty;
    }
    if (totalQty > 0 && Math.abs(totalQty - currentNetPosition) <= 1) {
      return Math.round(totalValue / totalQty);
    }
  } else if (currentNetPosition < 0 && shortContracts.length > 0) {
    let totalValue = 0;
    let totalQty = 0;
    for (const contract of shortContracts) {
      totalValue += contract.price * contract.qty;
      totalQty += contract.qty;
    }
    if (totalQty > 0 && Math.abs(totalQty - Math.abs(currentNetPosition)) <= 1) {
      return Math.round(totalValue / totalQty);
    }
  }
  return null;
}
__name(recalculatePriceBasis, "recalculatePriceBasis");
__name2(recalculatePriceBasis, "recalculatePriceBasis");
var onRequestGet11 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const userId = authResult.user.id;
  const userIdNum = typeof userId === "string" ? parseInt(userId, 10) : userId;
  const db = getDb(env);
  const positionsDb = await dbQuery(
    db,
    `SELECT 
      p.*,
      o.name as outcome_name,
      o.ticker as outcome_ticker,
      o.outcome_id,
      o.market_id,
      m.short_name as market_name
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     JOIN markets m ON o.market_id = m.market_id
     WHERE p.user_id = ?
     ORDER BY p.create_time DESC`,
    [userIdNum]
  );
  for (const position of positionsDb) {
    if (position.price_basis === 0 && position.net_position !== 0) {
      const recalculatedBasis = await recalculatePriceBasis(
        db,
        userIdNum,
        position.outcome,
        position.net_position
      );
      if (recalculatedBasis !== null && recalculatedBasis > 0) {
        await dbRun(
          db,
          `UPDATE positions SET price_basis = ? WHERE id = ?`,
          [recalculatedBasis, position.id]
        );
        position.price_basis = recalculatedBasis;
      }
    }
  }
  let positionsWithOrderbook = positionsDb.map((p) => ({ ...p, current_price: null }));
  if (positionsDb.length > 0) {
    const posOutcomeIds = [...new Set(positionsDb.map((p) => p.outcome))];
    const ph = posOutcomeIds.map(() => "?").join(",");
    const bidsRows = await dbQuery(
      db,
      `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 0 AND status IN ('open','partial') ORDER BY outcome, price DESC, create_time ASC`,
      posOutcomeIds
    );
    const asksRows = await dbQuery(
      db,
      `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 1 AND status IN ('open','partial') ORDER BY outcome, price ASC, create_time ASC`,
      posOutcomeIds
    );
    const bestBidByOutcome = {};
    bidsRows.forEach((r) => {
      if (bestBidByOutcome[r.outcome] == null) bestBidByOutcome[r.outcome] = r.price;
    });
    const bestAskByOutcome = {};
    asksRows.forEach((r) => {
      if (bestAskByOutcome[r.outcome] == null) bestAskByOutcome[r.outcome] = r.price;
    });
    positionsWithOrderbook = positionsDb.map((p) => {
      const bidPrice = bestBidByOutcome[p.outcome] ?? null;
      const askPrice = bestAskByOutcome[p.outcome] ?? null;
      const current_price = bidPrice !== null && askPrice !== null ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
      return { ...p, current_price };
    });
  }
  return jsonResponse({ positions: positionsWithOrderbook });
}, "onRequestGet");
var onRequestGet12 = /* @__PURE__ */ __name2(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);
  const authResult = await requireAuth2(request, env);
  if ("error" in authResult) {
    return authResult.error;
  }
  const db = getDb(env);
  await dbRun(
    db,
    `UPDATE trades 
     SET outcome = (
       SELECT o.outcome 
       FROM orders o 
       WHERE ABS(o.create_time - trades.create_time) <= 2 
         AND ABS(o.price - trades.price) <= 50
       LIMIT 1
     )
     WHERE outcome IS NULL 
       AND EXISTS (
         SELECT 1 FROM orders o 
         WHERE ABS(o.create_time - trades.create_time) <= 2 
           AND ABS(o.price - trades.price) <= 50
       )`
  );
  const trades = await dbQuery(
    db,
    `SELECT 
       t.id,
       t.token,
       t.price,
       t.contracts,
       t.create_time,
       t.risk_off_contracts,
       t.risk_off_price_diff,
       t.outcome,
       o.name as outcome_name,
       o.ticker as outcome_ticker,
       o.market_id,
       m.short_name as market_short_name
     FROM trades t
     LEFT JOIN outcomes o ON t.outcome = o.outcome_id
     LEFT JOIN markets m ON o.market_id = m.market_id
     ORDER BY t.create_time DESC
     LIMIT ?`,
    [limit]
  );
  return jsonResponse({ trades });
}, "onRequestGet");
var onRequest = /* @__PURE__ */ __name2(async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    const response = await next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }
    return response;
  }
  return next();
}, "onRequest");
var routes = [
  {
    routePath: "/api/markets/:marketId/orders",
    mountPath: "/api/markets/:marketId",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/markets/:marketId/positions",
    mountPath: "/api/markets/:marketId",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/markets/:marketId/settle",
    mountPath: "/api/markets/:marketId",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/markets/:marketId/trades",
    mountPath: "/api/markets/:marketId",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/auth/register",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/markets/suggest",
    mountPath: "/api/markets",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/scoring/rounds",
    mountPath: "/api/scoring",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/scoring/rounds",
    mountPath: "/api/scoring",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/scoring/scores",
    mountPath: "/api/scoring",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/scoring/scores",
    mountPath: "/api/scoring",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/markets/:marketId",
    mountPath: "/api/markets/:marketId",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/orders/:orderId",
    mountPath: "/api/orders",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/export",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/markets",
    mountPath: "/api/markets",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/orders",
    mountPath: "/api/orders",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/participants",
    mountPath: "/api/participants",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/positions",
    mountPath: "/api/positions",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  },
  {
    routePath: "/api/trades",
    mountPath: "/api/trades",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet12]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-r9fija/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-r9fija/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.7604161206261271.js.map
