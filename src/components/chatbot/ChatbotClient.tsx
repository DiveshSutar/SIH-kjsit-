
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2, ExternalLink, Calendar, Phone, Lightbulb, CheckCircle, Clock } from 'lucide-react';
import { chatWithDeepSeek, ChatMessage, ChatResponse } from '@/lib/deepseek-chat';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME, SERVICES_DATA } from '@/lib/constants';
import { useAppointment } from '@/contexts/AppointmentContext';
import type { AppointmentFormData } from '@/types';


interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  bookingIntent?: ChatResponse['bookingIntent'];
}

export function ChatbotClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState<ChatResponse['bookingIntent'] | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { startNewAppointment, updateAppointmentData } = useAppointment();

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    const initialMessage: Message = {
      id: 'initial-greeting',
      sender: 'bot',
      text: `Hello! I'm MediBuddy, your intelligent AI assistant for ${APP_NAME}. 🏥

I can help you with:
• Medical questions and health information
• Booking appointments with our specialists
• Information about our services and doctors
• General wellness advice and tips
• Emergency guidance

What would you like to know today?`,
      timestamp: new Date(),
      suggestions: [
        'Book an appointment',
        'What services do you offer?',
        'I have a health question'
      ]
    };
    
    setMessages([initialMessage]);
    inputRef.current?.focus();
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleBookingProgress = async (bookingIntent: ChatResponse['bookingIntent']) => {
    if (!bookingIntent) return;

    // If we have all required info, proceed with booking
    if (!bookingIntent.needsMoreInfo && bookingIntent.serviceId) {
      const service = SERVICES_DATA.find(s => s.id === bookingIntent.serviceId);
      if (service && bookingIntent.patientName && bookingIntent.patientEmail) {
        try {
          // Update appointment context
          const appointmentData: Partial<AppointmentFormData> & { serviceId: string } = {
            serviceId: service.id,
            patientName: bookingIntent.patientName,
            patientEmail: bookingIntent.patientEmail,
            patientPhone: bookingIntent.patientPhone || '',
          };
          
          updateAppointmentData(appointmentData);
          startNewAppointment(service);
          
          // Show success message
          const successMessage: Message = {
            id: `booking-success-${Date.now()}`,
            sender: 'bot',
            text: `Perfect! I've prepared your appointment booking for ${service.name}. You'll now be redirected to complete the scheduling with date and time selection. ✅`,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, successMessage]);
          setBookingInProgress(null);
          
          // Redirect to booking page
          setTimeout(() => {
            router.push('/book-appointment');
          }, 2000);
          
          return;
        } catch (error) {
          console.error('Booking preparation error:', error);
          toast({
            variant: "destructive",
            title: "Booking Error",
            description: "There was an issue preparing your appointment. Please try again."
          });
        }
      }
    }
    
    // Store partial booking progress
    setBookingInProgress(bookingIntent);
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmedInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    // Update conversation history
    const newConversationHistory: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: trimmedInput }
    ];

    try {
      const response: ChatResponse = await chatWithDeepSeek(trimmedInput, conversationHistory);
      
      const newBotMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.botResponse,
        timestamp: new Date(),
        suggestions: response.suggestions,
        bookingIntent: response.bookingIntent
      };
      
      setMessages(prev => [...prev, newBotMessage]);
      
      // Update conversation history with bot response
      setConversationHistory([
        ...newConversationHistory,
        { role: 'assistant', content: response.botResponse }
      ]);

      // Handle booking intent
      if (response.bookingIntent) {
        await handleBookingProgress(response.bookingIntent);
      }

    } catch (error) {
      console.error("Error calling DeepSeek:", error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "I'm having trouble connecting right now. Please try again."
      });
      
      const errorBotMessage: Message = {
        id: `bot-error-${Date.now()}`,
        sender: 'bot',
        text: "I apologize, but I'm experiencing some technical difficulties. Please try asking your question again, or feel free to call our hospital directly for immediate assistance. 📞",
        timestamp: new Date(),
        suggestions: [
          'Try asking again',
          'Contact hospital directly',
          'View our services'
        ]
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px'; // Max height of 128px (8rem)
  };

  const renderBookingProgress = (bookingIntent: ChatResponse['bookingIntent']) => {
    if (!bookingIntent) return null;

    return (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Booking Progress</span>
        </div>
        
        <div className="space-y-1 text-xs">
          {bookingIntent.serviceName && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Service: {bookingIntent.serviceName}</span>
            </div>
          )}
          {bookingIntent.patientName && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Name: {bookingIntent.patientName}</span>
            </div>
          )}
          {bookingIntent.patientEmail && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Email: {bookingIntent.patientEmail}</span>
            </div>
          )}
          {bookingIntent.patientPhone && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Phone: {bookingIntent.patientPhone}</span>
            </div>
          )}
          
          {bookingIntent.missingFields && bookingIntent.missingFields.length > 0 && (
            <div className="mt-2 text-orange-600">
              <Clock className="h-3 w-3 inline mr-1" />
              Still need: {bookingIntent.missingFields.join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container py-8 md:py-12 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-2xl shadow-xl flex flex-col h-[75vh] min-h-[600px]">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-teal-50">
          <div className="flex items-center gap-3">
            <Avatar className="border-2 border-blue-200">
              <AvatarFallback className="bg-blue-100">
                <Bot className="h-6 w-6 text-blue-600" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-headline text-primary">MediBuddy</CardTitle>
              <CardDescription>Your Intelligent AI Healthcare Assistant</CardDescription>
            </div>
            <div className="ml-auto">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Enhanced with DeepSeek AI
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className={`flex items-end gap-2 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    {msg.sender === 'bot' && (
                      <Avatar className="h-8 w-8 border border-blue-200">
                        <AvatarFallback className="bg-blue-50">
                          <Bot className="h-5 w-5 text-blue-600" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-50 text-gray-800 border border-gray-200'
                    }`}>
                      {msg.text.split('\n').map((line, index, arr) => (
                        <React.Fragment key={index}>
                          {line}
                          {index < arr.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                      
                      {/* Render booking progress */}
                      {msg.sender === 'bot' && msg.bookingIntent && renderBookingProgress(msg.bookingIntent)}
                    </div>
                    
                    {msg.sender === 'user' && (
                      <Avatar className="h-8 w-8 border border-gray-200">
                        <AvatarFallback className="bg-gray-50">
                          <User className="h-5 w-5 text-gray-600" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  
                  {/* Render suggestions */}
                  {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-10">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Lightbulb className="h-3 w-3" />
                        <span>Quick actions:</span>
                      </div>
                      {msg.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-end gap-2 justify-start">
                  <Avatar className="h-8 w-8 border border-blue-200">
                    <AvatarFallback className="bg-blue-50">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-gray-600">MediBuddy is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <div className="border-t p-4 bg-gray-50/50">
          {bookingInProgress && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Booking in progress...</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Continue the conversation to complete your appointment booking.
              </div>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <div className="flex-1">
              <Textarea
                ref={inputRef}
                placeholder="Ask me anything about health, services, or book an appointment..."
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                className="min-h-[44px] max-h-32 resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 overflow-hidden"
                disabled={isLoading}
                rows={1}
              />
              <div className="text-xs text-gray-500 mt-1 px-1">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || !inputValue.trim()} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg h-11 w-11"
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
          
          <div className="text-xs text-gray-500 text-center mt-2">
            Enhanced AI chatbot • Can answer medical questions • Book appointments
          </div>
        </div>
      </Card>
    </div>
  );
}
