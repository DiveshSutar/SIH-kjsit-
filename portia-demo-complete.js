/**
 * Comprehensive demo of the Portia Medical Report Analysis System
 * This demonstrates the multi-agent workflow for medical report analysis
 */

console.log('🏥 Portia Medical Report Analysis System Demo');
console.log('============================================\n');

// Check API key configuration
const openaiKey = process.env.OPENAI_API_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;
const geminiKey = process.env.GOOGLE_API_KEY;

console.log('📋 API Configuration Status:');
console.log(`OpenAI API Key: ${openaiKey ? '✅ Configured' : '❌ Not configured'}`);
console.log(`OpenRouter API Key: ${openrouterKey ? '✅ Configured' : '❌ Not configured'}`);
console.log(`Google Gemini API Key: ${geminiKey ? '✅ Configured' : '❌ Not configured'}`);

if (openrouterKey && openrouterKey.startsWith('sk-or-v1-') && openrouterKey.length > 20) {
  console.log('🎯 Primary AI: OpenRouter (Claude 3.5 Sonnet) - Recommended for medical analysis');
} else if (openaiKey && openaiKey.startsWith('sk-') && openaiKey.length > 20) {
  console.log('🎯 Primary AI: OpenAI GPT-4 (Recommended)');
} else if (geminiKey) {
  console.log('🎯 Primary AI: Google Gemini (Fallback)');
} else {
  console.log('⚠️  No AI service configured');
}

console.log('\n🔧 To configure OpenAI (recommended):');
console.log('1. Get your API key from https://platform.openai.com/api-keys');
console.log('2. Set environment variable: $env:OPENAI_API_KEY="your-real-api-key"');
console.log('3. Restart the development server');

console.log('\n📊 Sample Medical Report Analysis Workflow:');
console.log('===========================================');

// Simulate the Portia workflow
const sampleReport = `
PATIENT INFORMATION:
Name: Jane Smith
DOB: 03/15/1985
Gender: Female
Test Date: August 20, 2024

LABORATORY RESULTS:
Complete Blood Count (CBC):
- Hemoglobin: 11.2 g/dL (Reference: 12.0-15.5)
- Hematocrit: 34% (Reference: 36-44)
- White Blood Cells: 7.5 ×10³/μL (Reference: 4.5-11.0)
- Platelets: 280 ×10³/μL (Reference: 150-450)

Lipid Panel:
- Total Cholesterol: 245 mg/dL (Reference: <200)
- LDL Cholesterol: 165 mg/dL (Reference: <100)
- HDL Cholesterol: 45 mg/dL (Reference: >50 for women)
- Triglycerides: 180 mg/dL (Reference: <150)

Basic Metabolic Panel:
- Glucose: 98 mg/dL (Reference: 70-100)
- Creatinine: 0.9 mg/dL (Reference: 0.6-1.1)

Vitamins:
- Vitamin D: 22 ng/mL (Reference: 30-100)
- Vitamin B12: 350 pg/mL (Reference: 300-900)
`;

console.log('📄 Input Report:');
console.log(sampleReport);

console.log('\n🔄 Portia Analysis Steps:');
console.log('Step 1: ✅ Parse medical report text');
console.log('Step 2: ✅ Extract patient information');
console.log('       - Name: Jane Smith');
console.log('       - Age: 39 years old');
console.log('       - Gender: Female');
console.log('       - Test Date: August 20, 2024');

console.log('\nStep 3: ✅ Extract and analyze lab values');
const analyzedValues = [
  { name: 'Hemoglobin', value: 11.2, unit: 'g/dL', status: 'LOW', reference: '12.0-15.5' },
  { name: 'Hematocrit', value: 34, unit: '%', status: 'LOW', reference: '36-44' },
  { name: 'White Blood Cells', value: 7.5, unit: '×10³/μL', status: 'NORMAL', reference: '4.5-11.0' },
  { name: 'Total Cholesterol', value: 245, unit: 'mg/dL', status: 'HIGH', reference: '<200' },
  { name: 'LDL Cholesterol', value: 165, unit: 'mg/dL', status: 'HIGH', reference: '<100' },
  { name: 'HDL Cholesterol', value: 45, unit: 'mg/dL', status: 'LOW', reference: '>50' },
  { name: 'Triglycerides', value: 180, unit: 'mg/dL', status: 'HIGH', reference: '<150' },
  { name: 'Glucose', value: 98, unit: 'mg/dL', status: 'NORMAL', reference: '70-100' },
  { name: 'Vitamin D', value: 22, unit: 'ng/mL', status: 'LOW', reference: '30-100' },
];

analyzedValues.forEach((lab, index) => {
  const statusIcon = lab.status === 'NORMAL' ? '✅' : lab.status === 'HIGH' ? '🔺' : '🔻';
  console.log(`       ${index + 1}. ${lab.name}: ${lab.value} ${lab.unit} ${statusIcon} ${lab.status}`);
});

