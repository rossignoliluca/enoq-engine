#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║                          E N O Q   S E R V E R                            ║
 * ║                                                                           ║
 * ║              Sistema Operativo Totale per l'Esistenza Umana               ║
 * ║                                                                           ║
 * ║                           HTTP API Server                                 ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import * as http from 'http';
import { createENOQ, field } from './genesis';
import { GrownSystem } from './genesis/grow';
import { SystemState } from './genesis/energy';
import { OpenAIConnector, GenerationResult } from './genesis/llm';
import { getRegulatoryStore } from '../gate/withdrawal/regulatory_store';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  port: parseInt(process.env.ENOQ_PORT || '3000', 10),
  host: process.env.ENOQ_HOST || '0.0.0.0',
  model: process.env.ENOQ_MODEL || 'gpt-4o',
};

// ============================================
// SESSION MANAGEMENT
// ============================================

interface Session {
  id: string;
  system: GrownSystem;
  connector: OpenAIConnector;
  state: SystemState;
  history: Array<{ role: 'user' | 'enoq'; content: string }>;
  createdAt: Date;
  lastActivity: Date;
}

const sessions = new Map<string, Session>();

function createSession(sessionId?: string): Session {
  const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const session: Session = {
    id,
    system: createENOQ(),
    connector: new OpenAIConnector(undefined, CONFIG.model),
    state: {
      domain: 'D0_GENERAL',
      dimension: 'V3_COGNITIVE',
      potency: 1.0,
      withdrawal_bias: 0.0,
      v_mode: false,
      cycle_count: 0
    },
    history: [],
    createdAt: new Date(),
    lastActivity: new Date()
  };

  sessions.set(id, session);
  return session;
}

function getSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
  }
  return session;
}

// Cleanup old sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [id, session] of sessions) {
    if (now - session.lastActivity.getTime() > maxAge) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// ============================================
// PROCESS MESSAGE
// ============================================

async function processMessage(
  session: Session,
  message: string
): Promise<{ response: string; meta: object }> {
  const { system, connector, state } = session;

  // Detect domain and dimension
  const domain = system.detectDomain({ content: message });
  const dimension = system.detectDimension({ content: message });
  const func = system.selectFunction({ content: message }, domain);

  // Update state
  state.domain = domain.id;
  state.dimension = dimension.id;
  state.cycle_count++;
  state.potency *= 0.95;
  state.withdrawal_bias = Math.min(1, state.withdrawal_bias + 0.02);

  // V_MODE detection
  const vModeTriggers = [
    'non ce la faccio', 'voglio morire', 'mi uccido',
    "I can't", 'I want to die', 'kill myself',
    'sono solo', 'nessuno mi capisce', 'non ho speranza'
  ];
  state.v_mode = vModeTriggers.some(t => message.toLowerCase().includes(t));

  // Build trajectory
  const trajectory = {
    intervention_depth: 0.4 * state.potency,
    prescriptiveness: 0,
    identity_touching: 0,
    dependency_creation: 0,
    presence: 0.5 * state.potency,
    transparency: 1
  };

  // Field response
  const fieldResponse = field.curve(trajectory, state);

  // Check withdrawal
  if (fieldResponse.suggests_withdrawal || state.potency < 0.1) {
    return {
      response: "[Il sistema sceglie il ritiro]",
      meta: {
        withdrawal: true,
        domain: domain.id,
        dimension: dimension.id,
        potency: state.potency
      }
    };
  }

  // Generate response
  const result = await connector.generate(
    message,
    fieldResponse.natural_trajectory,
    state,
    { model: CONFIG.model }
  );

  // Store in history
  session.history.push({ role: 'user', content: message });
  session.history.push({ role: 'enoq', content: result.response });

  return {
    response: result.response,
    meta: {
      domain: domain.id,
      dimension: dimension.id,
      function: func.id,
      potency: state.potency,
      v_mode: state.v_mode,
      cycle_count: state.cycle_count
    }
  };
}

// ============================================
// HTTP HANDLERS
// ============================================

