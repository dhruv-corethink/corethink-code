import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"
import { map, pipe, sortBy } from "remeda"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Link } from "../ui/link"
import { useTheme } from "../context/theme"
import { TextAttributes } from "@opentui/core"
import type { ProviderAuthAuthorization } from "@opencode-ai/sdk/v2"
import { DialogModel } from "./dialog-model"

const PROVIDER_PRIORITY: Record<string, number> = {
  corethink: 0,
}

export function createDialogProviderOptions() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const options = createMemo(() => {
    return pipe(
      sync.data.provider_next.all,
      sortBy((x) => PROVIDER_PRIORITY[x.id] ?? 99),
      map((provider) => ({
        title: provider.name,
        value: provider.id,
        description: provider.id === "corethink" ? "(Recommended)" : undefined,
        category: provider.id in PROVIDER_PRIORITY ? "Popular" : "Other",
        async onSelect() {
          const methods = sync.data.provider_auth[provider.id] ?? [
            {
              type: "api",
              label: "API key",
            },
          ]
          let index: number | null = 0
          if (methods.length > 1) {
            index = await new Promise<number | null>((resolve) => {
              dialog.replace(
                () => (
                  <DialogSelect
                    title="Select auth method"
                    options={methods.map((x, index) => ({
                      title: x.label,
                      value: index,
                    }))}
                    onSelect={(option) => resolve(option.value)}
                  />
                ),
                () => resolve(null),
              )
            })
          }
          if (index == null) return
          const method = methods[index]
          if (method.type === "oauth") {
            const result = await sdk.client.provider.oauth.authorize({
              providerID: provider.id,
              method: index,
            })
            if (result.data?.method === "code") {
              dialog.replace(() => (
                <CodeMethod providerID={provider.id} title={method.label} index={index} authorization={result.data!} />
              ))
            }
            if (result.data?.method === "auto") {
              dialog.replace(() => (
                <AutoMethod providerID={provider.id} title={method.label} index={index} authorization={result.data!} />
              ))
            }
          }
          if (method.type === "api") {
            return dialog.replace(() => <ApiMethod providerID={provider.id} title={method.label} />)
          }
        },
      })),
    )
  })
  return options
}

export function DialogProvider() {
  // Directly show Corethink API key input instead of provider selection
  return <ApiMethod providerID="corethink" title="Enter your Corethink API key" />
}

interface AutoMethodProps {
  index: number
  providerID: string
  title: string
  authorization: ProviderAuthAuthorization
}
function AutoMethod(props: AutoMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const dialog = useDialog()
  const sync = useSync()

  onMount(async () => {
    const result = await sdk.client.provider.oauth.callback({
      providerID: props.providerID,
      method: props.index,
    })
    if (result.error) {
      dialog.clear()
      return
    }
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box gap={1}>
        <Link href={props.authorization.url} fg={theme.primary} />
        <text fg={theme.textMuted}>{props.authorization.instructions}</text>
      </box>
      <text fg={theme.textMuted}>Waiting for authorization...</text>
    </box>
  )
}

interface CodeMethodProps {
  index: number
  title: string
  providerID: string
  authorization: ProviderAuthAuthorization
}
function CodeMethod(props: CodeMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()
  const [error, setError] = createSignal(false)

  return (
    <DialogPrompt
      title={props.title}
      placeholder="Authorization code"
      onConfirm={async (value) => {
        const { error } = await sdk.client.provider.oauth.callback({
          providerID: props.providerID,
          method: props.index,
          code: value,
        })
        if (!error) {
          await sdk.client.instance.dispose()
          await sync.bootstrap()
          dialog.replace(() => <DialogModel providerID={props.providerID} />)
          return
        }
        setError(true)
      }}
      description={() => (
        <box gap={1}>
          <text fg={theme.textMuted}>{props.authorization.instructions}</text>
          <Link href={props.authorization.url} fg={theme.primary} />
          <Show when={error()}>
            <text fg={theme.error}>Invalid code</text>
          </Show>
        </box>
      )}
    />
  )
}

interface ApiMethodProps {
  providerID: string
  title: string
}
function ApiMethod(props: ApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()
  const local = useLocal()

  return (
    <DialogPrompt
      title={props.title}
      placeholder="API key"
      description={
        props.providerID === "corethink" ? (
          <box gap={1}>
            <text fg={theme.textMuted}>
              CoreThink provides AI-powered code assistance. Get your API key from the CoreThink dashboard.
            </text>
            <text fg={theme.text}>
              API keys should start with <span style={{ fg: theme.primary }}>sk_</span>
            </text>
          </box>
        ) : undefined
      }
      onConfirm={async (value) => {
        if (!value) return
        await sdk.client.auth.set({
          providerID: props.providerID,
          auth: {
            type: "api",
            key: value,
          },
        })
        await sdk.client.instance.dispose()
        await sync.bootstrap()
        // Auto-select corethink model and close dialog
        if (props.providerID === "corethink") {
          local.model.set(
            { providerID: "corethink", modelID: "corethink" },
            { recent: true }
          )
          dialog.clear()
        } else {
          dialog.replace(() => <DialogModel providerID={props.providerID} />)
        }
      }}
    />
  )
}
