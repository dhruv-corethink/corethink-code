import type { Argv } from "yargs"
import { Instance } from "../../project/instance"
import { Provider } from "../../provider/provider"
import { cmd } from "./cmd"
import { UI } from "../ui"
import { EOL } from "os"

export const ModelsCommand = cmd({
  command: "models",
  describe: "list available Chad models",
  builder: (yargs: Argv) => {
    return yargs.option("verbose", {
      describe: "use more verbose model output (includes metadata like costs)",
      type: "boolean",
    })
  },
  handler: async (args) => {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        const providers = await Provider.list()

        if (Object.keys(providers).length === 0) {
          UI.error("No providers available. Please set CORETHINK_API_KEY environment variable.")
          return
        }

        for (const [providerID, provider] of Object.entries(providers)) {
          const sortedModels = Object.entries(provider.models).sort(([a], [b]) => a.localeCompare(b))
          for (const [modelID, model] of sortedModels) {
            process.stdout.write(`${providerID}/${modelID}`)
            process.stdout.write(EOL)
            if (args.verbose) {
              process.stdout.write(JSON.stringify(model, null, 2))
              process.stdout.write(EOL)
            }
          }
        }
      },
    })
  },
})
