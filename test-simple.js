const { StripeAgent } = require('./dist/agents/StripeAgent');
const { GalileoAgentLogger } = require('./dist/utils/GalileoLogger');

async function testEnhancedLogging() {
  console.log('🚀 Testing Enhanced Galileo Logging...');
  
  try {
    const agent = new StripeAgent();
    const logger = new GalileoAgentLogger();
    
    // Start a test session
    await logger.startSession('Enhanced Logging Test');
    
    // Test creating a customer
    console.log('\n📝 Test 1: Creating a customer');
    const customerResponse = await agent.processMessage("Create a customer with email test@example.com and name Test User");
    
    if (customerResponse.success) {
      console.log(`✅ ${customerResponse.message}`);
      console.log(`🔧 Tools: ${customerResponse.data?.toolsUsed?.join(', ') || 'None'}`);
    }
    
    // Test listing products
    console.log('\n📝 Test 2: Listing products');
    const productsResponse = await agent.processMessage("Show me the first 3 products");
    
    if (productsResponse.success) {
      console.log(`✅ ${productsResponse.message}`);
      console.log(`🔧 Tools: ${productsResponse.data?.toolsUsed?.join(', ') || 'None'}`);
    }
    
    // Get conversation and log it
    const conversation = agent.getConversationHistory();
    console.log(`\n📊 Logging ${conversation.length} messages to Galileo...`);
    await logger.logConversation(conversation);
    
    // Conclude session
    await logger.concludeSession();
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testEnhancedLogging();
