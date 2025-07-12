"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalileoAgentLogger = void 0;
const environment_1 = require("../config/environment");
const galileo_1 = require("galileo");
/**
 * Production-grade Galileo logging utility for agent executions and conversations.
 * Sends structured traces and spans to Galileo using the official SDK.
 */
class GalileoAgentLogger {
    logger;
    sessionId;
    constructor() {
        console.log('[DEBUG] Initializing GalileoLogger with:', environment_1.env.galileo.projectName, environment_1.env.galileo.logStream);
        this.logger = new galileo_1.GalileoLogger({
            projectName: environment_1.env.galileo.projectName,
            logStreamName: environment_1.env.galileo.logStream,
        }); // <-- This bypasses the type check
    }
    /**
     * Start a session for grouping multiple traces
     * @param sessionName Optional name for the session
     * @returns Session ID
     */
    async startSession(sessionName) {
        // Generate a session ID manually since SDK doesn't expose startSession yet
        this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
        console.log(`📊 Generated session ID: ${this.sessionId}`);
        return this.sessionId;
    }
    /**
     * Get the current session ID
     */
    getCurrentSessionId() {
        return this.sessionId;
    }
    /**
     * Log a single agent execution to Galileo as a trace with spans for tool calls.
     * @param metrics Agent execution metrics
     * @param input User input
     * @param output Agent output
     * @param traceName Optional name for the trace
     * @param metadata Optional additional metadata
     */
    async logAgentExecution(metrics, input, output, traceName, metadata) {
        try {
            // Start a new trace for the agent execution
            const trace = this.logger.startTrace({
                input,
                output,
                name: traceName || 'Agent Execution',
                createdAt: Date.now() * 1000000, // nanoseconds
                metadata: metadata ? Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)])) : undefined,
                tags: ['agent', 'stripe'],
            });
            // Add a workflow span for the agent's overall workflow
            this.logger.addWorkflowSpan({
                input,
                output,
                name: 'Agent Workflow',
                createdAt: Date.now() * 1000000,
                metadata: Object.fromEntries(Object.entries({
                    ...(metadata || {}),
                    executionTime: String(metrics.executionTime),
                    toolsUsed: (metrics.toolsUsed || []).join(','),
                    success: String(metrics.success)
                }).map(([k, v]) => [k, String(v)])),
                tags: ['workflow'],
            });
            // Add tool spans for each tool used
            if (metrics.toolsUsed && metrics.toolsUsed.length > 0) {
                metrics.toolsUsed.forEach((tool, index) => {
                    this.logger.addToolSpan({
                        input: `Tool: ${tool}`,
                        output: 'Tool executed successfully',
                        name: tool,
                        createdAt: Date.now() * 1000000,
                        metadata: { toolName: tool, stepNumber: String(index + 1) },
                        tags: ['tool', 'stripe'],
                    });
                });
            }
            // Add an LLM span for the agent's LLM interaction
            this.logger.addLlmSpan({
                input: [{ role: 'user', content: input }],
                output: { role: 'assistant', content: output },
                model: 'gpt-4o-mini', // Match your actual model
                name: 'Agent LLM Completion',
                durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
                metadata: {
                    temperature: '0.1',
                    success: String(metrics.success),
                    errorType: metrics.errorType || 'none'
                },
                tags: ['llm', 'chat'],
                statusCode: metrics.success ? 200 : 500,
            });
            // Conclude the workflow span
            if (typeof this.logger.conclude === 'function') {
                this.logger.conclude({
                    output: metrics.success ? 'Workflow completed successfully' : 'Workflow failed',
                    durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
                    statusCode: metrics.success ? 200 : 500,
                });
            }
            // Conclude the trace to complete this agent execution
            if (typeof this.logger.conclude === 'function') {
                this.logger.conclude({
                    output: output,
                    durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
                    statusCode: metrics.success ? 200 : 500,
                });
            }
            // Flush this individual trace
            await this.logger.flush();
        }
        catch (error) {
            console.error('Failed to log to Galileo:', error);
        }
    }
    /**
     * Log session completion - just a simple log message, no additional traces
     * @param messages Array of AgentMessage objects
     */
    async logConversation(messages) {
        try {
            console.log(`📊 Session completed with ${messages.length} total messages:`);
            // Log a summary to console instead of creating another trace
            messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. [${msg.role}] ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
            });
            console.log(`📋 All ${messages.length} interactions have been logged as individual traces to Galileo.`);
        }
        catch (error) {
            console.error('Failed to log conversation summary:', error);
        }
    }
    /**
     * Flush all pending traces to Galileo
     */
    async flushTraces() {
        try {
            console.log('Flushing traces...');
            await this.logger.flush();
            console.log('Successfully flushed traces.');
        }
        catch (error) {
            console.error('Failed to flush traces to Galileo:', error);
        }
    }
    /**
     * Terminate the current session and ensure all traces are flushed
     */
    async concludeSession() {
        try {
            console.log('📊 Concluding session and flushing any remaining traces...');
            // Just flush any remaining traces - individual traces are already concluded
            await this.flushTraces();
            // Clear the session
            this.sessionId = undefined;
            console.log('✅ Session concluded successfully');
        }
        catch (error) {
            console.error('Failed to conclude session:', error);
        }
    }
}
exports.GalileoAgentLogger = GalileoAgentLogger;
//# sourceMappingURL=GalileoLogger.js.map