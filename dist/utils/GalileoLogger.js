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
    constructor() {
        console.log('[DEBUG] Initializing GalileoLogger with:', environment_1.env.galileo.projectName, environment_1.env.galileo.logStream);
        this.logger = new galileo_1.GalileoLogger({
            projectName: environment_1.env.galileo.projectName,
            logStreamName: environment_1.env.galileo.logStream,
        }); // <-- This bypasses the type check
    }
    /**
     * Log a single agent execution to Galileo, including workflow and LLM spans.
     * @param metrics Agent execution metrics
     * @param input User input
     * @param output Agent output
     * @param metadata Optional additional metadata
     */
    async logAgentExecution(metrics, input, output, metadata) {
        try {
            // Start a new trace for the agent execution
            const trace = this.logger.startTrace({
                input,
                output,
                name: 'Agent Execution',
                createdAt: Date.now() * 1000000, // nanoseconds
                metadata: metadata ? Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)])) : undefined,
                tags: ['agent', 'stripe'],
            });
            // Add a workflow span for the agent's workflow
            this.logger.addWorkflowSpan({
                input,
                output,
                name: 'Agent Workflow',
                createdAt: Date.now() * 1000000,
                metadata: Object.fromEntries(Object.entries({ ...(metadata || {}), executionTime: String(metrics.executionTime), toolsUsed: (metrics.toolsUsed || []).join(',') }).map(([k, v]) => [k, String(v)])),
                tags: ['workflow'],
            });
            // Add an LLM span for the agent's LLM interaction
            if (input && output) {
                this.logger.addLlmSpan({
                    input: [{ role: 'user', content: input }],
                    output: { role: 'assistant', content: output },
                    model: 'gpt-4o', // You may want to make this dynamic
                    name: 'Agent LLM Completion',
                    durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
                    metadata: { temperature: '0.1' },
                    tags: ['llm', 'chat'],
                });
            }
            // Conclude the workflow span
            this.logger.conclude({
                output: 'Workflow completed successfully',
                durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
            });
            // Conclude the trace
            this.logger.conclude({
                output: 'Final trace output with all spans completed',
                durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
            });
            // Upload the traces to Galileo
            await this.logger.flush();
        }
        catch (error) {
            console.error('Failed to log to Galileo:', error);
        }
    }
    /**
     * Log a full conversation to Galileo as a trace with workflow spans for each message.
     * @param messages Array of AgentMessage objects
     */
    async logConversation(messages) {
        try {
            const trace = this.logger.startTrace({
                input: 'Conversation',
                output: '',
                name: 'Conversation Log',
                createdAt: Date.now() * 1000000,
                tags: ['conversation'],
            });
            messages.forEach(msg => {
                this.logger.addWorkflowSpan({
                    input: msg.content,
                    output: '',
                    name: `Message (${msg.role})`,
                    createdAt: new Date(msg.timestamp).getTime() * 1000000,
                    tags: ['message', msg.role],
                });
            });
            this.logger.conclude({
                output: 'Conversation log complete',
                durationNs: 0,
            });
            await this.logger.flush();
        }
        catch (error) {
            console.error('Failed to log conversation to Galileo:', error);
        }
    }
}
exports.GalileoAgentLogger = GalileoAgentLogger;
//# sourceMappingURL=GalileoLogger.js.map