import { AgentMetrics, AgentMessage } from '../types';
/**
 * Production-grade Galileo logging utility for agent executions and conversations.
 * Sends structured traces and spans to Galileo using the official SDK.
 */
export declare class GalileoAgentLogger {
    private logger;
    private sessionId?;
    constructor();
    /**
     * Start a session for grouping multiple traces
     * @param sessionName Optional name for the session
     * @returns Session ID
     */
    startSession(sessionName?: string): Promise<string>;
    /**
     * Get the current session ID
     */
    getCurrentSessionId(): string | undefined;
    /**
     * Log a single agent execution to Galileo as a trace with spans for tool calls.
     * @param metrics Agent execution metrics
     * @param input User input
     * @param output Agent output
     * @param traceName Optional name for the trace
     * @param metadata Optional additional metadata
     */
    logAgentExecution(metrics: AgentMetrics, input: string, output: string, traceName?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log session completion - just a simple log message, no additional traces
     * @param messages Array of AgentMessage objects
     */
    logConversation(messages: AgentMessage[]): Promise<void>;
    /**
     * Flush all pending traces to Galileo
     */
    flushTraces(): Promise<void>;
    /**
     * Terminate the current session and ensure all traces are flushed
     */
    concludeSession(): Promise<void>;
}
//# sourceMappingURL=GalileoLogger.d.ts.map