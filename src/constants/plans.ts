import type { PlanDefinition } from '../types/usage';

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  Pro: {
    name: 'Pro',
    displayName: 'Claude Pro',
    monthlyPrice: 20,
    messagesPerWindow: 45, // At least 45 messages every 5 hours
    tokensPerMessage: 155, // Conservative estimate (7000 tokens / 45 messages)
    tokenLimit: 7000, // 45 messages * 155 tokens
    description: '5x usage compared to free tier',
  },
  Max5: {
    name: 'Max5',
    displayName: 'Claude Max - Expanded',
    monthlyPrice: 100,
    messagesPerWindow: 225, // At least 225 messages every 5 hours
    tokensPerMessage: 155, // Same average as Pro
    tokenLimit: 35000, // 225 messages * 155 tokens
    description: '5x more usage than Pro plan',
  },
  Max20: {
    name: 'Max20',
    displayName: 'Claude Max - Maximum',
    monthlyPrice: 200,
    messagesPerWindow: 900, // At least 900 messages every 5 hours
    tokensPerMessage: 155, // Same average as Pro
    tokenLimit: 140000, // 900 messages * 155 tokens
    description: '20x more usage than Pro plan',
  },
  Custom: {
    name: 'Custom',
    displayName: 'Custom Plan',
    monthlyPrice: 0,
    messagesPerWindow: 3000,
    tokensPerMessage: 155,
    tokenLimit: 500000, // Default high limit
    description: 'Custom usage limits',
  },
};

export const WINDOW_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

export function getPlanByTokenLimit(tokenLimit: number): PlanDefinition {
  if (tokenLimit <= 7000) return PLAN_DEFINITIONS.Pro;
  if (tokenLimit <= 35000) return PLAN_DEFINITIONS.Max5;
  if (tokenLimit <= 140000) return PLAN_DEFINITIONS.Max20;
  return PLAN_DEFINITIONS.Custom;
}

export function detectPlanFromUsage(totalTokens: number): PlanDefinition {
  if (totalTokens <= 7000) return PLAN_DEFINITIONS.Pro;
  if (totalTokens <= 35000) return PLAN_DEFINITIONS.Max5;
  if (totalTokens <= 140000) return PLAN_DEFINITIONS.Max20;
  return PLAN_DEFINITIONS.Custom;
}