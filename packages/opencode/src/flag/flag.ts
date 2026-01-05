export namespace Flag {
  // Helper to check new env var with fallback to legacy
  function env(key: string): string | undefined {
    const newKey = key.replace("OPENCODE_", "CORETHINK_")
    return process.env[newKey] || process.env[key]
  }

  function truthyEnv(key: string) {
    const value = env(key)?.toLowerCase()
    return value === "true" || value === "1"
  }

  function numberEnv(key: string) {
    const value = env(key)
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  }

  export const OPENCODE_AUTO_SHARE = truthyEnv("OPENCODE_AUTO_SHARE")
  export const OPENCODE_GIT_BASH_PATH = env("OPENCODE_GIT_BASH_PATH")
  export const OPENCODE_CONFIG = env("OPENCODE_CONFIG")
  export const OPENCODE_CONFIG_DIR = env("OPENCODE_CONFIG_DIR")
  export const OPENCODE_CONFIG_CONTENT = env("OPENCODE_CONFIG_CONTENT")
  export const OPENCODE_DISABLE_AUTOUPDATE = truthyEnv("OPENCODE_DISABLE_AUTOUPDATE")
  export const OPENCODE_DISABLE_PRUNE = truthyEnv("OPENCODE_DISABLE_PRUNE")
  export const OPENCODE_DISABLE_TERMINAL_TITLE = truthyEnv("OPENCODE_DISABLE_TERMINAL_TITLE")
  export const OPENCODE_PERMISSION = env("OPENCODE_PERMISSION")
  export const OPENCODE_DISABLE_DEFAULT_PLUGINS = truthyEnv("OPENCODE_DISABLE_DEFAULT_PLUGINS")
  export const OPENCODE_DISABLE_LSP_DOWNLOAD = truthyEnv("OPENCODE_DISABLE_LSP_DOWNLOAD")
  export const OPENCODE_ENABLE_EXPERIMENTAL_MODELS = truthyEnv("OPENCODE_ENABLE_EXPERIMENTAL_MODELS")
  export const OPENCODE_DISABLE_AUTOCOMPACT = truthyEnv("OPENCODE_DISABLE_AUTOCOMPACT")
  export const OPENCODE_DISABLE_MODELS_FETCH = truthyEnv("OPENCODE_DISABLE_MODELS_FETCH")
  export const OPENCODE_FAKE_VCS = env("OPENCODE_FAKE_VCS")
  export const OPENCODE_CLIENT = env("OPENCODE_CLIENT") ?? "cli"

  // Experimental
  export const OPENCODE_EXPERIMENTAL = truthyEnv("OPENCODE_EXPERIMENTAL")
  export const OPENCODE_EXPERIMENTAL_FILEWATCHER = truthyEnv("OPENCODE_EXPERIMENTAL_FILEWATCHER")
  export const OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER = truthyEnv("OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER")
  export const OPENCODE_EXPERIMENTAL_ICON_DISCOVERY =
    OPENCODE_EXPERIMENTAL || truthyEnv("OPENCODE_EXPERIMENTAL_ICON_DISCOVERY")
  export const OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT = truthyEnv("OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT")
  export const OPENCODE_ENABLE_EXA =
    truthyEnv("OPENCODE_ENABLE_EXA") || OPENCODE_EXPERIMENTAL || truthyEnv("OPENCODE_EXPERIMENTAL_EXA")
  export const OPENCODE_EXPERIMENTAL_BASH_MAX_OUTPUT_LENGTH = numberEnv("OPENCODE_EXPERIMENTAL_BASH_MAX_OUTPUT_LENGTH")
  export const OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = numberEnv("OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS")
  export const OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX = numberEnv("OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX")
  export const OPENCODE_EXPERIMENTAL_OXFMT = OPENCODE_EXPERIMENTAL || truthyEnv("OPENCODE_EXPERIMENTAL_OXFMT")
  export const OPENCODE_EXPERIMENTAL_LSP_TY = truthyEnv("OPENCODE_EXPERIMENTAL_LSP_TY")
  export const OPENCODE_EXPERIMENTAL_LSP_TOOL = OPENCODE_EXPERIMENTAL || truthyEnv("OPENCODE_EXPERIMENTAL_LSP_TOOL")
}
