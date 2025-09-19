// Test embedding generation with the new API key
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

// Load environment variables from process.env file
const fs = require('fs');
const path = require('path');

// Read process.env file
const envPath = path.join(__dirname, 'process.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
}

async function testEmbedding() {
  try {
    console.log('🧪 Testing Gemini embedding generation...');
    console.log('API Key:', process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 20) + '...' : 'Not found');

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: 'embedding-001', // Gemini embedding model
    });

    console.log('Testing with sample medical text...');
    const testText = "Patient presents with chest pain and shortness of breath. Blood pressure 140/90 mmHg. Recommended further cardiac evaluation.";
    
    console.log('Generating embedding...');
    const embedding = await embeddings.embedQuery(testText);
    
    console.log('✅ Embedding generated successfully!');
    console.log('Embedding dimensions:', embedding.length);
    console.log('First 5 values:', embedding.slice(0, 5));
    
    if (embedding.length === 768) {
      console.log('🎉 Perfect! Embedding has correct 768 dimensions for Gemini.');
    } else {
      console.log('❌ Warning: Expected 768 dimensions, got:', embedding.length);
    }
    
  } catch (error) {
    console.error('❌ Error testing embedding:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('💡 The API key appears to be invalid. Please check:');
      console.log('   1. API key is correctly set in process.env');
      console.log('   2. API key is valid for Google Generative AI');
      console.log('   3. Generative AI API is enabled in Google Cloud Console');
    }
  }
}

testEmbedding();