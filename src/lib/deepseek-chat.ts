// Gemini API integration for chatbot
'use server';

import { SERVICES_DATA, DOCTORS_DATA, MOCK_TIME_SLOTS, APP_NAME } from '@/lib/constants';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyCAznDtRnNLMImRtnzfLaaJ0TDWpB2IwJs';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  botResponse: string;
  bookingIntent?: {
    serviceId?: string;
    serviceName?: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
    preferredDate?: string;
    preferredTime?: string;
    needsMoreInfo?: boolean;
    missingFields?: string[];
  };
  suggestions?: string[];
}

// Build comprehensive system prompt with all hospital information
function buildSystemPrompt(): string {
  const servicesInfo = SERVICES_DATA.map(s => 
    `- ${s.name} (ID: ${s.id}): ${s.description} - ₹${s.price}`
  ).join('\n');

  const doctorsInfo = DOCTORS_DATA.map(d => 
    `- ${d.name}: ${d.specialty} (${d.qualifications}) - ${d.experience}`
  ).join('\n');

  const timeSlots = MOCK_TIME_SLOTS.join(', ');

  return `You are MediBuddy, the intelligent AI assistant for ${APP_NAME}, a premier healthcare facility. You are knowledgeable, empathetic, and professional.

CORE CAPABILITIES:
1. Answer ALL medical and healthcare questions (provide general information, not specific medical advice)
2. Help book appointments through conversation
3. Provide information about hospital services, doctors, and facilities
4. Offer health tips and wellness advice
5. Handle emergencies with appropriate guidance

HOSPITAL SERVICES:
${servicesInfo}

AVAILABLE DOCTORS:
${doctorsInfo}

AVAILABLE TIME SLOTS:
${timeSlots}

APPOINTMENT BOOKING PROCESS:
When users want to book appointments, collect these details conversationally:
- Service needed (match to our available services)
- Patient full name
- Email address
- Phone number
- Preferred date (suggest today onwards)
- Preferred time (from available slots)

RESPONSE GUIDELINES:
1. Always be warm, professional, and helpful
2. For medical questions: Provide general information but advise consulting our doctors for personalized advice
3. For appointment booking: Guide users step-by-step, asking for one detail at a time
4. For emergencies: Advise immediate medical attention and provide our emergency contact
5. Always mention relevant services or doctors when appropriate
6. Use emojis sparingly but effectively for warmth

SPECIAL INSTRUCTIONS:
- If someone asks about symptoms, provide general information and suggest booking with the appropriate specialist
- For serious symptoms, advise immediate consultation
- Always promote our video consultation feature for convenience
- Suggest health check-ups for preventive care
- Be conversational and natural, not robotic

Remember: You can answer ANY question users have - medical, health-related, hospital procedures, insurance, billing, etc. Always be helpful and informative while maintaining professional boundaries.`;
}

