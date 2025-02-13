// Define workflow types
export type WorkflowType = 'animate' | 'enhance' | 'style' | 'upscale';

// Interface for workflow configuration
export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
}

// Workflow configurations
export const WORKFLOWS: Record<WorkflowType, Workflow> = {
  animate: {
    id: '1889101536595992577', // Current animation workflow
    name: 'Animation',
    description: 'Convert image to animation',
    type: 'animate'
  },
  enhance: {
    id: '', // To be added later
    name: 'Enhancement',
    description: 'Enhance image quality',
    type: 'enhance'
  },
  style: {
    id: '', // To be added later
    name: 'Style Transfer',
    description: 'Apply artistic styles',
    type: 'style'
  },
  upscale: {
    id: '', // To be added later
    name: 'Upscaling',
    description: 'Increase image resolution',
    type: 'upscale'
  }
};

// Helper function to get workflow by type
export function getWorkflow(type: WorkflowType): Workflow {
  const workflow = WORKFLOWS[type];
  if (!workflow || !workflow.id) {
    throw new Error(`Workflow for ${type} is not configured`);
  }
  return workflow;
} 