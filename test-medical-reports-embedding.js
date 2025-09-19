// Test embedding generation specifically for medical reports with dedicated API key
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

// Import the medical reports config to get the dedicated key
const fs = require('fs');
const path = require('path');

// Read the medical reports config file to extract the dedicated API key
const configPath = path.join(__dirname, 'src', 'lib', 'medical-reports-config.ts');
const configContent = fs.readFileSync(configPath, 'utf8');
const keyMatch = configContent.match(/HARDCODED_GOOGLE_API_KEY = '([^']+)'/);
const MEDICAL_REPORTS_API_KEY = keyMatch ? keyMatch[1] : null;

async function testMedicalReportsEmbedding() {
  try {
    console.log('🏥 Testing Medical Reports Embedding Generation...');
    console.log('Dedicated Medical Reports API Key:', MEDICAL_REPORTS_API_KEY ? MEDICAL_REPORTS_API_KEY.substring(0, 20) + '...' : 'Not found');

    if (!MEDICAL_REPORTS_API_KEY) {
      console.error('❌ Medical reports API key not found in config');
      return;
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: MEDICAL_REPORTS_API_KEY,
      modelName: 'embedding-001', // Gemini embedding model
    });

    console.log('Testing with sample medical text...');
    const testText = "Patient presents with chest pain and shortness of breath. Blood pressure 140/90 mmHg. Recommended further cardiac evaluation.";
    
    console.log('Generating embedding with dedicated medical reports key...');
    const embedding = await embeddings.embedQuery(testText);
    
    console.log('✅ Medical Reports Embedding generated successfully!');
    console.log('Embedding dimensions:', embedding.length);
    console.log('First 5 values:', embedding.slice(0, 5));
    
    if (embedding.length === 768) {
      console.log('🎉 Perfect! Medical reports embedding has correct 768 dimensions for Gemini.');
      console.log('📋 Medical report PDF uploads should now work!');
    } else {
      console.log('❌ Warning: Expected 768 dimensions, got:', embedding.length);
    }
    
  } catch (error) {
    console.error('❌ Error testing medical reports embedding:', error.message);
    if (error.message.includes('quota')) {
      console.log('💡 The dedicated medical reports API key has quota issues:');
      console.log('   1. Check billing and quota for the medical reports API key');
      console.log('   2. This key is specifically for medical document processing');
    }
  }
}

testMedicalReportsEmbedding();