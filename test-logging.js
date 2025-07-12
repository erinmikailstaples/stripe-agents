const { StripeAgent } = require('./dist/agents/StripeAgent');

async function testSingleInteraction() {
  console.log('🚀 Testing single interaction with enhanced logging...');
  
  try {
    const agent = new StripeAgent();
    
    // Test a simple payment link creation
    const response = await agent.processMessage("Create a payment link for a course called 'JavaScript Basics' priced at $29.99 USD");
    
    if (response.success) {
      console.log(`✅ Success: ${response.message}`);
      console.log(`⏱️  Execution time: ${response.data?.executionTime}ms`);
      console.log(`🔧 Tools used: ${response.data?.toolsUsed?.join(', ') || 'None'}`);
    } else {
      console.log(`❌ Error: ${response.message}`);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testSingleInteraction();
