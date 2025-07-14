"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StripeAgent_1 = require("./agents/StripeAgent");
const GalileoLogger_1 = require("./utils/GalileoLogger");
const environment_1 = require("./config/environment");
async function main() {
    console.log('🚀 Starting Stripe Agent with Galileo Integration...');
    console.log(`📊 Project: ${environment_1.env.galileo.projectName}`);
    console.log(`📈 Log Stream: ${environment_1.env.galileo.logStream}`);
    console.log('---');
    try {
        // Initialize the agent
        const agent = new StripeAgent_1.StripeAgent();
        await agent.init(); // Ensure agent is fully initialized
        const galileoLogger = new GalileoLogger_1.GalileoAgentLogger();
        // Start a session for all example interactions
        const sessionId = await galileoLogger.startSession('Stripe Agent Demo Session');
        console.log(`📊 Started Galileo session: ${sessionId}`);
        // Example interactions for Galileo's Gizmos - Space-themed store
        const examples = [
            {
                description: "Create a payment link for a space gadget",
                message: "Hi! I'd like to create a payment link for our new 'Quantum Telescope Kit' - it's our premium stargazing package for $299.99 USD. Thanks!"
            },
            {
                description: "Create a customer record for an astronaut",
                message: "Please add a new customer to our system: Commander Sally Nebula, email sally.nebula@spacecorp.com"
            },
            {
                description: "List our space-themed products",
                message: "Can you show me what cool space products we have available in Galileo's Gizmos?"
            },
            {
                description: "Create a monthly space subscription box",
                message: "I want to set up our 'Cosmic Explorer Monthly Box' subscription service for $42.99 per month - it includes space snacks, astronaut gear, and stellar surprises!"
            }
        ];
        console.log('🤖 Running example interactions...\n');
        // Process each example as a separate trace within the session
        for (let i = 0; i < examples.length; i++) {
            const example = examples[i];
            console.log(`\n📝 Example ${i + 1}: ${example.description}`);
            console.log(`💬 User: ${example.message}`);
            try {
                const response = await agent.processMessage(example.message);
                if (response.success) {
                    console.log(`✅ Agent: ${response.message}`);
                    if (response.data) {
                        console.log(`⏱️  Execution time: ${response.data.executionTime}ms`);
                        console.log(`🔧 Tools used: ${response.data.toolsUsed.join(', ') || 'None'}`);
                    }
                }
                else {
                    console.log(`❌ Agent Error: ${response.message}`);
                    if (response.error) {
                        console.log(`🐛 Technical Error: ${response.error}`);
                    }
                }
            }
            catch (error) {
                console.error(`💥 Unexpected error in example ${i + 1}:`, error);
            }
            // Add a small delay between examples
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Log conversation summary to Galileo
        console.log('\n📊 Logging conversation to Galileo...');
        const conversationHistory = agent.getConversationHistory();
        await galileoLogger.logConversation(conversationHistory);
        // Conclude the session and flush all traces
        await galileoLogger.concludeSession();
        console.log('\n✨ Agent completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Set up your actual Stripe API keys in .env');
        console.log('2. Further customize the agent for your specific use case');
        console.log('4. Add additional evaluation metrics in Galileo');
        console.log('5. See what more you can do with Galileo');
        console.log('🏗️🔨👷‍♀️Happy building!');
    }
    catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n👋 Received SIGTERM, shutting down...');
    process.exit(0);
});
// Run the main function
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map