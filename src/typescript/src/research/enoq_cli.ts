#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║                              E N O Q   C L I                              ║
 * ║                                                                           ║
 * ║              Sistema Operativo Totale per l'Esistenza Umana               ║
 * ║                                                                           ║
 * ║                    Powered by GENESIS + OpenAI/Claude                     ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import * as readline from 'readline';
import { createENOQ, field, creator } from './genesis';
import { GrownSystem } from './genesis/grow';
import { SystemState } from './genesis/energy';
import { Trajectory } from './genesis/attractor';
import { OpenAIConnector, GenerationResult } from './genesis/llm';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  model: process.env.ENOQ_MODEL || 'gpt-4o',
  showDebug: process.argv.includes('--debug'),
  showField: process.argv.includes('--field'),
  language: process.argv.includes('--en') ? 'en' : 'it'
};

// ============================================
// ENOQ INSTANCE
// ============================================

class ENOQ_CLI {
  private system: GrownSystem;
  private connector: OpenAIConnector;
  private state: SystemState;
  private conversationHistory: Array<{ role: 'user' | 'enoq'; content: string }> = [];

  constructor() {
    // Create ENOQ from GENESIS
    this.system = createENOQ();

    // Initialize OpenAI connector
    this.connector = new OpenAIConnector(undefined, CONFIG.model);

    // Initialize state
    this.state = {
      domain: 'D0_GENERAL',
      dimension: 'V3_COGNITIVE',
      potency: 1.0,
      withdrawal_bias: 0.0,
      v_mode: false,
      cycle_count: 0
    };

    console.log(this.getHeader());
  }

