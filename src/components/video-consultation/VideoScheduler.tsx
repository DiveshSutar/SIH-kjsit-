'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Clock, UserCheck, MessageSquare, CheckCircle, Copy, VideoIcon } from 'lucide-react';
import { DOCTORS_DATA, MOCK_TIME_SLOTS } from '@/lib/constants';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VideoConsultation {
  doctorId: string;
  patientProblem: string;
  scheduledDate: Date;
  scheduledTime: string;
  roomName: string;
}

interface VideoSchedulerProps {
  onSchedule: (consultation: VideoConsultation) => void;
  onRedirectToConsultations?: () => void;
}

export function VideoScheduler({ onSchedule, onRedirectToConsultations }: VideoSchedulerProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientProblem, setPatientProblem] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduledConsultation, setScheduledConsultation] = useState<VideoConsultation | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const generateRoomName = (doctorId: string, date: Date, time: string): string => {
    const doctorName = DOCTORS_DATA.find(d => d.id === doctorId)?.name.replace(/\s+/g, '') || 'Doctor';
    const dateStr = format(date, 'yyyyMMdd');
    const timeStr = time.replace(/[:\s]/g, '').toLowerCase();
    return `consultation-${doctorName}-${dateStr}-${timeStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDoctor || !selectedDate || !selectedTime || !patientProblem.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const roomName = generateRoomName(selectedDoctor, selectedDate, selectedTime);
      
      const consultation: VideoConsultation = {
        doctorId: selectedDoctor,
        patientProblem: patientProblem.trim(),
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        roomName: roomName
      };

      onSchedule(consultation);
      setScheduledConsultation(consultation);
      setShowSuccess(true);

      // Reset form
      setSelectedDoctor('');
      setSelectedDate(undefined);
      setSelectedTime('');
      setPatientProblem('');

      // Redirect to consultations tab after a short delay to show success message
      setTimeout(() => {
        if (onRedirectToConsultations) {
          onRedirectToConsultations();
        }
      }, 3000); // 3 second delay to show success message
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      alert('Failed to schedule consultation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyMeetingCode = async () => {
    if (scheduledConsultation) {
      try {
        await navigator.clipboard.writeText(scheduledConsultation.roomName);
        alert('Meeting code copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy meeting code:', err);
      }
    }
  };

  const handleScheduleAnother = () => {
    setShowSuccess(false);
    setScheduledConsultation(null);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsCalendarOpen(false); // Close calendar after selection
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Message */}
      {showSuccess && scheduledConsultation && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="space-y-3">
              <p className="font-semibold">Video consultation scheduled successfully!</p>
              
              <div className="bg-white p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Meeting Details</h4>
                  <VideoIcon className="h-5 w-5 text-green-600" />
                </div>
                
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Doctor:</span>
                    <span className="font-medium">
                      {DOCTORS_DATA.find(d => d.id === scheduledConsultation.doctorId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {format(scheduledConsultation.scheduledDate, 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{scheduledConsultation.scheduledTime}</span>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Meeting Code:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyMeetingCode}
                      className="h-6 px-2 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-gray-100 p-2 rounded font-mono text-sm break-all">
                    {scheduledConsultation.roomName}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Share this code with your doctor or use it to join the meeting.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleScheduleAnother} variant="outline" size="sm">
                  Schedule Another
                </Button>
                <Button asChild size="sm">
                  <a href="#manage">View My Consultations</a>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Scheduling Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Schedule Video Consultation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Doctor Selection */}
            <div className="space-y-2">
              <Label htmlFor="doctor">Select Doctor *</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor for your consultation" />
                </SelectTrigger>
                <SelectContent>
                  {DOCTORS_DATA.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{doctor.name}</p>
                          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Select Date *</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date for your consultation'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date() || date < new Date('1900-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">Select Time *</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your preferred time slot" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {time}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Problem Description */}
            <div className="space-y-2">
              <Label htmlFor="problem">Describe Your Problem *</Label>
              <Textarea
                id="problem"
                placeholder="Please describe your health concerns, symptoms, or the reason for this consultation. This will help the doctor prepare for your meeting."
                value={patientProblem}
                onChange={(e) => setPatientProblem(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Minimum 10 characters. Be as detailed as possible to help your doctor understand your concerns.
              </p>
            </div>

            {/* Selected Doctor Preview */}
            {selectedDoctor && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  {(() => {
                    const doctor = DOCTORS_DATA.find(d => d.id === selectedDoctor);
                    return doctor ? (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          {doctor.specialtyIcon && <doctor.specialtyIcon className="h-8 w-8 text-primary" />}
                        </div>
                        <div>
                          <h4 className="font-semibold">{doctor.name}</h4>
                          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                          <p className="text-sm text-muted-foreground">{doctor.qualifications}</p>
                          <p className="text-sm text-muted-foreground">{doctor.experience}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isSubmitting || !selectedDoctor || !selectedDate || !selectedTime || patientProblem.length < 10}
            >
              {isSubmitting ? (
                <>
                  <MessageSquare className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling Consultation...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Schedule Video Consultation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}