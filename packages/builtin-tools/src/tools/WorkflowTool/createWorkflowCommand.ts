import { readFile, readdir } from 'fs/promises'
import { join, parse } from 'path'
import type { Command, WorkflowStep } from 'src/types/command.js'
import { parseYaml } from 'src/utils/yaml.js'
import { WORKFLOW_DIR_NAME, WORKFLOW_FILE_EXTENSIONS } from './constants.js'

const YAML_EXTENSIONS = new Set(['.yml', '.yaml'])

/**
 * Parses `steps` from a YAML workflow file.
 * Returns undefined for markdown workflows or files without a valid `steps` array.
 * Returns { steps, workflowConfirmRequired } where workflowConfirmRequired is the
 * top-level confirmRequired default for steps that don't override it.
 */
function parseWorkflowSteps(
  content: string,
  ext: string,
): { steps: WorkflowStep[]; workflowConfirmRequired?: boolean } | undefined {
  if (!YAML_EXTENSIONS.has(ext)) return undefined

  try {
    const parsed = parseYaml(content)
    if (
      parsed == null ||
      typeof parsed !== 'object' ||
      !('steps' in parsed) ||
      !Array.isArray((parsed as { steps?: unknown }).steps)
    ) {
      return undefined
    }

    const workflowConfirmRequired =
      typeof (parsed as unknown as { confirmRequired?: unknown })['confirmRequired'] === 'boolean'
        ? (parsed as unknown as { confirmRequired: boolean })['confirmRequired']
        : undefined

    const raw = (parsed as { steps: unknown[] }).steps
    const steps: WorkflowStep[] = raw.flatMap((item): WorkflowStep[] => {
      if (item == null || typeof item !== 'object') return []
      const s = item as Record<string, unknown>
      const name = typeof s['name'] === 'string' ? s['name'] : undefined
      if (!name) return []
      return [
        {
          name,
          description:
            typeof s['description'] === 'string' ? s['description'] : undefined,
          skill: typeof s['skill'] === 'string' ? s['skill'] : undefined,
          confirmRequired:
            typeof s['confirmRequired'] === 'boolean'
              ? s['confirmRequired']
              : undefined,
          onResult:
            s['onResult'] && typeof s['onResult'] === 'object'
              ? (s['onResult'] as Record<string, string>)
              : undefined,
        },
      ]
    })

    return steps.length > 0
      ? { steps, workflowConfirmRequired }
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Scans .claude/workflows/ directory and creates Command objects for each workflow file.
 * Each workflow file becomes a slash command (e.g. /workflow-name) with context:fork
 * so it runs as a sub-agent with WorkflowProgress UI.
 */
export async function getWorkflowCommands(cwd: string): Promise<Command[]> {
  const workflowDir = join(cwd, WORKFLOW_DIR_NAME)
  let files: string[]
  try {
    files = await readdir(workflowDir)
  } catch {
    return []
  }

  const workflowFiles = files.filter((f) => {
    const ext = parse(f).ext.toLowerCase()
    return WORKFLOW_FILE_EXTENSIONS.includes(ext)
  })

  // Read each file eagerly so workflowSteps are available before invocation
  const commands = await Promise.all(
    workflowFiles.map(async (file): Promise<Command> => {
      const { name, ext } = parse(file)
      const filePath = join(workflowDir, file)

      let content: string
      try {
        content = await readFile(filePath, 'utf-8')
      } catch {
        content = ''
      }

      const parsed = parseWorkflowSteps(content, ext.toLowerCase())
      if (!parsed) {
        return {
          type: 'prompt' as const,
          name,
          description: `Run workflow: ${name}`,
          kind: 'workflow' as const,
          context: 'fork' as const,
          source: 'builtin' as const,
          progressMessage: `Running workflow ${name}...`,
          contentLength: content.length,
          workflowSteps: undefined,
          async getPromptForCommand(args, _context) {
            let latest = content
            try {
              latest = await readFile(filePath, 'utf-8')
            } catch {
              // fall back to the cached content from load time
            }
            return [
              {
                type: 'text' as const,
                text: `Execute this workflow:\n\n${latest}${
                  args ? `\n\nArguments: ${args}` : ''
                }`,
              },
            ]
          },
        } satisfies Command
      }

      const { steps: workflowSteps, workflowConfirmRequired } = parsed

      return {
        type: 'prompt' as const,
        name,
        description: `Run workflow: ${name}`,
        kind: 'workflow' as const,
        context: 'fork' as const,
        source: 'builtin' as const,
        progressMessage: `Running workflow ${name}...`,
        contentLength: content.length,
        workflowSteps,
        workflowConfirmRequired,
        async getPromptForCommand(args, _context) {
          let latest = content
          try {
            latest = await readFile(filePath, 'utf-8')
          } catch {
            // fall back to the cached content from load time
          }
          return [
            {
              type: 'text' as const,
              text: `Execute this workflow:\n\n${latest}${
                args ? `\n\nArguments: ${args}` : ''
              }`,
            },
          ]
        },
      } satisfies Command
    }),
  )

  return commands
}
