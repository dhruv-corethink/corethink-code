import z from "zod"
import { Config } from "../config/config"
import { mapValues, mergeDeep } from "remeda"
import { NoSuchModelError, type Provider as SDK } from "ai"
import { Log } from "../util/log"
import { NamedError } from "@opencode-ai/util/error"
import { Env } from "../env"
import { Instance } from "../project/instance"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModelV2 } from "@ai-sdk/provider"
import { Auth } from "../auth"

export namespace Provider {
  const log = Log.create({ service: "provider" })

  // Corethink API configuration
  const CORETHINK_API_URL = "https://api.corethink.ai/v1/code"
  const CORETHINK_ENV_KEY = "CORETHINK_API_KEY"

  export const Model = z
    .object({
      id: z.string(),
      providerID: z.string(),
      api: z.object({
        id: z.string(),
        url: z.string(),
        npm: z.string(),
      }),
      name: z.string(),
      family: z.string().optional(),
      capabilities: z.object({
        temperature: z.boolean(),
        reasoning: z.boolean(),
        attachment: z.boolean(),
        toolcall: z.boolean(),
        input: z.object({
          text: z.boolean(),
          audio: z.boolean(),
          image: z.boolean(),
          video: z.boolean(),
          pdf: z.boolean(),
        }),
        output: z.object({
          text: z.boolean(),
          audio: z.boolean(),
          image: z.boolean(),
          video: z.boolean(),
          pdf: z.boolean(),
        }),
        interleaved: z.union([
          z.boolean(),
          z.object({
            field: z.enum(["reasoning_content", "reasoning_details"]),
          }),
        ]),
      }),
      cost: z.object({
        input: z.number(),
        output: z.number(),
        cache: z.object({
          read: z.number(),
          write: z.number(),
        }),
        experimentalOver200K: z
          .object({
            input: z.number(),
            output: z.number(),
            cache: z.object({
              read: z.number(),
              write: z.number(),
            }),
          })
          .optional(),
      }),
      limit: z.object({
        context: z.number(),
        output: z.number(),
      }),
      status: z.enum(["alpha", "beta", "deprecated", "active"]),
      options: z.record(z.string(), z.any()),
      headers: z.record(z.string(), z.string()),
      release_date: z.string(),
      variants: z.record(z.string(), z.record(z.string(), z.any())).optional(),
    })
    .meta({
      ref: "Model",
    })
  export type Model = z.infer<typeof Model>

  export const Info = z
    .object({
      id: z.string(),
      name: z.string(),
      source: z.enum(["env", "config", "custom", "api"]),
      env: z.string().array(),
      key: z.string().optional(),
      options: z.record(z.string(), z.any()),
      models: z.record(z.string(), Model),
    })
    .meta({
      ref: "Provider",
    })
  export type Info = z.infer<typeof Info>

  // Stub function for compatibility with server.ts
  export function fromModelsDevProvider(provider: any): Info {
    return {
      id: provider.id,
      source: "custom",
      name: provider.name,
      env: provider.env ?? [],
      options: {},
      models: {},
    }
  }

  // Create the corethink model definition
  function createCorethinkModel(): Model {
    return {
      id: "corethink",
      providerID: "corethink",
      name: "CoreThink",
      api: {
        id: "corethink",
        url: CORETHINK_API_URL,
        npm: "@ai-sdk/openai-compatible",
      },
      status: "active",
      headers: {},
      options: {},
      cost: {
        input: 1.5, // $1.50 per 1M input tokens
        output: 2.0, // $2.00 per 1M output tokens
        cache: {
          read: 0,
          write: 0,
        },
      },
      limit: {
        context: 200000,
        output: 8000,
      },
      capabilities: {
        temperature: true,
        reasoning: false,
        attachment: true,
        toolcall: true,
        input: {
          text: true,
          audio: false,
          image: true,
          video: false,
          pdf: true,
        },
        output: {
          text: true,
          audio: false,
          image: false,
          video: false,
          pdf: false,
        },
        interleaved: false,
      },
      release_date: "2025-01-01",
      variants: {},
    }
  }

  // Create the corethink provider definition
  function createCorethinkProvider(apiKey?: string): Info {
    return {
      id: "corethink",
      name: "CoreThink",
      source: apiKey ? "env" : "config",
      env: [CORETHINK_ENV_KEY],
      key: apiKey,
      options: {
        baseURL: CORETHINK_API_URL,
      },
      models: {
        corethink: createCorethinkModel(),
      },
    }
  }