console.log('\nStep 4: ✅ Generate patient-friendly explanations');
console.log('🩺 Medical Report Summary for Jane Smith');
console.log('========================================');

console.log('\n📊 Test Results Overview:');
console.log(`✅ Normal values: 3 out of ${analyzedValues.length}`);
console.log(`🔺 High values: 3 out of ${analyzedValues.length}`);
console.log(`🔻 Low values: 3 out of ${analyzedValues.length}`);

console.log('\n⚠️  Values That Need Attention:');

console.log('\n🔻 LOW VALUES:');
console.log('• Hemoglobin (11.2 g/dL) - Below normal range');
console.log('  Simple explanation: This measures oxygen-carrying cells in your blood.');
console.log('  Your level is slightly low, which might indicate mild anemia.');

console.log('\n• Hematocrit (34%) - Below normal range');
console.log('  Simple explanation: This shows the percentage of red blood cells in your blood.');
console.log('  Low levels often go together with low hemoglobin.');

console.log('\n• Vitamin D (22 ng/mL) - Below normal range');
console.log('  Simple explanation: Vitamin D helps your body absorb calcium for strong bones.');
console.log('  Low levels are common and can usually be improved with supplements.');

console.log('\n🔺 HIGH VALUES:');
console.log('• Total Cholesterol (245 mg/dL) - Above recommended level');
console.log('  Simple explanation: This is the total amount of cholesterol in your blood.');
console.log('  High levels may increase risk of heart disease.');

console.log('\n• LDL Cholesterol (165 mg/dL) - Above recommended level');
console.log('  Simple explanation: This is "bad" cholesterol that can clog arteries.');
console.log('  Diet changes and exercise can help lower this.');

console.log('\n• Triglycerides (180 mg/dL) - Above normal range');
console.log('  Simple explanation: These are fats in your blood.');
console.log('  High levels can increase heart disease risk.');

console.log('\n✅ NORMAL VALUES:');
console.log('• White Blood Cells: Normal (good immune system function)');
console.log('• Glucose: Normal (good blood sugar control)');
console.log('• Creatinine: Normal (good kidney function)');

console.log('\nStep 5: ✅ Generate recommendations');
console.log('📋 General Recommendations:');
console.log('• Consider iron-rich foods for low hemoglobin (spinach, lean meat)');
console.log('• Vitamin D supplement may be beneficial');
console.log('• Heart-healthy diet to address cholesterol levels');
console.log('• Regular exercise can help with cholesterol and triglycerides');
console.log('• Follow up with your doctor for personalized advice');

console.log('\nStep 6: ✅ Add medical disclaimer');
console.log('🔒 Important Disclaimer:');
console.log('This analysis is for educational purposes only and is not medical advice.');
console.log('Please consult with your healthcare provider for proper diagnosis and treatment.');
console.log('Do not make any medical decisions based solely on this analysis.');

console.log('\n📤 Output Options Available:');
console.log('• 📄 Save as PDF report');
console.log('• 📧 Email to patient or doctor');
console.log('• 💾 Store in Google Drive');
console.log('• 📱 View on mobile-friendly dashboard');

console.log('\n🎯 Portia Workflow Completed Successfully!');
console.log('==========================================');

console.log('\n🔄 How to Use This System:');
console.log('1. Visit: http://localhost:3000/portia-medical-reports');
console.log('2. Upload a medical report (PDF, text, or CSV)');
console.log('3. Answer any clarification questions');
console.log('4. Get your patient-friendly analysis');
console.log('5. Choose output format (PDF, email, etc.)');

console.log('\n💡 Technical Details:');
console.log('• Multi-agent AI system using Portia framework');
console.log('• Supports OpenRouter (Claude 3.5 Sonnet), OpenAI GPT-4, and Google Gemini');
console.log('• OpenRouter provides access to multiple LLM providers');
console.log('• Comprehensive medical reference ranges database');
console.log('• HIPAA-friendly with no data storage');
console.log('• Rate limiting and security measures built-in');

if (!openrouterKey || !openrouterKey.startsWith('sk-or-v1-')) {
  console.log('\n⚡ To enable OpenRouter (best for medical analysis):');
  console.log('1. Get API key: https://openrouter.ai/keys');
  console.log('2. Set: $env:OPENROUTER_API_KEY="your-actual-openrouter-key"');
  console.log('3. Restart server: npm run dev');
  console.log('4. Test with real medical reports for best results');
}

if (!openaiKey || !openaiKey.startsWith('sk-')) {
  console.log('\n⚡ To enable OpenAI GPT-4 (alternative option):');
  console.log('1. Get API key: https://platform.openai.com/api-keys');
  console.log('2. Set: $env:OPENAI_API_KEY="your-actual-openai-key"');
  console.log('3. Restart server: npm run dev');
  console.log('4. Test again with real medical reports');
}

console.log('\n🏆 Demo completed! The system is ready for medical report analysis.');
