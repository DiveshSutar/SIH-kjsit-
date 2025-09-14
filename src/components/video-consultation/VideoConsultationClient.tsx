'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { VideoScheduler } from '@/components/video-consultation/VideoScheduler';
import { JitsiMeetRoom } from '@/components/video-consultation/JitsiMeetRoom';
import { VideoIcon, Calendar as CalendarIcon, Clock, Users, Shield, CheckCircle2 } from 'lucide-react';
import { DOCTORS_DATA } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { format } from 'date-fns';

interface VideoConsultation {
  id: string;
  doctorId: string;
  patientProblem: string;
  scheduledDate: Date;
  scheduledTime: string;
  roomName: string;
  status: 'scheduled' | 'active' | 'completed';
}

export function VideoConsultationClient() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'schedule' | 'join' | 'manage'>('schedule');
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);

  // Load consultations from localStorage on component mount
  useEffect(() => {
    const savedConsultations = localStorage.getItem('videoConsultations');
    if (savedConsultations) {
      const parsed = JSON.parse(savedConsultations);
      // Convert date strings back to Date objects
      const consultationsWithDates = parsed.map((consultation: any) => ({
        ...consultation,
        scheduledDate: new Date(consultation.scheduledDate)
      }));
      setConsultations(consultationsWithDates);
    }
  }, []);

  // Save consultations to localStorage whenever it changes
  useEffect(() => {
    if (consultations.length > 0) {
      localStorage.setItem('videoConsultations', JSON.stringify(consultations));
    }
  }, [consultations]);

  const handleScheduleConsultation = (consultation: Omit<VideoConsultation, 'id' | 'status'>) => {
    const newConsultation: VideoConsultation = {
      ...consultation,
      id: `video-${Date.now()}`,
      status: 'scheduled'
    };
    setConsultations(prev => [...prev, newConsultation]);
  };

  const handleRedirectToConsultations = () => {
    setActiveTab('manage');
  };

  const handleJoinRoom = (roomName: string) => {
    setCurrentRoomName(roomName);
    setActiveTab('join');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomName(null);
    setActiveTab('manage');
  };

  const upcomingConsultations = consultations.filter(c => 
    c.status === 'scheduled' && c.scheduledDate >= new Date()
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
          <VideoIcon className="h-10 w-10 text-primary" />
          Video Consultation
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Schedule secure video meetings with your doctor to discuss your health concerns from the comfort of your home.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Secure & Private</h3>
            <p className="text-sm text-muted-foreground">
              End-to-end encrypted video calls ensuring your privacy and confidentiality.
            </p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <CalendarIcon className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Easy Scheduling</h3>
            <p className="text-sm text-muted-foreground">
              Book appointments with your preferred doctor at your convenient time.
            </p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Expert Doctors</h3>
            <p className="text-sm text-muted-foreground">
              Connect with qualified healthcare professionals across various specialties.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'schedule' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Schedule Consultation
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'manage' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Consultations
          </button>
          {currentRoomName && (
            <button
              onClick={() => setActiveTab('join')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'join' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Meeting
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' && (
        <VideoScheduler 
          onSchedule={handleScheduleConsultation}
          onRedirectToConsultations={handleRedirectToConsultations}
        />
      )}

      {activeTab === 'manage' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Upcoming Consultations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingConsultations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming consultations scheduled.</p>
                  <Button 
                    onClick={() => setActiveTab('schedule')} 
                    className="mt-4"
                    variant="outline"
                  >
                    Schedule Your First Consultation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingConsultations.map((consultation) => {
                    const doctor = DOCTORS_DATA.find(d => d.id === consultation.doctorId);
                    return (
                      <Card key={consultation.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-2">
                                Video Consultation with {doctor?.name}
                              </h4>
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                  <span>{format(consultation.scheduledDate, 'MMMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>{consultation.scheduledTime}</span>
                                </div>
                              </div>
                              <div className="mt-3 space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Problem Description:</strong> {consultation.patientProblem}
                                </p>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">Meeting Code:</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(consultation.roomName);
                                        alert('Meeting code copied!');
                                      }}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <code className="text-sm bg-background px-2 py-1 rounded font-mono">
                                    {consultation.roomName}
                                  </code>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 flex flex-col gap-2">
                              <Button
                                onClick={() => handleJoinRoom(consultation.roomName)}
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <VideoIcon className="h-4 w-4" />
                                Join Meeting
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'join' && currentRoomName && (
        <JitsiMeetRoom 
          roomName={currentRoomName} 
          onLeave={handleLeaveRoom}
        />
      )}
    </div>
  );
}