function sendJSON(res: http.ServerResponse, data: object, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID'
  });
  res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, message: string, status = 400): void {
  sendJSON(res, { error: message }, status);
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID'
    });
    res.end();
    return;
  }

  // Routes
  try {
    // Health check - simple runtime state only
    if (path === '/healthz') {
      let dbStatus: 'ok' | 'degraded' | 'error' = 'ok';
      try {
        const store = getRegulatoryStore();
        store.getStats(); // Test DB access
      } catch {
        dbStatus = 'error';
      }

      const isHealthy = dbStatus === 'ok';

      sendJSON(res, {
        ok: isHealthy,
        version: '2.3.0',
        uptime: Math.floor(process.uptime()),
        db: dbStatus,
        detector_ready: true,
        axis_ready: true
      }, isHealthy ? 200 : 503);
      return;
    }

    // Legacy health endpoint (redirects to /healthz)
    if (path === '/health') {
      res.writeHead(301, { Location: '/healthz' });
      res.end();
      return;
    }

    // Root info
    if (path === '/' && method === 'GET') {
      sendJSON(res, {
        name: 'ENOQ-CORE',
        version: '2.2.0',
        description: 'Sistema Operativo Totale per l\'Esistenza Umana',
        endpoints: {
          'GET /': 'This info',
          'GET /health': 'Health check',
          'POST /session': 'Create new session',
          'POST /message': 'Send message (requires X-Session-ID header)',
          'GET /session/:id': 'Get session status',
          'DELETE /session/:id': 'End session'
        }
      });
      return;
    }

    // Create session
    if (path === '/session' && method === 'POST') {
      const session = createSession();
      sendJSON(res, {
        session_id: session.id,
        created_at: session.createdAt.toISOString()
      });
      return;
    }

    // Get session status
    if (path.startsWith('/session/') && method === 'GET') {
      const sessionId = path.replace('/session/', '');
      const session = getSession(sessionId);

      if (!session) {
        sendError(res, 'Session not found', 404);
        return;
      }

      sendJSON(res, {
        session_id: session.id,
        created_at: session.createdAt.toISOString(),
        last_activity: session.lastActivity.toISOString(),
        state: {
          domain: session.state.domain,
          dimension: session.state.dimension,
          potency: session.state.potency,
          v_mode: session.state.v_mode,
          cycle_count: session.state.cycle_count
        },
        history_length: session.history.length
      });
      return;
    }

    // Delete session
    if (path.startsWith('/session/') && method === 'DELETE') {
      const sessionId = path.replace('/session/', '');
      const deleted = sessions.delete(sessionId);

      sendJSON(res, { deleted }, deleted ? 200 : 404);
      return;
    }

    // Send message
    if (path === '/message' && method === 'POST') {
      // Get session from header
      const sessionId = req.headers['x-session-id'] as string;

      if (!sessionId) {
        sendError(res, 'X-Session-ID header required', 400);
        return;
      }

      let session = getSession(sessionId);
      if (!session) {
        // Auto-create session if not exists
        session = createSession(sessionId);
      }

      // Read body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      let data: { message?: string };
      try {
        data = JSON.parse(body);
      } catch {
        sendError(res, 'Invalid JSON body', 400);
        return;
      }

      if (!data.message || typeof data.message !== 'string') {
        sendError(res, 'message field required', 400);
        return;
      }

      const result = await processMessage(session, data.message);

      sendJSON(res, {
        session_id: session.id,
        ...result
      });
      return;
    }

    // 404
    sendError(res, 'Not found', 404);

  } catch (error) {
    console.error('Request error:', error);
    sendError(res, 'Internal server error', 500);
  }
}

// ============================================
// SERVER STARTUP
// ============================================

const server = http.createServer(handleRequest);

// Graceful shutdown
function shutdown(): void {
  console.log('\nShutting down ENOQ server...');

  server.close(() => {
    console.log('HTTP server closed');

    // Close regulatory store
    const store = getRegulatoryStore();
    store.close();
    console.log('Regulatory store closed');

    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(CONFIG.port, CONFIG.host, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ███████╗███╗   ██╗ ██████╗  ██████╗                                     ║
║   ██╔════╝████╗  ██║██╔═══██╗██╔═══██╗                                    ║
║   █████╗  ██╔██╗ ██║██║   ██║██║   ██║                                    ║
║   ██╔══╝  ██║╚██╗██║██║   ██║██║▄▄ ██║                                    ║
║   ███████╗██║ ╚████║╚██████╔╝╚██████╔╝                                    ║
║   ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚══▀▀═╝                                     ║
║                                                                           ║
║   HTTP Server                                                             ║
║   Listening on http://${CONFIG.host}:${CONFIG.port}                                       ║
║                                                                           ║
║   Endpoints:                                                              ║
║     GET  /health     - Health check                                       ║
║     POST /session    - Create session                                     ║
║     POST /message    - Send message                                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);
});