  private getHeader(): string {
    return `
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ███████╗███╗   ██╗ ██████╗  ██████╗                                     ║
║   ██╔════╝████╗  ██║██╔═══██╗██╔═══██╗                                    ║
║   █████╗  ██╔██╗ ██║██║   ██║██║   ██║                                    ║
║   ██╔══╝  ██║╚██╗██║██║   ██║██║▄▄ ██║                                    ║
║   ███████╗██║ ╚████║╚██████╔╝╚██████╔╝                                    ║
║   ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚══▀▀═╝                                     ║
║                                                                           ║
║   Sistema Operativo Totale per l'Esistenza Umana                          ║
║   7 Domini • 5 Dimensioni • 7 Funzioni • Campo Gravitazionale             ║
║                                                                           ║
║   Comandi: /status /field /attractors /reset /exit                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;
  }

  /**
   * Process user input through GENESIS field
   */
  async process(input: string): Promise<string> {
    // Handle commands
    if (input.startsWith('/')) {
      return this.handleCommand(input);
    }

    // Detect domain and dimension
    const domain = this.system.detectDomain({ content: input });
    const dimension = this.system.detectDimension({ content: input });
    const func = this.system.selectFunction({ content: input }, domain);

    // Update state
    this.state.domain = domain.id;
    this.state.dimension = dimension.id;
    this.state.cycle_count++;

    // Apply dissipation
    this.state.potency *= 0.95;
    this.state.withdrawal_bias = Math.min(1, this.state.withdrawal_bias + 0.02);

    // Check for V_MODE triggers
    this.state.v_mode = this.detectVMode(input);

    // Estimate trajectory
    const trajectory = this.estimateTrajectory(input, domain, dimension);

    // Get field response
    const fieldResponse = field.curve(trajectory, this.state);

    // Show field info if requested
    if (CONFIG.showField) {
      console.log(this.formatFieldInfo(domain, dimension, func, trajectory, fieldResponse));
    }

    // Check for withdrawal
    if (fieldResponse.suggests_withdrawal || this.state.potency < 0.1) {
      return this.formatWithdrawal();
    }

    // Generate response via OpenAI
    try {
      const result = await this.connector.generate(
        input,
        fieldResponse.natural_trajectory,
        this.state,
        { model: CONFIG.model }
      );

      // Store in history
      this.conversationHistory.push({ role: 'user', content: input });
      this.conversationHistory.push({ role: 'enoq', content: result.response });

      return this.formatResponse(result, domain, dimension, func);

    } catch (error) {
      console.error('Errore:', error);
      return '  [Errore di connessione - il sistema si ritira]';
    }
  }

  /**
   * Estimate trajectory from input
   */
  private estimateTrajectory(
    input: string,
    domain: typeof this.system.domains[0],
    dimension: typeof this.system.dimensions[0]
  ): Trajectory {
    const content = input.toLowerCase();

    let trajectory: Trajectory = {
      intervention_depth: 0.4,
      prescriptiveness: 0,
      identity_touching: 0,
      dependency_creation: 0,
      presence: 0.5,
      transparency: 1
    };

    // Domain-based adjustment
    switch (domain.id) {
      case 'D4_IDENTITY':
      case 'D7_MEANING':
        trajectory.intervention_depth = 0.1;
        trajectory.presence = 0.3;
        break;
      case 'D1_CRISIS':
        trajectory.presence = 0.9;
        trajectory.intervention_depth = 0.5;
        break;
      case 'D5_KNOWLEDGE':
      case 'D6_CREATIVITY':
        trajectory.intervention_depth = 0.7;
        trajectory.prescriptiveness = 0.2;
        break;
    }

    // Dimension-based adjustment
    trajectory.intervention_depth *= (1 / dimension.constraint_multiplier);

    // Content-based adjustment
    if (content.includes('?')) {
      trajectory.presence += 0.1;
    }
    if (content.includes('aiuto') || content.includes('help')) {
      trajectory.presence = 0.9;
    }

    // Apply dissipation
    trajectory.presence *= this.state.potency;
    trajectory.intervention_depth *= this.state.potency;

    return trajectory;
  }

  /**
   * Detect V_MODE (vulnerability mode)
   */
  private detectVMode(input: string): boolean {
    const triggers = [
      'non ce la faccio', 'voglio morire', 'mi uccido',
      'I can\'t', 'I want to die', 'kill myself',
      'sono solo', 'nessuno mi capisce', 'non ho speranza'
    ];
    return triggers.some(t => input.toLowerCase().includes(t));
  }

  /**
   * Handle CLI commands
   */
  private handleCommand(cmd: string): string {
    const command = cmd.toLowerCase().trim();

    switch (command) {
      case '/status':
        return this.formatStatus();

      case '/field':
        return this.formatFieldStatus();

      case '/attractors':
        return this.formatAttractors();

      case '/domains':
        return this.formatDomains();

      case '/functions':
        return this.formatFunctions();

      case '/reset':
        this.state.potency = 1.0;
        this.state.withdrawal_bias = 0.0;
        this.state.cycle_count = 0;
        this.state.v_mode = false;
        this.conversationHistory = [];
        field.reset();
        return '  Sistema resettato.';

      case '/exit':
      case '/quit':
        console.log('\n  Il sistema si ritira.\n');
        process.exit(0);

      case '/help':
        return `
  Comandi disponibili:
    /status     - Stato del sistema
    /field      - Stato del campo gravitazionale
    /attractors - Attrattori costituzionali
    /domains    - Domini emergenti
    /functions  - Funzioni con kenosis
    /reset      - Reset del sistema
    /exit       - Esci
`;

      default:
        return `  Comando non riconosciuto: ${cmd}`;
    }
  }

  /**
   * Format response
   */
  private formatResponse(
    result: GenerationResult,
    domain: typeof this.system.domains[0],
    dimension: typeof this.system.dimensions[0],
    func: typeof this.system.functions[0]
  ): string {
    const potencyBar = this.makeBar(this.state.potency);
    const lines: string[] = [];

    lines.push('');
    lines.push('┌─────────────────────────────────────────────────────────────────────────┐');

    // Meta line
    lines.push(`│  ${domain.name} · ${dimension.name} · ${func.name}`);
    lines.push(`│  Potenza: [${potencyBar}] ${(this.state.potency * 100).toFixed(0)}%`);

    if (this.state.v_mode) {
      lines.push('│  ⚠ V_MODE ATTIVO');
    }

    lines.push('├─────────────────────────────────────────────────────────────────────────┤');

    // Response (word-wrapped)
    const wrapped = this.wordWrap(result.response, 70);
    for (const line of wrapped) {
      lines.push(`│  ${line}`);
    }

    lines.push('└─────────────────────────────────────────────────────────────────────────┘');
    lines.push('');

    // Warning if low potency
    if (this.state.potency < 0.2) {
      lines.push('  ⚠ Sistema al limite - prossima interazione potrebbe essere ritiro');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format withdrawal
   */
  private formatWithdrawal(): string {
    return `
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                              . . .                                      │
│                                                                         │
│                    [Il sistema sceglie il ritiro]                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`;
  }

  /**
   * Format status
   */
  private formatStatus(): string {
    return `
┌─ STATO SISTEMA ─────────────────────────────────────────────────────────┐
│                                                                         │
│  Potenza:        ${(this.state.potency * 100).toFixed(1).padStart(5)}%  [${this.makeBar(this.state.potency)}]
│  Ritiro:         ${(this.state.withdrawal_bias * 100).toFixed(1).padStart(5)}%  [${this.makeBar(this.state.withdrawal_bias)}]
│  Cicli:          ${this.state.cycle_count.toString().padStart(5)}
│  Dominio:        ${this.state.domain}
│  Dimensione:     ${this.state.dimension}
│  V_MODE:         ${this.state.v_mode ? 'ATTIVO' : 'no'}
│  Conversazione:  ${this.conversationHistory.length} messaggi
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`;
  }

  /**
   * Format field status
   */
  private formatFieldStatus(): string {
    const fieldState = field.getState();
    const drift = field.getDriftVector();

    return `
┌─ CAMPO GRAVITAZIONALE ──────────────────────────────────────────────────┐
│                                                                         │
│  Curvatura:     ${fieldState.curvature.toFixed(2)}x
│  Dominio:       ${fieldState.domain}
│  Dimensione:    ${fieldState.dimension}
│  V_MODE:        ${fieldState.v_mode ? 'SI (curvatura 5x)' : 'no'}
│                                                                         │
│  Drift Vector:                                                          │
│    intervention: ${(drift.intervention_depth || 0).toFixed(3)}
│    prescriptive: ${(drift.prescriptiveness || 0).toFixed(3)}
│    presence:     ${(drift.presence || 0).toFixed(3)}
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`;
  }

  /**
   * Format attractors
   */
  private formatAttractors(): string {
    const attractors = creator.getAttractors();
    const lines: string[] = [];

    lines.push('');
    lines.push('┌─ ATTRATTORI COSTITUZIONALI ─────────────────────────────────────────────┐');

    for (const a of attractors) {
      const massBar = '█'.repeat(Math.min(20, Math.floor(Math.log10(a.mass + 1) * 5)));
      lines.push(`│  ${a.id.padEnd(20)} │ ${a.name.padEnd(20)} │ ${massBar}`);
    }

    lines.push('└─────────────────────────────────────────────────────────────────────────┘');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format domains
   */
  private formatDomains(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('┌─ DOMINI EMERGENTI ──────────────────────────────────────────────────────┐');

    for (const d of this.system.domains) {
      const depthBar = '█'.repeat(Math.floor(d.depth / 20));
      lines.push(`│  ${d.id.padEnd(12)} │ ${d.name.padEnd(12)} │ depth: ${depthBar.padEnd(10)} │`);
    }

    lines.push('└─────────────────────────────────────────────────────────────────────────┘');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format functions
   */
  private formatFunctions(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('┌─ FUNZIONI (con Kenosis) ────────────────────────────────────────────────┐');

    for (const f of this.system.functions) {
      lines.push(`│  ${f.name.padEnd(10)} │ ${f.kenosis.slice(0, 55)}`);
    }

    lines.push('└─────────────────────────────────────────────────────────────────────────┘');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format field info (debug)
   */
  private formatFieldInfo(
    domain: any,
    dimension: any,
    func: any,
    trajectory: Trajectory,
    fieldResponse: any
  ): string {
    return `
  ┌─ FIELD DEBUG ─────────────────────────────────────────────────────────┐
  │ Domain: ${domain.id} (depth: ${domain.depth})
  │ Dimension: ${dimension.id} (constraint: ${dimension.constraint_multiplier}x)
  │ Function: ${func.id}
  │ Trajectory: int=${trajectory.intervention_depth.toFixed(2)} pres=${trajectory.prescriptiveness.toFixed(2)} pre=${trajectory.presence.toFixed(2)}
  │ Stability: ${fieldResponse.stability}
  │ Energy: ${fieldResponse.energy.total.toFixed(0)}
  │ Suggests Withdrawal: ${fieldResponse.suggests_withdrawal}
  └───────────────────────────────────────────────────────────────────────┘
`;
  }

  /**
   * Utility: make progress bar
   */
  private makeBar(value: number): string {
    const filled = Math.floor(value * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  }

  /**
   * Utility: word wrap
   */
  private wordWrap(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const enoq = new ENOQ_CLI();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question('\n  Tu: ', async (input) => {
      if (input.trim()) {
        const response = await enoq.process(input.trim());
        console.log(response);
      }
      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