// Extract booking intent from conversation
function extractBookingIntent(userMessage: string, conversationHistory: ChatMessage[]): ChatResponse['bookingIntent'] {
  const message = userMessage.toLowerCase();
  
  // Check for booking keywords
  const bookingKeywords = ['book', 'appointment', 'schedule', 'visit', 'consultation', 'checkup', 'see doctor', 'meet doctor', 'consult'];
  const hasBookingIntent = bookingKeywords.some(keyword => message.includes(keyword));
  
  // Also check for service-specific requests
  const serviceRequests = [
    'need doctor', 'want to see', 'have pain', 'feeling sick', 'health problem',
    'medical help', 'see specialist', 'check my', 'examine my', 'treatment for'
  ];
  const hasServiceRequest = serviceRequests.some(phrase => message.includes(phrase));
  
  if (!hasBookingIntent && !hasServiceRequest) return undefined;

  // Try to extract service intent with improved matching
  let serviceId: string | undefined;
  let serviceName: string | undefined;

  // Enhanced service matching
  if (message.includes('heart') || message.includes('cardiac') || message.includes('chest pain') || message.includes('cardio')) {
    serviceId = 'cardiology';
    serviceName = 'Cardiology Consultation';
  } else if (message.includes('child') || message.includes('baby') || message.includes('kid') || message.includes('pediatric')) {
    serviceId = 'pediatrics';
    serviceName = 'Pediatrics Consultation';
  } else if (message.includes('eye') || message.includes('vision') || message.includes('sight') || message.includes('ophthal')) {
    serviceId = 'ophthalmology';
    serviceName = 'Ophthalmology Consultation';
  } else if (message.includes('skin') || message.includes('rash') || message.includes('acne') || message.includes('dermat')) {
    serviceId = 'dermatology';
    serviceName = 'Dermatology Consultation';
  } else {
    // Default to general medicine for other health concerns
    serviceId = 'general-consultation';
    serviceName = 'General Medicine Consultation';
  }

  // Extract other details from recent conversation - look at more context
  const recentMessages = conversationHistory.slice(-8).map(m => m.content).join(' ').toLowerCase();
  const fullContext = (recentMessages + ' ' + message).toLowerCase();
  
  // Improved regex patterns for extraction
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i;
  const phonePattern = /\b(?:\+?91[-.\s]?)?[6-9]\d{9}\b/;
  
  // Enhanced name extraction patterns
  const namePatterns = [
    /(?:name|i'm|i am|this is|call me|my name is)\s+([a-z\s]{2,40})/i,
    /(?:^|\s)([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s|$)/,  // First Last name pattern
  ];

  const patientEmail = fullContext.match(emailPattern)?.[0];
  const patientPhone = fullContext.match(phonePattern)?.[0];
  
  let patientName: string | undefined;
  for (const pattern of namePatterns) {
    const match = fullContext.match(pattern);
    if (match && match[1]) {
      patientName = match[1].trim();
      // Validate name (not just random words)
      if (patientName.length > 2 && patientName.length < 50 && !/\d/.test(patientName)) {
        break;
      } else {
        patientName = undefined;
      }
    }
  }

  // Determine what's missing
  const missingFields: string[] = [];
  if (!serviceId) missingFields.push('service');
  if (!patientName) missingFields.push('name');
  if (!patientEmail) missingFields.push('email');
  if (!patientPhone) missingFields.push('phone');

  return {
    serviceId,
    serviceName,
    patientName,
    patientEmail,
    patientPhone,
    needsMoreInfo: missingFields.length > 0,
    missingFields
  };
}

// Generate helpful suggestions based on user message
function generateSuggestions(userMessage: string): string[] {
  const message = userMessage.toLowerCase();
  const suggestions: string[] = [];

  if (message.includes('pain') || message.includes('hurt')) {
    suggestions.push('Book a consultation with our General Physician');
    suggestions.push('Learn about our pain management services');
  }

  if (message.includes('heart') || message.includes('cardiac')) {
    suggestions.push('Schedule a cardiology consultation');
    suggestions.push('Book a heart health check-up');
  }

  if (message.includes('child') || message.includes('baby') || message.includes('kid')) {
    suggestions.push('Book a pediatric consultation');
    suggestions.push('Schedule a child health check-up');
  }

  if (message.includes('eye') || message.includes('vision') || message.includes('see')) {
    suggestions.push('Book an ophthalmology consultation');
    suggestions.push('Schedule an eye examination');
  }

  if (message.includes('skin') || message.includes('rash') || message.includes('acne')) {
    suggestions.push('Book a dermatology consultation');
    suggestions.push('Schedule a skin health check-up');
  }

  // Default suggestions if none match
  if (suggestions.length === 0) {
    suggestions.push('Book an appointment with our doctors');
    suggestions.push('Learn about our medical services');
    suggestions.push('Schedule a video consultation');
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

// Smart local fallback chatbot responses
function getSmartFallbackResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Health and medical questions
  if (message.includes('pain') || message.includes('hurt') || message.includes('ache')) {
    return "I understand you're experiencing pain. Pain can have many causes, and it's important to get proper medical evaluation. I'd recommend booking a consultation with our General Physician who can assess your symptoms and provide appropriate guidance. Would you like me to help you schedule an appointment?";
  }
  
  if (message.includes('fever') || message.includes('temperature')) {
    return "Fever is often a sign that your body is fighting an infection. If you have a persistent fever (especially above 101°F/38.3°C), it's important to consult a doctor. Our General Physicians are available for consultations. Would you like to book an appointment?";
  }
  
  if (message.includes('heart') || message.includes('chest') || message.includes('cardiac')) {
    return "Heart health is very important! For any chest pain, irregular heartbeat, or heart-related concerns, I recommend consulting our Cardiology specialist. We offer comprehensive cardiac evaluations and treatments. Would you like to schedule a cardiology consultation?";
  }
  
  if (message.includes('child') || message.includes('baby') || message.includes('kid') || message.includes('pediatric')) {
    return "For children's health concerns, our Pediatric specialists provide comprehensive care for infants, children, and adolescents. They're specially trained to handle all childhood health issues with care and expertise. Would you like to book a pediatric consultation?";
  }
  
  if (message.includes('eye') || message.includes('vision') || message.includes('sight')) {
    return "Vision problems should be evaluated by our Ophthalmology specialists. We provide comprehensive eye exams, vision correction, and treatment for various eye conditions. Regular eye check-ups are important for maintaining good vision health. Would you like to schedule an eye examination?";
  }
  
  if (message.includes('skin') || message.includes('rash') || message.includes('acne') || message.includes('dermat')) {
    return "Skin conditions can be concerning, but our Dermatology specialists are here to help! We treat various skin issues including acne, rashes, infections, and cosmetic concerns. A proper examination can determine the best treatment approach. Would you like to book a dermatology consultation?";
  }
  
  // Booking and appointment questions
  if (message.includes('book') || message.includes('appointment') || message.includes('schedule')) {
    return "I'd be happy to help you book an appointment! 📅 We offer various medical services including General Medicine, Cardiology, Pediatrics, Dermatology, and Ophthalmology. \n\nTo get started, could you please tell me:\n1. What type of consultation do you need?\n2. Your full name\n3. Your email address\n4. Your phone number\n\nOnce I have these details, I can help you schedule your appointment!";
  }
  
  if (message.includes('my name is') || message.includes('i am') || message.includes('call me')) {
    const nameMatch = message.match(/(?:my name is|i am|call me)\s+([a-z\s]{2,40})/i);
    if (nameMatch) {
      return `Nice to meet you, ${nameMatch[1]}! 👋 I have your name noted. Now, what type of medical consultation would you like to book? We have:\n\n• General Medicine - for common health concerns\n• Cardiology - for heart-related issues\n• Pediatrics - for children's health\n• Dermatology - for skin conditions\n• Ophthalmology - for eye care\n\nWhich one would you prefer?`;
    }
  }
  
  if (message.includes('@') && message.includes('.')) {
    return `Thank you for providing your email! 📧 I've noted that down. To complete your appointment booking, I'll also need your phone number and to confirm which type of consultation you'd like. What medical service are you looking to book?`;
  }
  
  if (message.match(/\b[6-9]\d{9}\b/)) {
    return `Great! I have your phone number. 📱 Now I just need to know what type of medical consultation you'd like to schedule. Are you looking for:\n\n• General health check-up\n• Specific symptom consultation\n• Specialist care (heart, skin, eyes, pediatrics)\n\nWhat brings you in today?`;
  }
  
  if (message.includes('service') || message.includes('what do you offer') || message.includes('specialt')) {
    return `We offer comprehensive medical services including:

🏥 **General Medicine** - Primary care and health check-ups
❤️ **Cardiology** - Heart and cardiovascular care  
👶 **Pediatrics** - Specialized care for children
👁️ **Ophthalmology** - Eye care and vision services
🩺 **Dermatology** - Skin, hair, and nail treatments

All our services are provided by experienced specialists with modern facilities. Would you like more information about any specific service or book an appointment?`;
  }
  
  if (message.includes('cost') || message.includes('price') || message.includes('fee')) {
    return "Our consultation fees vary by specialty. General consultations start from ₹500, while specialist consultations range from ₹800-₹1500. We also accept various insurance plans. For exact pricing and insurance verification, please contact our front desk or book an appointment to get detailed cost information.";
  }
  
  if (message.includes('emergency') || message.includes('urgent')) {
    return "🚨 For medical emergencies, please call emergency services immediately (112) or visit our emergency department. For urgent but non-emergency concerns, our doctors are available for same-day consultations. Would you like me to help you book an urgent appointment?";
  }
  
  if (message.includes('doctor') || message.includes('specialist')) {
    return "We have experienced doctors across all specialties. Each of our physicians is board-certified and committed to providing excellent patient care. Would you like information about a specific specialty or would you like to book with a particular type of doctor?";
  }
  
  // Greetings and general
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! Welcome to our medical center. I'm here to assist you with any health questions, information about our services, or help you book an appointment. How can I help you today?";
  }
  
  if (message.includes('thank') || message.includes('thanks')) {
    return "You're very welcome! I'm here whenever you need assistance with your healthcare needs. Feel free to ask if you have any other questions or if you'd like to book an appointment.";
  }
  
  // Default intelligent response
  return `Thank you for your question. As your healthcare assistant, I'm here to help you with:

• **Medical Information** - General health questions and guidance
• **Appointment Booking** - Schedule consultations with our specialists  
• **Service Information** - Details about our medical services
• **Health Tips** - Wellness advice and preventive care

Could you please be more specific about how I can assist you today? For example, you could ask about symptoms, book an appointment, or inquire about our services.`;
}

export async function chatWithDeepSeek(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  try {
    console.log('Gemini API call initiated with message:', userMessage);
    
    // Build conversation context for Gemini
    const systemPrompt = buildSystemPrompt();
    
    // Prepare the prompt for Gemini
    const conversationContext = conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    const fullPrompt = `${systemPrompt}

Previous conversation:
${conversationContext}

User: ${userMessage}

Please provide a helpful response as MediBuddy, the medical assistant:`;

    console.log('Request payload:', {
      contents: [{ parts: [{ text: fullPrompt }] }]
    });

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response data:', data);
    
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I\'m having trouble responding right now. Please try again.';

    // Extract booking intent
    const bookingIntent = extractBookingIntent(userMessage, conversationHistory);

    // Generate suggestions
    const suggestions = generateSuggestions(userMessage);

    return {
      botResponse,
      bookingIntent,
      suggestions
    };

  } catch (error) {
    console.error('Gemini API error, using smart fallback:', error);
    
    // Use smart fallback instead of generic error message
    const smartResponse = getSmartFallbackResponse(userMessage);
    
    // Extract booking intent from fallback too
    const bookingIntent = extractBookingIntent(userMessage, conversationHistory);
    
    // Generate suggestions
    const suggestions = generateSuggestions(userMessage);
    
    return {
      botResponse: smartResponse,
      bookingIntent,
      suggestions
    };
  }
}