  const state = Instance.state(async () => {
    using _ = log.time("state")
    const config = await Config.get()

    const providers: { [providerID: string]: Info } = {}
    const languages = new Map<string, LanguageModelV2>()
    const sdk = new Map<number, SDK>()

    log.info("init")

    // Get API key from multiple sources (in order of priority):
    // 1. Environment variable
    // 2. Auth storage (from UI input)
    // 3. Config file
    let apiKey = Env.get(CORETHINK_ENV_KEY)

    // Check auth storage if no env var
    if (!apiKey) {
      const authData = await Auth.get("corethink")
      if (authData?.type === "api") {
        apiKey = authData.key
        log.info("found API key in auth storage")
      }
    }

    if (!apiKey) {
      log.warn("CORETHINK_API_KEY not set - corethink provider will not be available")
    }

    // Create the corethink provider
    const corethinkProvider = createCorethinkProvider(apiKey)

    // Apply any config overrides
    if (config.provider?.corethink) {
      const configProvider = config.provider.corethink
      if (configProvider.options) {
        corethinkProvider.options = mergeDeep(corethinkProvider.options, configProvider.options)
      }
      if (configProvider.options?.apiKey) {
        corethinkProvider.key = configProvider.options.apiKey
      }
    }

    // Only add provider if we have an API key
    if (corethinkProvider.key) {
      providers["corethink"] = corethinkProvider
      log.info("found", { providerID: "corethink" })
    }

    return {
      models: languages,
      providers,
      sdk,
    }
  })

  export async function list() {
    return state().then((state) => state.providers)
  }

