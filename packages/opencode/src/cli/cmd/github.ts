import { cmd } from "./cmd"

// GitHub integration is not available in Chad Code

export const GithubCommand = cmd({
  command: "github",
  describe: "GitHub agent (not available)",
  builder: (yargs) => yargs,
  async handler() {
    console.error("GitHub integration is not available in Chad Code")
    process.exit(1)
  },
})

// Keep parseGitHubRemote for any internal use
export function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  const match = url.match(/^(?:(?:https?|ssh):\/\/)?(?:git@)?github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

// Keep extractResponseText for any internal use
export function extractResponseText(parts: any[]): string | null {
  const textPart = parts.findLast((p: any) => p.type === "text")
  if (textPart) return textPart.text
  const reasoningPart = parts.findLast((p: any) => p.type === "reasoning")
  if (reasoningPart) return null
  const toolParts = parts.filter((p: any) => p.type === "tool" && p.state.status === "completed")
  if (toolParts.length > 0) return null
  const partTypes = parts.map((p: any) => p.type).join(", ") || "none"
  throw new Error(`Failed to parse response. Part types found: [${partTypes}]`)
}
