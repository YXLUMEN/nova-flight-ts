// src/errors.ts
var ValidationError = class extends Error {
  path;
  constructor(path, message) {
    super(`${formatPath(path)}: ${message}`);
    this.path = path;
  }
};
var formatPath = (path) => path.length === 0 ? "<root>" : path.map(String).join(".");

// src/guards.ts
var isArraySchema = (s) => Array.isArray(s) && s.length === 0;
var isTupleSchema = (s) => Array.isArray(s) && s.length > 0 && typeof s[0] === "string";
var isTokenString = (s) => typeof s === "string";
var isObjectSchema = (s) => typeof s === "object" && s !== null && !Array.isArray(s);
function isObjectFieldSchema(s) {
  return typeof s === "object" && s !== null && "type" in s && !Array.isArray(s);
}
var isArrayToken = (token) => token.endsWith("[]");

// src/runtime.ts
var stripArrayToken = (token) => token.slice(0, -2);
var makeValidatorFromToken = (registry, token) => {
  if (isArrayToken(token)) {
    const elToken = stripArrayToken(token);
    const elEntry = registry.get(elToken);
    if (!elEntry) throw new Error(`unknown type: ${elToken}`);
    const elValidator = elEntry.base;
    const arrValidator = (v, path) => {
      if (!Array.isArray(v)) throw new ValidationError(path, `expected array`);
      const out = [];
      for (let i = 0; i < v.length; i++) {
        out.push(elValidator(v[i], [...path, i]));
      }
      return out;
    };
    return arrValidator;
  }
  const entry = registry.get(token);
  if (!entry) throw new Error(`unknown type: ${token}`);
  return entry.base;
};
var applyTupleConstraints = (token, value, path, args) => {
  if (isArrayToken(token)) {
    if (!Array.isArray(value)) throw new ValidationError(path, `expected array`);
    const [minLen, maxLen] = args;
    if (typeof minLen === "number" && value.length < minLen) {
      throw new ValidationError(path, `min length ${minLen}`);
    }
    if (typeof maxLen === "number" && value.length > maxLen) {
      throw new ValidationError(path, `max length ${maxLen}`);
    }
    return value;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }
  const [min, max] = args;
  if (typeof min === "number" && value < min) {
    throw new ValidationError(path, `min ${min}`);
  }
  if (typeof max === "number" && value > max) {
    throw new ValidationError(path, `max ${max}`);
  }
  return value;
};

// src/register.ts
var TypeRegistry = class {
  map = /* @__PURE__ */ new Map();
  constructor() {
    for (const [k, v] of Object.entries(builtinBaseValidators)) {
      this.map.set(k, { base: v });
    }
  }
  addType(name, base) {
    this.map.set(name, { base });
  }
  get(name) {
    return this.map.get(name);
  }
};
var builtinBaseValidators = {
  int: (v, path) => {
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
      throw new ValidationError(path, `expected int`);
    }
    return v;
  },
  "unsigned int": (v, path) => {
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
      throw new ValidationError(path, `expected unsigned int (>= 0)`);
    }
    return v;
  },
  float: (v, path) => {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new ValidationError(path, `expected float`);
    }
    return v;
  },
  string: (v, path) => {
    if (typeof v !== "string") throw new ValidationError(path, `expected string`);
    return v;
  },
  boolean: (v, path) => {
    if (typeof v !== "boolean") throw new ValidationError(path, `expected boolean`);
    return v;
  },
  any: (v) => v
};

// src/validate.ts
var ConfigLoader = class {
  schema;
  registry;
  constructor(schema, setup) {
    this.schema = schema;
    this.registry = new TypeRegistry();
    if (setup) setup(this.registry);
  }
  load(data) {
    const out = this.validate(this.schema, data, []);
    return out;
  }
  // 公开扩展: 添加运行时类型
  addType(name, base) {
    this.registry.addType(name, base);
  }
  // 递归校验
  validate(schema, data, path) {
    if (isArraySchema(schema)) {
      if (!Array.isArray(data)) throw new ValidationError(path, `expected array`);
      return data;
    }
    if (isTokenString(schema)) {
      return makeValidatorFromToken(this.registry, schema)(data, path);
    }
    if (isTupleSchema(schema)) {
      const [token, ...args] = schema;
      const base = makeValidatorFromToken(this.registry, token)(data, path);
      return applyTupleConstraints(token, base, path, args);
    }
    if (isObjectSchema(schema)) {
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        throw new ValidationError(path, `expected object`);
      }
      const out = {};
      for (const key of Object.keys(schema)) {
        const fieldSchema = schema[key];
        const value = data[key];
        if (isObjectFieldSchema(fieldSchema)) {
          const { type, optional, default: def, defaultAs } = fieldSchema;
          if (value === void 0) {
            if (defaultAs) {
              throw new ValidationError([...path, key], `defaultAs reference '${defaultAs}' not resolved`);
            }
            if (def !== void 0) {
              out[key] = this.validate(type, def, [...path, key]);
              continue;
            }
            if (optional) {
              out[key] = void 0;
              continue;
            }
            throw new ValidationError([...path, key], `missing required field`);
          }
          out[key] = this.validate(type, value, [...path, key]);
          continue;
        }
        out[key] = this.validate(fieldSchema, value, [...path, key]);
      }
      return out;
    }
    throw new ValidationError(path, `invalid schema`);
  }
};
export {
  ConfigLoader,
  ValidationError,
  applyTupleConstraints,
  isArraySchema,
  isObjectFieldSchema,
  isObjectSchema,
  isTokenString,
  isTupleSchema,
  makeValidatorFromToken
};