  async function getSDK(model: Model) {
    try {
      using _ = log.time("getSDK", {
        providerID: model.providerID,
      })
      const s = await state()
      const provider = s.providers[model.providerID]
      const options: Record<string, any> = { ...provider.options }

      // Enable usage tracking for OpenAI-compatible providers
      options["includeUsage"] = true

      if (!options["baseURL"]) options["baseURL"] = model.api.url
      if (options["apiKey"] === undefined && provider.key) options["apiKey"] = provider.key
      if (model.headers) {
        options["headers"] = {
          ...options["headers"],
          ...model.headers,
        }
      }

      const key = Bun.hash.xxHash32(JSON.stringify({ npm: model.api.npm, options }))
      const existing = s.sdk.get(key)
      if (existing) return existing

      options["fetch"] = async (input: any, init?: BunFetchRequestInit) => {
        const opts = init ?? {}

        if (options["timeout"] !== undefined && options["timeout"] !== null) {
          const signals: AbortSignal[] = []
          if (opts.signal) signals.push(opts.signal)
          if (options["timeout"] !== false) signals.push(AbortSignal.timeout(options["timeout"]))

          const combined = signals.length > 1 ? AbortSignal.any(signals) : signals[0]

          opts.signal = combined
        }

        // Clean up messages for API compatibility
        if (opts.body) {
          try {
            const bodyStr = typeof opts.body === "string" ? opts.body : new TextDecoder().decode(opts.body as ArrayBuffer)
            const parsed = JSON.parse(bodyStr)

            if (parsed.messages) {
              for (const msg of parsed.messages) {
                // When assistant has tool_calls, set empty content to null (some APIs require this)
                if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
                  if (msg.content && msg.content.trim() === "") {
                    msg.content = null
                  }
                }
              }
              opts.body = JSON.stringify(parsed)
            }
          } catch {
            // Ignore parse errors
          }
        }

        const response = await fetch(input, {
          ...opts,
          // @ts-ignore see here: https://github.com/oven-sh/bun/issues/16682
          timeout: false,
        })


        // For streaming responses, we need to filter out usage-only events that CoreThink sends
        // These events don't have 'choices' and cause validation errors in the AI SDK
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("text/event-stream") && response.body) {
          const reader = response.body.getReader()
          const encoder = new TextEncoder()

          const transformedStream = new ReadableStream({
            async start(controller) {
              const decoder = new TextDecoder()
              let buffer = ""

              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  controller.close()
                  break
                }

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                  const trimmed = line.trim()
                  if (!trimmed) {
                    controller.enqueue(encoder.encode("\n"))
                    continue
                  }

                  if (trimmed.startsWith("data:")) {
                    const data = trimmed.slice(5).trim()
                    if (data === "[DONE]") {
                      controller.enqueue(encoder.encode(line + "\n"))
                      continue
                    }

                    try {
                      const parsed = JSON.parse(data)
                      // Skip events that only have usage (no choices) - these cause validation errors
                      if (parsed.usage && !parsed.choices) {
                        continue
                      }
                      // CoreThink uses 'reasoning' field - map it to 'content' for compatibility
                      if (parsed.choices?.[0]?.delta?.reasoning && !parsed.choices?.[0]?.delta?.content) {
                        parsed.choices[0].delta.content = parsed.choices[0].delta.reasoning
                        delete parsed.choices[0].delta.reasoning
                        controller.enqueue(encoder.encode("data: " + JSON.stringify(parsed) + "\n"))
                        continue
                      }
                    } catch {
                      // If JSON parsing fails, pass through as-is
                    }
                  }

                  controller.enqueue(encoder.encode(line + "\n"))
                }
              }
            },
          })

          return new Response(transformedStream, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          })
        }

        return response
      }

      log.info("creating corethink provider", { providerID: model.providerID })
      const loaded = createOpenAICompatible({
        name: model.providerID,
        baseURL: options["baseURL"],
        apiKey: options["apiKey"],
        headers: options["headers"],
        fetch: options["fetch"],
      })
      s.sdk.set(key, loaded)
      return loaded as SDK
    } catch (e) {
      throw new InitError({ providerID: model.providerID }, { cause: e })
    }
  }

  export async function getProvider(providerID: string) {
    return state().then((s) => s.providers[providerID])
  }

  export async function getModel(providerID: string, modelID: string) {
    const s = await state()
    const provider = s.providers[providerID]
    if (!provider) {
      throw new ModelNotFoundError({ providerID, modelID, suggestions: ["corethink"] })
    }

    const info = provider.models[modelID]
    if (!info) {
      const availableModels = Object.keys(provider.models)
      throw new ModelNotFoundError({ providerID, modelID, suggestions: availableModels })
    }
    return info
  }

  export async function getLanguage(model: Model): Promise<LanguageModelV2> {
    const s = await state()
    const key = `${model.providerID}/${model.id}`
    if (s.models.has(key)) return s.models.get(key)!

    const sdk = await getSDK(model)

    try {
      const language = sdk.languageModel(model.api.id) as LanguageModelV2
      s.models.set(key, language)
      return language
    } catch (e) {
      if (e instanceof NoSuchModelError)
        throw new ModelNotFoundError(
          {
            modelID: model.id,
            providerID: model.providerID,
          },
          { cause: e },
        )
      throw e
    }
  }

  export async function closest(providerID: string, query: string[]) {
    const s = await state()
    const provider = s.providers[providerID]
    if (!provider) return undefined
    for (const item of query) {
      for (const modelID of Object.keys(provider.models)) {
        if (modelID.includes(item))
          return {
            providerID,
            modelID,
          }
      }
    }
  }

  export async function getSmallModel(providerID: string) {
    const cfg = await Config.get()

    if (cfg.small_model) {
      const parsed = parseModel(cfg.small_model)
      return getModel(parsed.providerID, parsed.modelID)
    }

    // For corethink, just return the main model
    const provider = await state().then((state) => state.providers[providerID])
    if (provider && provider.models["corethink"]) {
      return provider.models["corethink"]
    }

    return undefined
  }

  export function sort(models: Model[]) {
    // For corethink, just return as-is since there's only one model
    return models
  }

  export async function defaultModel() {
    const cfg = await Config.get()
    if (cfg.model) return parseModel(cfg.model)

    const providers = await list()
    const provider = providers["corethink"]
    if (!provider) throw new Error("CoreThink provider not found. Please set CORETHINK_API_KEY environment variable.")

    return {
      providerID: "corethink",
      modelID: "corethink",
    }
  }

  export function parseModel(model: string) {
    const [providerID, ...rest] = model.split("/")
    return {
      providerID: providerID,
      modelID: rest.join("/"),
    }
  }

  export const ModelNotFoundError = NamedError.create(
    "ProviderModelNotFoundError",
    z.object({
      providerID: z.string(),
      modelID: z.string(),
      suggestions: z.array(z.string()).optional(),
    }),
  )

  export const InitError = NamedError.create(
    "ProviderInitError",
    z.object({
      providerID: z.string(),
    }),
  )
}
