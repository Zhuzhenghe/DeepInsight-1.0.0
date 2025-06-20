import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';

const configFileName = 'config.toml';

interface Config {
  GENERAL: {
    SIMILARITY_MEASURE: string;
    KEEP_ALIVE: string;
  };
  MODELS: {
    OPENAI: {
      API_KEY: string;
    };
    GROQ: {
      API_KEY: string;
    };
    ANTHROPIC: {
      API_KEY: string;
    };
    GEMINI: {
      API_KEY: string;
    };
    OLLAMA: {
      API_URL: string;
    };
    DEEPSEEK: {
      API_KEY: string;
    };
    CUSTOM_OPENAI: {
      API_URL: string;
      API_KEY: string;
      MODEL_NAME: string;
    };
  };
  API_ENDPOINTS: {
    SEARXNG: string;
  };
  AUTH: {
    ENABLE_REGISTRATION: boolean;
    REQUIRE_EMAIL_VERIFICATION: boolean;
    PASSWORD_MIN_LENGTH: number;
    JWT_SECRET: string;
    JWT_EXPIRE_TIME: string;
    SESSION_EXPIRE_TIME: string;
    BCRYPT_ROUNDS: number;
  };
  QUOTAS: {
    FREE_DAILY_TOKENS: number;
    FREE_MONTHLY_TOKENS: number;
    PRO_DAILY_TOKENS: number;
    PRO_MONTHLY_TOKENS: number;
  };
  PRICING: {
    PRICE_PER_1K_TOKENS: number;
    PRO_MONTHLY_PRICE: number;
  };
  ADMIN: {
    INITIAL_EMAIL: string;
    INITIAL_PASSWORD: string;
    INITIAL_USERNAME: string;
  };
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

const loadConfig = () =>
  toml.parse(
    fs.readFileSync(path.join(process.cwd(), `${configFileName}`), 'utf-8'),
  ) as any as Config;

export const getSimilarityMeasure = () =>
  loadConfig().GENERAL.SIMILARITY_MEASURE;

export const getKeepAlive = () => loadConfig().GENERAL.KEEP_ALIVE;

export const getOpenaiApiKey = () => loadConfig().MODELS.OPENAI.API_KEY;

export const getGroqApiKey = () => loadConfig().MODELS.GROQ.API_KEY;

export const getAnthropicApiKey = () => loadConfig().MODELS.ANTHROPIC.API_KEY;

export const getGeminiApiKey = () => loadConfig().MODELS.GEMINI.API_KEY;

export const getSearxngApiEndpoint = () =>
  process.env.SEARXNG_API_URL || loadConfig().API_ENDPOINTS.SEARXNG;

export const getOllamaApiEndpoint = () => loadConfig().MODELS.OLLAMA.API_URL;

export const getDeepseekApiKey = () => loadConfig().MODELS.DEEPSEEK.API_KEY;

export const getCustomOpenaiApiKey = () =>
  loadConfig().MODELS.CUSTOM_OPENAI.API_KEY;

export const getCustomOpenaiApiUrl = () =>
  loadConfig().MODELS.CUSTOM_OPENAI.API_URL;

export const getCustomOpenaiModelName = () =>
  loadConfig().MODELS.CUSTOM_OPENAI.MODEL_NAME;

export const getAuthConfig = () => loadConfig().AUTH;

export const getEnableRegistration = () => 
  loadConfig().AUTH?.ENABLE_REGISTRATION ?? true;

export const getPasswordMinLength = () => 
  loadConfig().AUTH?.PASSWORD_MIN_LENGTH ?? 8;

export const getJwtSecret = () => 
  process.env.JWT_SECRET || loadConfig().AUTH?.JWT_SECRET || 'default-secret-change-in-production';

export const getJwtExpireTime = () => 
  process.env.JWT_EXPIRE_TIME || loadConfig().AUTH?.JWT_EXPIRE_TIME || '7d';

export const getBcryptRounds = () => 
  parseInt(process.env.BCRYPT_ROUNDS || String(loadConfig().AUTH?.BCRYPT_ROUNDS ?? 10), 10);

export const getQuotasConfig = () => loadConfig().QUOTAS;

export const getFreeDailyTokens = () => 
  parseInt(process.env.FREE_USER_DAILY_LIMIT || String(loadConfig().QUOTAS?.FREE_DAILY_TOKENS ?? 1000), 10);

export const getFreeMonthlyTokens = () => 
  parseInt(process.env.FREE_USER_MONTHLY_LIMIT || String(loadConfig().QUOTAS?.FREE_MONTHLY_TOKENS ?? 30000), 10);

export const getAdminConfig = () => loadConfig().ADMIN;

export const getInitialAdminEmail = () => 
  process.env.ADMIN_EMAIL || loadConfig().ADMIN?.INITIAL_EMAIL || 'admin@example.com';

export const getInitialAdminPassword = () => 
  process.env.ADMIN_INITIAL_PASSWORD || loadConfig().ADMIN?.INITIAL_PASSWORD || 'admin123456';

export const getInitialAdminUsername = () => 
  loadConfig().ADMIN?.INITIAL_USERNAME || 'admin';

const mergeConfigs = (current: any, update: any): any => {
  if (update === null || update === undefined) {
    return current;
  }

  if (typeof current !== 'object' || current === null) {
    return update;
  }

  const result = { ...current };

  for (const key in update) {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      const updateValue = update[key];

      if (
        typeof updateValue === 'object' &&
        updateValue !== null &&
        typeof result[key] === 'object' &&
        result[key] !== null
      ) {
        result[key] = mergeConfigs(result[key], updateValue);
      } else if (updateValue !== undefined) {
        result[key] = updateValue;
      }
    }
  }

  return result;
};

export const updateConfig = (config: RecursivePartial<Config>) => {
  const currentConfig = loadConfig();
  const mergedConfig = mergeConfigs(currentConfig, config);
  fs.writeFileSync(
    path.join(path.join(process.cwd(), `${configFileName}`)),
    toml.stringify(mergedConfig),
  );
};
