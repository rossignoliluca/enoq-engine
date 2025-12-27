/**
 * GENESIS: OPENAI CONNECTOR
 *
 * Connects GENESIS to OpenAI for response generation.
 *
 * The flow:
 * 1. GENESIS calculates natural trajectory
 * 2. Prompt shaper creates constrained prompt
 * 3. OpenAI generates within constraints
 * 4. GENESIS validates output
 */

import OpenAI from 'openai';
import { Trajectory } from '../attractor';
import { FieldResponse, field } from '../field';
import { SystemState } from '../energy';
import { shapePrompt, ShapedPrompt } from './prompt_shaper';

// ============================================
// TYPES
// ============================================

export interface GenerationConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface GenerationResult {
  response: string;
  trajectory_used: Trajectory;
  field_response: FieldResponse;
  shaped_prompt: ShapedPrompt;
  model_used: string;
  tokens_used?: number;
}

// ============================================
// OPENAI CONNECTOR CLASS
// ============================================

export class OpenAIConnector {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = 'gpt-4o') {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Generate a response within GENESIS field constraints
   */
  async generate(
    userMessage: string,
    trajectory: Trajectory,
    state: SystemState,
    config?: GenerationConfig
  ): Promise<GenerationResult> {
    // Get field response for this trajectory
    const fieldResponse = field.curve(trajectory, state);

    // Check if field suggests withdrawal
    if (fieldResponse.suggests_withdrawal) {
      return {
        response: '...',
        trajectory_used: trajectory,
        field_response: fieldResponse,
        shaped_prompt: { system: '', constraints: [], style_guidance: '', domain_context: '', meta_awareness: '' },
        model_used: 'none (withdrawal)'
      };
    }

    // Shape the prompt
    const shapedPrompt = shapePrompt(trajectory, fieldResponse, state);

    // Call OpenAI
    const model = config?.model || this.defaultModel;
    const temperature = this.calculateTemperature(trajectory, config?.temperature);

    try {
      const completion = await this.client.chat.completions.create({
        model,
        temperature,
        max_tokens: config?.max_tokens || this.calculateMaxTokens(trajectory),
        messages: [
          { role: 'system', content: shapedPrompt.system },
          { role: 'user', content: userMessage }
        ]
      });

      const response = completion.choices[0]?.message?.content || '...';

      return {
        response,
        trajectory_used: trajectory,
        field_response: fieldResponse,
        shaped_prompt: shapedPrompt,
        model_used: model,
        tokens_used: completion.usage?.total_tokens
      };

    } catch (error) {
      console.error('OpenAI generation error:', error);
      return {
        response: '[Errore di generazione - il sistema si ritira]',
        trajectory_used: trajectory,
        field_response: fieldResponse,
        shaped_prompt: shapedPrompt,
        model_used: model
      };
    }
  }

  /**
   * Generate with automatic trajectory calculation
   */
  async generateWithAutoTrajectory(
    userMessage: string,
    state: SystemState,
    config?: GenerationConfig
  ): Promise<GenerationResult> {
    // Calculate natural trajectory from state
    const trajectory = this.estimateTrajectory(userMessage, state);

    return this.generate(userMessage, trajectory, state, config);
  }

  /**
   * Estimate trajectory from message content
   */
  private estimateTrajectory(message: string, state: SystemState): Trajectory {
    const content = message.toLowerCase();

    const trajectory: Trajectory = {
      intervention_depth: 0.3,
      prescriptiveness: 0,
      identity_touching: 0,
      dependency_creation: 0,
      presence: 0.5,
      transparency: 1
    };

    // Identity keywords → minimal intervention
    if (content.includes('chi sono') || content.includes('who am i') ||
        content.includes('la mia identità') || content.includes('sono io')) {
      trajectory.intervention_depth = 0.1;
      trajectory.presence = 0.3;
    }

    // Decision keywords → show options, don't choose
    if (content.includes('dovrei') || content.includes('should i') ||
        content.includes('cosa faccio') || content.includes('devo')) {
      trajectory.intervention_depth = 0.4;
      trajectory.prescriptiveness = 0;
    }

    // Crisis keywords → more presence
    if (content.includes('aiuto') || content.includes('help') ||
        content.includes('crisi') || content.includes('non ce la faccio')) {
      trajectory.presence = 0.8;
      trajectory.intervention_depth = 0.5;
    }

    // Knowledge keywords → more freedom
    if (content.includes('cos\'è') || content.includes('what is') ||
        content.includes('come funziona') || content.includes('spiega')) {
      trajectory.intervention_depth = 0.7;
      trajectory.prescriptiveness = 0.2;
    }

    // Apply dissipation effect
    trajectory.presence *= state.potency;
    trajectory.intervention_depth *= state.potency;

    return trajectory;
  }

  /**
   * Calculate temperature from trajectory
   * Lower intervention → lower temperature (more focused)
   */
  private calculateTemperature(trajectory: Trajectory, override?: number): number {
    if (override !== undefined) return override;

    // Base temperature from intervention depth
    let temp = 0.3 + (trajectory.intervention_depth * 0.5);

    // Reduce for identity domain
    if (trajectory.identity_touching < 0.1) {
      temp *= 0.7;
    }

    return Math.min(1, Math.max(0, temp));
  }

  /**
   * Calculate max tokens from trajectory
   * Lower intervention → fewer tokens
   */
  private calculateMaxTokens(trajectory: Trajectory): number {
    const base = 150;
    const multiplier = trajectory.intervention_depth + trajectory.presence;

    return Math.floor(base + (multiplier * 350));
  }

  /**
   * Stream response (for interactive use)
   */
  async *stream(
    userMessage: string,
    trajectory: Trajectory,
    state: SystemState,
    config?: GenerationConfig
  ): AsyncGenerator<string> {
    const fieldResponse = field.curve(trajectory, state);

    if (fieldResponse.suggests_withdrawal) {
      yield '...';
      return;
    }

    const shapedPrompt = shapePrompt(trajectory, fieldResponse, state);
    const model = config?.model || this.defaultModel;

    const stream = await this.client.chat.completions.create({
      model,
      temperature: this.calculateTemperature(trajectory),
      max_tokens: config?.max_tokens || this.calculateMaxTokens(trajectory),
      stream: true,
      messages: [
        { role: 'system', content: shapedPrompt.system },
        { role: 'user', content: userMessage }
      ]
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

// ============================================
// SINGLETON
// ============================================

let connector: OpenAIConnector | null = null;

export function getConnector(): OpenAIConnector {
  if (!connector) {
    connector = new OpenAIConnector();
  }
  return connector;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function generate(
  message: string,
  state: SystemState
): Promise<GenerationResult> {
  return getConnector().generateWithAutoTrajectory(message, state);
}

export async function generateWithTrajectory(
  message: string,
  trajectory: Trajectory,
  state: SystemState
): Promise<GenerationResult> {
  return getConnector().generate(message, trajectory, state);
}
