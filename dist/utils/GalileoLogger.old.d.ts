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
     * Generate a meaningful trace name from user input
     * @param input User input string
     * @returns Descriptive trace name
     */
    private generateTraceNameFromInput;
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
     * Helper function to safely convert any value to string for Galileo
     * @param value Any value to convert
     * @returns Safe string representation
     */
    private safeStringify;
    /**
     * Helper function to safely extract content from message
     * @param msg Message object
     * @returns Safe string content
     */
    private extractMessageContent;
    /**
     * Log session completion and create tool spans for conversation flow
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
//# sourceMappingURL=GalileoLogger.old.d.ts.map