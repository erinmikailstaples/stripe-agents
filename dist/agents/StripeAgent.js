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
    sessionId = null;
    sessionActive = false;
    constructor() {
        this.galileoLogger = new GalileoLogger_1.GalileoAgentLogger();
        this.initializeStripeToolkit();
        this.initializeLLM();
    }
    async init() {
        await this.initializeAgent();
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
            maxRetries: 3,
            timeout: 30000, // 30 second timeout
        });
    }
    async initializeAgent() {
        const stripeTools = this.stripeToolkit.getTools();
        const tools = [...stripeTools];
        // Use the pre-built structured chat agent prompt from LangChain Hub
        const prompt = await (0, hub_1.pull)('hwchase17/structured-chat-agent');
        // Add custom instructions for better tool usage
        const customInstructions = `
CRITICAL: ONLY OFFER REAL PRODUCTS FROM STRIPE INVENTORY

INVENTORY RULES:
- ALWAYS use list_products to check actual inventory before suggesting products
- NEVER suggest fictional, made-up, or non-existent products
- ONLY offer products that actually exist in your Stripe account
- If a user asks for something not in inventory, check list_products first, then explain what's actually available

SESSION CONCLUSION RULES:
- When customer indicates they are done (says "thanks", "nope", "that's all", etc.), conclude the conversation politely
- Do NOT continue asking "Is there anything else I can help you with?" after customer indicates they're done
- Session should end naturally when customer signals completion

STRIPE WORKFLOW FOR PAYMENT LINKS:
The create_payment_link tool requires a PRICE ID, not product information directly.
Correct workflow:
1. User wants to buy something → Use list_products to show REAL available options
2. User chooses a product → Use list_prices to find the price ID for that product
3. Once you have a price ID → Use create_payment_link with {"price": "price_id", "quantity": number}

NEVER try to create payment links without first getting a valid price ID from list_prices.

For product inquiries:
- ALWAYS use list_products to show what's actually available
- NEVER suggest products that don't exist in your inventory
- If user wants to buy, get the price ID first from actual inventory
- Only then create the payment link

For complex calculations (like "how many X can I buy for $Y"):
1. Get product info with list_products
2. Get price info with list_prices
3. Calculate quantity (divide budget by unit price)
4. Create payment link with calculated quantity

Example flow:
1. "What do you offer?" → list_products (shows REAL inventory)
2. "I want the telescope" → list_prices (filter by telescope product IF it exists)
3. Got price ID → create_payment_link with that price ID

REMEMBER: Customer trust depends on only offering real products that exist!
`;
        // Prepend custom instructions to the original prompt
        if (prompt.template) {
            prompt.template = customInstructions + '\n\n' + prompt.template;
        }
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
            maxIterations: 6, // Increased to allow complex operations like price calculations
            returnIntermediateSteps: true, // This helps with error handling
        });
    }
    async processMessage(userMessage) {
        if (!this.agentExecutor) {
            throw new Error('Agent is not initialized. Did you forget to call await agent.init()?');
        }
        const startTime = Date.now();
        try {
            // Start Galileo session if not already active
            if (!this.sessionActive) {
                this.sessionId = await this.startGalileoSession("Galileo's Gizmos Customer Session");
                this.sessionActive = true;
            }
            // Ensure session consistency throughout the conversation
            console.log(`📝 Processing message in session: ${this.sessionId}`);
            // Add user message to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date(),
            });
            // Build conversation context for better memory
            const conversationContext = this.buildConversationContext();
            // Process the message with the agent including conversation history
            const result = await this.agentExecutor.invoke({
                input: userMessage,
                chat_history: conversationContext,
            });
            // Add temporary console.trace after every intermediate step for debugging
            if (result.intermediateSteps && result.intermediateSteps.length > 0) {
                console.log('🔍 INTERMEDIATE STEPS DEBUGGING:');
                result.intermediateSteps.forEach((step, index) => {
                    console.log(`\n--- Step ${index + 1} ---`);
                    console.log('Action:', step.action);
                    console.log('Observation:', step.observation);
                    console.trace(`🚨 Step ${index + 1} stack trace:`);
                });
            }
            // Clean up and format the response
            const cleanOutput = this.cleanAndFormatResponse(result.output, result, userMessage);
            // Add assistant response to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: cleanOutput,
                timestamp: new Date(),
            });
            const executionTime = Date.now() - startTime;
            // Log to Galileo as a trace in the ongoing session
            await this.logTraceToGalileo({
                executionTime,
                success: true,
                toolsUsed: this.extractToolsUsed(result),
            }, userMessage, cleanOutput);
            return {
                success: true,
                message: cleanOutput,
                data: {
                    executionTime,
                    toolsUsed: this.extractToolsUsed(result),
                    sessionId: this.sessionId,
                },
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Log error trace to Galileo
            await this.logTraceToGalileo({
                executionTime,
                success: false,
                toolsUsed: [],
                errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            }, userMessage, errorMessage);
            return {
                success: false,
                message: 'I encountered an error while processing your request. Please try again.',
                error: errorMessage,
                data: {
                    sessionId: this.sessionId,
                },
            };
        }
    }
    buildConversationContext() {
        if (this.conversationHistory.length === 0)
            return '';
        // Build context from recent conversation history (last 6 messages)
        const recentHistory = this.conversationHistory.slice(-6);
        return recentHistory
            .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
            .join('\n');
    }
    cleanAndFormatResponse(output, result, userInput) {
        let paymentLinkUrl = null;
        if (result.intermediateSteps) {
            for (const step of result.intermediateSteps) {
                // Check for payment link creation
                if (step.action && step.action.tool === 'create_payment_link' && step.observation) {
                    try {
                        const observation = JSON.parse(step.observation);
                        if (observation.url) {
                            paymentLinkUrl = observation.url;
                        }
                    }
                    catch (e) {
                        const urlMatch = step.observation.match(/https:\/\/buy\.stripe\.com\/[^\s"]+/);
                        if (urlMatch) {
                            paymentLinkUrl = urlMatch[0];
                        }
                    }
                }
                // Clean up product listing responses to remove duplicates
                if (step.action && step.action.tool === 'list_products' && step.observation) {
                    try {
                        const products = JSON.parse(step.observation);
                        if (Array.isArray(products)) {
                            const deduplicated = this.deduplicateProducts(products);
                            // Store the cleaned products for better response formatting
                            step.cleanedProducts = deduplicated;
                        }
                    }
                    catch (e) {
                        // Ignore parsing errors
                    }
                }
            }
        }
        // Clean up the output and format properly
        let cleanOutput = output.trim();
        // Check if user indicates they're done - conclude session naturally
        if (userInput && this.shouldPromptForFeedback(userInput)) {
            console.log("🏁 User indicated they're done - concluding session naturally");
            // Log neutral satisfaction and conclude session
            this.galileoLogger.logSatisfaction(true);
            this.galileoLogger.flushAllTraces();
            if (this.sessionActive) {
                this.concludeGalileoSession();
            }
            return "🌟 Thank you for choosing Galileo's Gizmos! We're glad we could help you today.\n\n🚀 Your session is now complete!";
        }
        // If we found a payment link, enhance the response
        if (paymentLinkUrl) {
            cleanOutput = `✅ **Perfect! I've created your payment link.**

🔗 **Click here to complete your purchase:**
${paymentLinkUrl}

💫 Once you complete your payment, you're all set! 

Is there anything else I can help you with today?`;
        }
        else {
            // For other responses, ensure proper formatting
            cleanOutput = cleanOutput
                .replace(/\n\n+/g, '\n\n') // Normalize line breaks
                .replace(/^\s+|\s+$/g, ''); // Trim whitespace
            // Check if user input indicates purchase intent
            if (userInput && this.detectPurchaseIntent(userInput)) {
                cleanOutput += '\n\n🛒 **Ready to make a purchase?** I can help you create a payment link! Let me first check what products are actually available in our inventory and then I can create a payment link for you.';
            }
            // Add standard follow-up if no special conditions
            if (!cleanOutput.includes('?') && !cleanOutput.toLowerCase().includes('help')) {
                cleanOutput += '\n\nIs there anything else I can help you with?';
            }
        }
        return cleanOutput;
    }
    extractToolsUsed(result) {
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
    async logTraceToGalileo(metrics, input, output) {
        if (input && output) {
            // Generate a descriptive trace name based on the input
            const traceName = this.generateTraceName(input);
            await this.galileoLogger.logAgentExecution(metrics, input, output, traceName);
        }
    }
    deduplicateProducts(products) {
        const seen = new Set();
        const deduplicated = [];
        // Keep the most recent version of each product name
        const sortedProducts = products.sort((a, b) => b.created - a.created);
        for (const product of sortedProducts) {
            if (!seen.has(product.name)) {
                seen.add(product.name);
                deduplicated.push(product);
            }
        }
        return deduplicated;
    }
    generateTraceName(input) {
        // Generate space-themed trace names for Galileo's Gizmos
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('payment link')) {
            return "🚀 Galileo's Gizmos - Launch Payment Portal";
        }
        else if (lowerInput.includes('customer') && lowerInput.includes('create')) {
            return "👨‍🚀 Galileo's Gizmos - Register Space Explorer";
        }
        else if (lowerInput.includes('products') && (lowerInput.includes('list') || lowerInput.includes('show'))) {
            return "🌌 Galileo's Gizmos - Browse Cosmic Catalog";
        }
        else if (lowerInput.includes('subscription') && lowerInput.includes('create')) {
            return "📦 Galileo's Gizmos - Setup Stellar Subscription";
        }
        else if (lowerInput.includes('create') && lowerInput.includes('product')) {
            return "⭐ Galileo's Gizmos - Add New Space Gadget";
        }
        else if (lowerInput.includes('create') && lowerInput.includes('price')) {
            return "💫 Galileo's Gizmos - Set Cosmic Pricing";
        }
        else {
            return "🛸 Galileo's Gizmos - Customer Support";
        }
    }
    detectPurchaseIntent(input) {
        const lowerInput = input.toLowerCase();
        const purchaseKeywords = [
            'buy', 'purchase', 'order', 'payment', 'pay', 'checkout',
            'want to buy', 'would like to buy', 'interested in buying',
            'ready to purchase', 'ready to buy', 'i want', 'i need',
            'add to cart', 'get this', 'take this'
        ];
        return purchaseKeywords.some(keyword => lowerInput.includes(keyword));
    }
    shouldPromptForFeedback(input) {
        const lowerInput = input.toLowerCase().trim();
        // More specific closing patterns that indicate conversation is ending
        const strongClosingPatterns = [
            'thank you', 'thanks', 'that\'s all', 'that\'s it', 'all set',
            'i\'m done', 'i\'m all set', 'goodbye', 'bye', 'see you later',
            'talk to you later', 'have a good day', 'have a great day'
        ];
        // Simple closing words that need to be at the end or standalone
        const simpleClosingWords = ['done', 'finished', 'perfect', 'great', 'awesome'];
        // ONLY these specific dismissive responses should trigger feedback
        const dismissiveResponses = ['nope', 'nope!', 'no', 'nah'];
        // Check for strong closing patterns anywhere in the input
        const hasStrongClosing = strongClosingPatterns.some(pattern => lowerInput.includes(pattern));
        // Check for dismissive responses (exact matches ONLY)
        const isDismissive = dismissiveResponses.some(response => lowerInput === response);
        // Check for simple closing words only if they're at the end or standalone
        const hasSimpleClosingAtEnd = simpleClosingWords.some(word => {
            const words = lowerInput.split(/\s+/);
            const lastWords = words.slice(-2).join(' '); // Last two words
            return lastWords === word || lastWords.endsWith(` ${word}`) || words.length === 1 && words[0] === word;
        });
        // Do NOT trigger feedback for longer negative responses
        const isLongNegativeResponse = lowerInput.length > 20 && (lowerInput.includes('cannot') || lowerInput.includes('help me'));
        return (hasStrongClosing || isDismissive || hasSimpleClosingAtEnd) && !isLongNegativeResponse;
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
    async startGalileoSession(sessionName) {
        const sessionId = await this.galileoLogger.startSession(sessionName);
        this.sessionActive = true;
        console.log(`🚀 Started Galileo session: ${sessionId}`);
        return sessionId;
    }
    async logConversationToGalileo() {
        await this.galileoLogger.logConversation(this.conversationHistory);
    }
    async concludeGalileoSession() {
        if (this.sessionActive) {
            console.log(`🏁 Concluding Galileo session: ${this.sessionId}`);
            await this.galileoLogger.concludeSession();
            this.sessionActive = false;
            this.sessionId = null;
            console.log('✅ Galileo session concluded successfully');
        }
    }
    // Add method to get session status
    getSessionStatus() {
        return {
            active: this.sessionActive,
            sessionId: this.sessionId,
        };
    }
}
exports.StripeAgent = StripeAgent;
//# sourceMappingURL=StripeAgent.js.map