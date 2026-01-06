import type { APICallError, ModelMessage } from "ai"
import type { JSONSchema } from "zod/v4/core"
import type { Provider } from "./provider"

export namespace ProviderTransform {
  function unsupportedParts(msgs: ModelMessage[], model: Provider.Model): ModelMessage[] {
    return msgs.map((msg) => {
      if (msg.role !== "user" || !Array.isArray(msg.content)) return msg

      const filtered = msg.content.map((part) => {
        if (part.type !== "file" && part.type !== "image") return part

        // Check for empty base64 image data
        if (part.type === "image") {
          const imageStr = part.image.toString()
          if (imageStr.startsWith("data:")) {
            const match = imageStr.match(/^data:([^;]+);base64,(.*)$/)
            if (match && (!match[2] || match[2].length === 0)) {
              return {
                type: "text" as const,
                text: "ERROR: Image file is empty or corrupted. Please provide a valid image.",
              }
            }
          }
        }

        const mime = part.type === "image" ? part.image.toString().split(";")[0].replace("data:", "") : part.mediaType
        const filename = part.type === "file" ? part.filename : undefined
        const modality = mimeToModality(mime)
        if (!modality) return part
        if (model.capabilities.input[modality]) return part

        const name = filename ? `"${filename}"` : modality
        return {
          type: "text" as const,
          text: `ERROR: Cannot read ${name} (this model does not support ${modality} input). Inform the user.`,
        }
      })

      return { ...msg, content: filtered }
    })
  }

  function mimeToModality(mime: string): "image" | "audio" | "video" | "pdf" | undefined {
    if (mime.startsWith("image/")) return "image"
    if (mime.startsWith("audio/")) return "audio"
    if (mime.startsWith("video/")) return "video"
    if (mime === "application/pdf") return "pdf"
    return undefined
  }

  export function message(msgs: ModelMessage[], model: Provider.Model) {
    msgs = unsupportedParts(msgs, model)
    return msgs
  }

  export function temperature(_model: Provider.Model) {
    // Default temperature for corethink
    return undefined
  }

  export function topP(_model: Provider.Model) {
    return undefined
  }

  export function topK(_model: Provider.Model) {
    return undefined
  }

  export function variants(_model: Provider.Model): Record<string, Record<string, any>> {
    // Corethink doesn't have reasoning variants
    return {}
  }

  export function options(
    _model: Provider.Model,
    _sessionID: string,
    _providerOptions?: Record<string, any>,
  ): Record<string, any> {
    return {}
  }

  export function smallOptions(_model: Provider.Model) {
    return {}
  }

  export function providerOptions(model: Provider.Model, options: { [x: string]: any }) {
    return {
      [model.providerID]: options,
    }
  }

  export function maxOutputTokens(
    _npm: string,
    _options: Record<string, any>,
    modelLimit: number,
    globalLimit: number,
  ): number {
    return Math.min(modelLimit || globalLimit, globalLimit)
  }

  export function schema(_model: Provider.Model, schema: JSONSchema.BaseSchema) {
    // Strip fields that some APIs don't handle well
    const cleaned = { ...schema } as Record<string, any>
    delete cleaned["$schema"]
    // Some APIs don't like strict additionalProperties
    delete cleaned["additionalProperties"]
    return cleaned as JSONSchema.BaseSchema
  }

  export function error(_providerID: string, error: APICallError) {
    return error.message
  }
}
