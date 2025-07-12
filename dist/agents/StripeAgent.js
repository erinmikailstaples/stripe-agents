"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeAgent = void 0;
const langchain_1 = require("@stripe/agent-toolkit/langchain");
const openai_1 = require("@langchain/openai");
const agents_1 = require("langchain/agents");
const prompts_1 = require("@langchain/core/prompts");
const environment_1 = require("../config/environment");
const GalileoLogger_1 = require("../utils/GalileoLogger");
class StripeAgent {
    stripeToolkit;
    llm;
    agentExecutor;
    conversationHistory = [];
    galileoLogger;
    agentScratchpad = []; // Track the scratchpad as an array
    constructor() {
        // Debug: Print Galileo environment variables at agent initialization
        console.log('[DEBUG] GALILEO_API_KEY:', environment_1.env.galileo.apiKey ? environment_1.env.galileo.apiKey.slice(0, 6) + '...' : 'undefined');
        console.log('[DEBUG] GALILEO_PROJECT:', environment_1.env.galileo.projectName);
        console.log('[DEBUG] GALILEO_LOG_STREAM:', environment_1.env.galileo.logStream);
        this.galileoLogger = new GalileoLogger_1.GalileoAgentLogger();
        this.initializeStripeToolkit();
        this.initializeLLM();
        this.initializeAgent();
    }
    initializeStripeToolkit() {
        this.stripeToolkit = new langchain_1.StripeAgentToolkit({
            secretKey: environment_1.env.stripe.secretKey,
            configuration: {
                actions: {
                    paymentLinks: {
                        create: true,
                    },
                    customers: {
                        create: true,
                        read: true,
                    },
                    products: {
                        create: true,
                        read: true,
                    },
                    prices: {
                        create: true,
                        read: true,
                    },
                    invoices: {
                        create: true,
                        update: true,
                    },
                },
            },
        });
    }
    initializeLLM() {
        this.llm = new openai_1.ChatOpenAI({
            openAIApiKey: environment_1.env.openai.apiKey,
            modelName: 'gpt-4o-mini',
            temperature: 0.1,
        });
    }
    async initializeAgent() {
        const tools = this.stripeToolkit.getTools();
        const prompt = prompts_1.ChatPromptTemplate.fromMessages([
            ['system', `You are ${environment_1.env.agent.name}, ${environment_1.env.agent.description}.
You have access to the following tools: {tool_names}
{tools}

You help users with Stripe payment operations including:
- Creating payment links for products
- Managing customers
- Creating and managing products and prices
- Handling invoices

Always be helpful, accurate, and secure when handling payment information.
If you're unsure about something, ask for clarification rather than making assumptions.

When creating payment links or handling money amounts, always confirm the details with the user first.`],
            ['human', '{input}'],
            new prompts_1.MessagesPlaceholder('agent_scratchpad'),
            // Optionally, you could add a static message here for testing:
            // ['assistant', 'Ready to help!'],
        ]);
        // TypeScript's type system cannot handle the deep generics in createStructuredChatAgent, but this is safe at runtime.
        // @ts-ignore
        const agent = await (0, agents_1.createStructuredChatAgent)({
            llm: this.llm,
            tools,
            prompt: prompt,
        });
        this.agentExecutor = new agents_1.AgentExecutor({
            agent,
            tools,
            verbose: true,
            maxIterations: 10,
        });
    }
    async processMessage(userMessage) {
        const startTime = Date.now();
        try {
            // Add user message to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date(),
            });
            // Always ensure agentScratchpad is an array
            if (!Array.isArray(this.agentScratchpad)) {
                this.agentScratchpad = [];
            }
            // Process the message with the agent
            const result = await this.agentExecutor.invoke({
                input: userMessage,
                agent_scratchpad: this.agentScratchpad,
            });
            // Update the scratchpad for the next turn (if present in result)
            if (Array.isArray(result.agent_scratchpad)) {
                this.agentScratchpad = result.agent_scratchpad;
            }
            else {
                this.agentScratchpad = [];
            }
            // Add assistant response to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: result.output,
                timestamp: new Date(),
            });
            const executionTime = Date.now() - startTime;
            // Log metrics to Galileo
            await this.logMetrics({
                executionTime,
                success: true,
                toolsUsed: this.extractToolsUsed(result),
            }, userMessage, result.output);
            return {
                success: true,
                message: result.output,
                data: {
                    executionTime,
                    toolsUsed: this.extractToolsUsed(result),
                },
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Log error metrics to Galileo
            await this.logMetrics({
                executionTime,
                success: false,
                toolsUsed: [],
                errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            }, userMessage, errorMessage);
            return {
                success: false,
                message: 'I encountered an error while processing your request. Please try again.',
                error: errorMessage,
            };
        }
    }
    extractToolsUsed(result) {
        // Extract tool names from the agent execution result
        // This is a simplified implementation
        const toolsUsed = [];
        if (result.intermediateSteps) {
            for (const step of result.intermediateSteps) {
                if (step.action && step.action.tool) {
                    toolsUsed.push(step.action.tool);
                }
            }
        }
        return toolsUsed;
    }
    async logMetrics(metrics, input, output) {
        // Debug: Print Galileo environment variables before logging
        console.log('[DEBUG] (logMetrics) GALILEO_API_KEY:', environment_1.env.galileo.apiKey ? environment_1.env.galileo.apiKey.slice(0, 6) + '...' : 'undefined');
        console.log('[DEBUG] (logMetrics) GALILEO_PROJECT:', environment_1.env.galileo.projectName);
        console.log('[DEBUG] (logMetrics) GALILEO_LOG_STREAM:', environment_1.env.galileo.logStream);
        if (input && output) {
            await this.galileoLogger.logAgentExecution(metrics, input, output);
        }
    }
    // Convenience methods for common operations
    async createPaymentLink(request) {
        const message = `Create a payment link for "${request.productName}" with amount ${request.amount} ${request.currency.toUpperCase()}`;
        return this.processMessage(message);
    }
    async createCustomer(request) {
        const message = `Create a new customer with email ${request.email}${request.name ? ` and name ${request.name}` : ''}`;
        return this.processMessage(message);
    }
    getConversationHistory() {
        return [...this.conversationHistory];
    }
    clearConversationHistory() {
        this.conversationHistory = [];
    }
}
exports.StripeAgent = StripeAgent;
//# sourceMappingURL=StripeAgent.js.map