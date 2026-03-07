// Helper to emit events AND log to activities table in one call.
// Used by API routes after mutations.

import { eventBus, type MCEventType } from "./eventBus";

export function emitEvent(
  type: MCEventType,
  data: Record<string, unknown>
) {
  return eventBus.emit(type, data);
}

export function emitTaskUpdate(data: {
  taskId: string;
  action: string;
  [key: string]: unknown;
}) {
  return eventBus.emit("task_update", data);
}

export function emitAgentStatus(data: {
  agentId: string;
  status: string;
  [key: string]: unknown;
}) {
  return eventBus.emit("agent_status", data);
}

export function emitLogEntry(data: {
  agentId?: string;
  level: string;
  message: string;
  [key: string]: unknown;
}) {
  return eventBus.emit("log_entry", data);
}

export function emitNotification(data: {
  title: string;
  body?: string;
  type?: string;
  [key: string]: unknown;
}) {
  return eventBus.emit("notification", data);
}

export function emitAlertFired(data: {
  alertId: string;
  ruleId: string;
  severity: string;
  [key: string]: unknown;
}) {
  return eventBus.emit("alert_fired", data);
}

export function emitChatMessage(data: {
  messageId: string;
  agentId: string;
  sender: string;
  [key: string]: unknown;
}) {
  return eventBus.emit("chat_message", data);
}

export function emitTokenUpdate(data: {
  agentId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  [key: string]: unknown;
}) {
  return eventBus.emit("token_update", data);
}

export function emitPipelineProgress(data: {
  pipelineId: string;
  runId: string;
  status: string;
  [key: string]: unknown;
}) {
  return eventBus.emit("pipeline_progress", data);
}
