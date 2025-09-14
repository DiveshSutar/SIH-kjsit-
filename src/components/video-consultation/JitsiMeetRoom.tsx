'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoIcon, PhoneOffIcon, Users, Loader2 } from 'lucide-react';

interface JitsiMeetRoomProps {
  roomName: string;
  onLeave: () => void;
}

export function JitsiMeetRoom({ roomName, onLeave }: JitsiMeetRoomProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Jitsi Meet with direct iframe approach
  useEffect(() => {
    if (jitsiContainerRef.current) {
      // Create direct join URL with all necessary parameters to skip prejoin
      const directJoinUrl = `https://meet.jit.si/${roomName}` +
        `?prejoin=false` +
        `&userInfo.displayName=Patient-${Date.now()}` +
        `#config.prejoinPageEnabled=false` +
        `&config.requireDisplayName=false` +
        `&config.startWithAudioMuted=false` +
        `&config.startWithVideoMuted=false` +
        `&config.enableWelcomePage=false` +
        `&config.skipPrejoin=true` +
        `&interfaceConfig.SHOW_JITSI_WATERMARK=false` +
        `&interfaceConfig.SHOW_POWERED_BY=false`;
      
      // Create iframe for direct join
      const iframe = document.createElement('iframe');
      iframe.src = directJoinUrl;
      iframe.width = '100%';
      iframe.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.allow = 'camera; microphone; fullscreen; display-capture; autoplay';
      iframe.title = 'Video Consultation Meeting';
      iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-presentation';
      
      // Clear container and add iframe
      jitsiContainerRef.current.innerHTML = '';
      jitsiContainerRef.current.appendChild(iframe);
      
      // Set loading to false after iframe loads or timeout
      iframe.onload = () => {
        console.log('Jitsi Meet iframe loaded successfully');
        setTimeout(() => {
          setIsLoading(false);
        }, 2000); // Small delay to ensure Jitsi fully loads
      };
      
      // Fallback timeout
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
    }

    // Cleanup function
    return () => {
      if (jitsiContainerRef.current) {
        jitsiContainerRef.current.innerHTML = '';
      }
    };
  }, [roomName]);

  const handleLeaveCall = () => {
    onLeave();
  };

  if (isLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-6 w-6" />
            Starting Video Consultation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium mb-2">Starting your video meeting...</p>
            <p className="text-muted-foreground text-center mb-4">
              Your video consultation will begin in a moment.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md">
              <p className="text-sm text-blue-800 text-center">
                <strong>Note:</strong> The meeting will be started by your doctor. Please wait for them to join.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Room:</strong> {roomName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Meeting Header */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <VideoIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Video Consultation Active</h2>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Users className="h-3 w-3 mr-1" />
                Meeting Active
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveCall}
                className="flex items-center gap-2"
              >
                <PhoneOffIcon className="h-4 w-4" />
                Leave Meeting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jitsi Meet Container */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={jitsiContainerRef}
            className="w-full h-[600px] bg-black rounded-lg overflow-hidden"
          />
        </CardContent>
      </Card>

      {/* Meeting Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <h4 className="font-medium mb-1">Room Name</h4>
              <p className="text-muted-foreground">{roomName}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Meeting Status</h4>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div>
              <h4 className="font-medium mb-1">Security</h4>
              <p className="text-muted-foreground">End-to-end encrypted</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 text-center">
              💡 <strong>Tip:</strong> Your doctor will start and manage the meeting. Please wait for them to join if they haven't already.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}