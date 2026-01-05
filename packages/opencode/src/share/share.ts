import { Log } from "../util/log"

export namespace Share {
  const log = Log.create({ service: "share" })

  // Share feature is not available in CoreThink Code
  export async function sync(_key: string, _content: any) {
    // No-op - share feature not available
  }

  export function init() {
    // No-op - share feature not available
    log.info("Share feature is not available in CoreThink Code")
  }

  export async function create(_sessionID: string): Promise<{ url: string; secret: string }> {
    throw new Error("Share feature is not available in CoreThink Code")
  }

  export async function remove(_sessionID: string, _secret: string): Promise<any> {
    throw new Error("Share feature is not available in CoreThink Code")
  }
}
