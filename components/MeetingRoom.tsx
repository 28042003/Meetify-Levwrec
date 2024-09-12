'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, File, MessageSquare } from 'lucide-react';
import { FaceDetection, Results } from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';
import Webcam from 'react-webcam';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import DocumentSharing from './DocumentSharing';
import { cn } from '@/lib/utils';
import {
  detectCheating,
  extractFaceCoordinates,
  getCheatingStatus,
} from '../helper/face-detection/face-detection-helper';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<{ id: string; name: string }[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { useCallCallingState } = useCallStateHooks();

  const callingState = useCallCallingState();

  // Face detection states and refs
  const [cheatingStatus, setCheatingStatus] = useState('...');
  const webcamRef = useRef<Webcam>(null);
  const faceDetectionRef = useRef<FaceDetection | null>(null);
  const currentFrame = useRef(0);
  const frameRefresh = 30;

  // Handle face detection 
  useEffect(() => {
    if (!webcamRef.current) {
      setCheatingStatus('Camera not found');
      return;
    }

    const videoElement = webcamRef.current.video;
    if (!videoElement) {
      setCheatingStatus('Camera not available');
      return;
    }

    const faceDetection = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    faceDetection.setOptions({
      minDetectionConfidence: 0.5,
      model: 'short',
    });

    faceDetection.onResults((result: Results) => {
      if (result.detections.length < 1) {
        setCheatingStatus('Face not detected');
        return;
      } else if (result.detections.length > 1) {
        setCheatingStatus('Multiple faces detected!');
        return;
      }

      const faceCoordinates = extractFaceCoordinates(result);
      const [lookingLeft, lookingRight] = detectCheating(faceCoordinates, true);
      const status = getCheatingStatus(lookingLeft, lookingRight);
      setCheatingStatus(status);
    });

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        currentFrame.current += 1;
        if (currentFrame.current >= frameRefresh) {
          currentFrame.current = 0;
          await faceDetection.send({ image: videoElement });
        }
      },
      width: 1280,
      height: 720,
    });

    camera.start().catch(() => {
      setCheatingStatus('Unable to start camera');
    });

    faceDetectionRef.current = faceDetection;

    return () => {
      faceDetection.close();
    };
  }, []);

  if (callingState !== CallingState.JOINED) return <Loader />;

  const CallLayout = () => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const uploadedFilesArray = Array.from(files);
      setUploadedFiles(uploadedFilesArray);

      uploadedFilesArray.forEach(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('https://file.io', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          if (data.success) {
            setDocuments((prevDocuments) => [
              ...prevDocuments,
              { id: data.link, name: file.name },
            ]);
          }
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      });
    }
  };

  const handleShareDocument = (document: { id: string; name: string }) => {
    console.log(`Sharing document ${document.name} with participants: ${document.id}`);
  };

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (newMessage.trim()) {
      setMessages([...messages, newMessage]);
      setNewMessage('');
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white bg-black">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>
        <div
          className={cn('h-[calc(100vh-86px)] hidden ml-2', {
            'show-block': showParticipants,
          })}
        >
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </div>
        {showDocuments && (
          <div className="absolute top-0 left-0 w-full h-full bg-white p-4">
            <h2 className="text-black">Document Sharing</h2>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="block text-gray-900"
            />
            <DocumentSharing uploadedFiles={uploadedFiles} onShareDocument={handleShareDocument} />
            <ul>
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center mb-2">
                  <button
                    onClick={() => handleShareDocument(doc)}
                    className="underline text-blue-500"
                  >
                    {doc.name}
                  </button>
                  <a
                    href={doc.id}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-500 underline"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showChat && (
          <div className="absolute top-0 right-0 w-[300px] h-full bg-gray-900 text-white p-4">
            <h2 className="text-lg font-bold mb-2">Chat</h2>
            <div className="h-[80%] overflow-y-scroll mb-2">
              {messages.map((msg, index) => (
                <div key={index} className="mb-1">
                  <span className="bg-gray-800 p-2 rounded">{msg}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-gray-700 text-white p-2 rounded-l"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="bg-white text-black px-4 py-2 rounded-r"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Cheating status */}
      <div className="absolute bottom-4 left-4 p-4 bg-[#19232d] rounded-md text-white mb-4">
        <p>Cheating status: {cheatingStatus}</p>
        <Webcam
          className="mt-2 w-[150px] h-auto rounded-md"
          ref={webcamRef}
          screenshotFormat="image/jpeg"
        />
      </div>

      {/* Video layout and call controls */}
      <div className="fixed bottom-0 flex w-full items-center justify-center gap-5">
        <CallControls onLeave={() => router.push(`/`)} />
        <DropdownMenu>
          <div className="flex items-center">
            <DropdownMenuTrigger className="cursor-pointer rounded-2xl bg-gray-900 p-2">
              <div className="text-white">
                <Users size={20} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowParticipants(!showParticipants)}>
                <Users className="mr-2" />
                {showParticipants ? 'Hide Participants' : 'Show Participants'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDocuments(!showDocuments)}>
                <File className="mr-2" />
                {showDocuments ? 'Hide Documents' : 'Show Documents'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowChat(!showChat)}>
                <MessageSquare className="mr-2" />
                {showChat ? 'Hide Chat' : 'Show Chat'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </div>
        </DropdownMenu>
        <CallStatsButton />
        <EndCallButton />
      </div>
    </section>
  );
};

export default MeetingRoom;
