import figures from 'figures'
import * as React from 'react'
import { Box, Text, useAnimationFrame } from '@anthropic/ink'
import type { WorkflowStep } from '../types/command.js'

const SPINNER_FRAMES = ['◐', '◓', '◑', '◒']

type Props = {
  steps: WorkflowStep[]
  currentStep: number // index of the in-progress step; steps.length means all done
}

export function WorkflowProgress({ steps, currentStep }: Props): React.ReactNode {
  const [ref, time] = useAnimationFrame(100)
  const frame = Math.floor(time / 100) % SPINNER_FRAMES.length

  const isDone = currentStep >= steps.length

  return (
    <Box ref={ref} flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="claude">
          {isDone
            ? `${figures.tick} Workflow complete`
            : `${SPINNER_FRAMES[frame]} Running workflow…`}
        </Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        {steps.map((step, index) => {
          const isComplete = isDone || index < currentStep
          const isCurrent = !isDone && index === currentStep
          const isPending = !isDone && index > currentStep

          let icon: string
          let color: string | undefined

          if (isComplete) {
            icon = figures.tick
            color = 'green'
          } else if (isCurrent) {
            icon = SPINNER_FRAMES[frame]!
            color = 'claude'
          } else {
            icon = figures.circle
            color = undefined
          }

          return (
            <Box key={index} flexDirection="row">
              <Box width={2}>
                <Text color={color as never} dimColor={isPending}>
                  {icon}
                </Text>
              </Box>
              <Text dimColor={isPending} bold={isCurrent}>
                {step.name}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
