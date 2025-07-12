import { StripeAgent } from './agents/StripeAgent';
import { GalileoAgentLogger } from './utils/GalileoLogger';
import { env } from './config/environment';

async function main() {
  console.log('🚀 Starting Stripe Agent with Galileo Integration...');
  console.log(`📊 Project: ${env.galileo.projectName}`);
  console.log(`📈 Log Stream: ${env.galileo.logStream}`);
  console.log('---');

  try {
    // Initialize the agent
    const agent = new StripeAgent();
    const galileoLogger = new GalileoAgentLogger();

    // Example interactions
    const examples = [
      {
        description: "Create a payment link for a digital product",
        message: "Create a payment link for a digital course called 'TypeScript Mastery' priced at $99 USD"
      },
      {
        description: "Create a customer record",
        message: "Create a new customer with email john.doe@example.com and name John Doe"
      },
      {
        description: "List existing products",
        message: "Show me all the products in my Stripe account"
      },
      {
        description: "Create a subscription product",
        message: "Create a monthly subscription product called 'Premium Plan' for $29.99 USD"
      }
    ];

    console.log('🤖 Running example interactions...\n');

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
        } else {
          console.log(`❌ Agent Error: ${response.message}`);
          if (response.error) {
            console.log(`🐛 Technical Error: ${response.error}`);
          }
        }
      } catch (error) {
        console.error(`💥 Unexpected error in example ${i + 1}:`, error);
      }
      
      // Add a small delay between examples
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Log conversation history to Galileo
    console.log('\n📊 Logging conversation to Galileo...');
    const conversationHistory = agent.getConversationHistory();
    await galileoLogger.logConversation(conversationHistory);


    console.log('\n✨ Agent completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up your actual Stripe API keys in .env');
    console.log('2. Further customize the agent for your specific use case');
    console.log('4. Add additional evaluation metrics in Galileo');
    console.log('5. See what more you can do with Galileo');

    console.log('🏗️🔨👷‍♀️Happy building!');

  } catch (error) {
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