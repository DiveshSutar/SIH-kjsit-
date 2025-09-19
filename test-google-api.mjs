import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGoogleAPI() {
  // Test the fallback API key from the reference repository
  const API_KEY = 'AIzaSyD9qs4O_R3CoSOLcbQTAKQXwN8wn1WAmqM';
  
  console.log('Testing Google Gemini API...');
  console.log('API Key (first 20 chars):', API_KEY.substring(0, 20) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = "Extract patient info and lab values from this medical report: Patient: John Doe, Hemoglobin: 12.5 g/dL. Return as JSON.";
    
    console.log('Sending test request...');
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('✅ API call successful!');
    console.log('Response:', response.substring(0, 200) + '...');
    
  } catch (error) {
    console.log('❌ API call failed:');
    console.log('Error:', error.message);
    if (error.status) {
      console.log('Status:', error.status);
    }
  }
}

testGoogleAPI();