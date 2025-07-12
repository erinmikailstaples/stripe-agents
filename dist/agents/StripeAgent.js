"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeAgent = void 0;
const langchain_1 = require("@stripe/agent-toolkit/langchain");
const openai_1 = require("@langchain/openai");
const agents_1 = require("langchain/agents");
const hub_1 = require("langchain/hub");
const environment_1 = require("../config/environment");
const GalileoLogger_1 = require("../utils/GalileoLogger");
class StripeAgent {
    stripeToolkit;
    llm;
    agentExecutor;
    conversationHistory = [];
    galileoLogger;
    constructor() {
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
        // Use the pre-built structured chat agent prompt from LangChain Hub
        const prompt = await (0, hub_1.pull)('hwchase17/structured-chat-agent');
        // @ts-ignore
        const agent = await (0, agents_1.createStructuredChatAgent)({
            llm: this.llm,
            tools,
            prompt,
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
            // Process the message with the agent - let LangChain handle agent_scratchpad
            const result = await this.agentExecutor.invoke({
                input: userMessage,
            });
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
        if (input && output) {
            // Generate a descriptive trace name based on the input
            const traceName = this.generateTraceName(input);
            await this.galileoLogger.logAgentExecution(metrics, input, output, traceName);
        }
    }
    generateTraceName(input) {
        // Generate meaningful trace names based on user input
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('payment link')) {
            return 'Create Payment Link';
        }
        else if (lowerInput.includes('customer') && lowerInput.includes('create')) {
            return 'Create Customer';
        }
        else if (lowerInput.includes('products') && (lowerInput.includes('list') || lowerInput.includes('show'))) {
            return 'List Products';
        }
        else if (lowerInput.includes('subscription') && lowerInput.includes('create')) {
            return 'Create Subscription Product';
        }
        else if (lowerInput.includes('create') && lowerInput.includes('product')) {
            return 'Create Product';
        }
        else if (lowerInput.includes('create') && lowerInput.includes('price')) {
            return 'Create Price';
        }
        else {
            return 'Agent Interaction';
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