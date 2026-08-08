import { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { attendanceAPI } from '../lib/api';

interface DetectedFace {
  bbox: number[];
  detection_confidence: number;
  matched: boolean;
  student: {
    id: number;
    student_id: string;
    name: string;
    grade: number;
    section: string;
  } | null;
  match_confidence: number;
  quality?: number;
}

interface AttendanceResult {
  message: string;
  attendance_id: number;
  student: {
    id: number;
    student_id: string;
    name: string;
    grade: number;
    section: string;
  };
  confidence_score: number;
  time: string;
  date: string;
}

interface FaceRecognitionCameraProps {
  onAttendanceMarked?: (result: AttendanceResult) => void;
  autoMark?: boolean; // Automatically mark attendance when face is detected
}

export default function FaceRecognitionCamera({ 
  onAttendanceMarked, 
  autoMark = false 
}: FaceRecognitionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [lastDetectionTime, setLastDetectionTime] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  // Start camera
  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Start face detection loop
        startFaceDetection();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsCameraActive(false);
    setDetectedFaces([]);
    setAttendanceMarked(false);
  };

  // Capture frame and convert to base64
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Detect faces in frame
  const detectFaces = async () => {
    if (isProcessing || !isCameraActive) return;

    // Throttle detection to every 1 second
    const now = Date.now();
    if (now - lastDetectionTime < 1000) return;

    setLastDetectionTime(now);
    setIsProcessing(true);

    try {
      const frame = captureFrame();
      if (!frame) {
        setIsProcessing(false);
        return;
      }

      const response = await attendanceAPI.detectFaces(frame);
      
      if (response.data.faces_detected > 0) {
        setDetectedFaces(response.data.faces);
        
        // Auto-mark attendance if enabled and face is matched
        if (autoMark && !attendanceMarked) {
          const matchedFace = response.data.faces.find((face: DetectedFace) => face.matched);
          if (matchedFace) {
            await markAttendance();
          }
        }
      } else {
        setDetectedFaces([]);
      }
    } catch (err: any) {
      console.error('Face detection error:', err);
      // Don't show errors during continuous detection
    } finally {
      setIsProcessing(false);
    }
  };

  // Start continuous face detection
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      detectFaces();
    }, 1000); // Detect every 1 second
  };

  // Mark attendance
  const markAttendance = async () => {
    setError('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      const frame = captureFrame();
      if (!frame) {
        setError('Failed to capture frame');
        setIsProcessing(false);
        return;
      }

      const response = await attendanceAPI.markAttendance(frame);
      
      setSuccessMessage(
        `Attendance marked for ${response.data.student.name} (Confidence: ${response.data.confidence_score.toFixed(1)}%)`
      );
      setAttendanceMarked(true);
      
      if (onAttendanceMarked) {
        onAttendanceMarked(response.data);
      }

      // Stop detection after successful marking
      setTimeout(() => {
        stopCamera();
        setSuccessMessage('');
      }, 3000);

    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to mark attendance';
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Draw bounding boxes on canvas overlay
  const drawBoundingBoxes = () => {
    if (!canvasRef.current || !videoRef.current || detectedFaces.length === 0) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw boxes for each detected face
    detectedFaces.forEach(face => {
      const [x1, y1, x2, y2] = face.bbox;
      const width = x2 - x1;
      const height = y2 - y1;

      // Scale coordinates to canvas size
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      const scaledX = x1 * scaleX;
      const scaledY = y1 * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      // Set color based on match status
      context.strokeStyle = face.matched ? '#10b981' : '#ef4444';
      context.lineWidth = 3;
      context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw label
      if (face.student) {
        context.fillStyle = face.matched ? '#10b981' : '#ef4444';
        context.fillRect(scaledX, scaledY - 30, scaledWidth, 30);
        
        context.fillStyle = 'white';
        context.font = '14px Arial';
        context.fillText(
          `${face.student.name} (${(face.match_confidence * 100).toFixed(1)}%)`,
          scaledX + 5,
          scaledY - 10
        );
      }
    });
  };

  // Update bounding boxes when faces change
  useEffect(() => {
    if (isCameraActive) {
      drawBoundingBoxes();
    }
  }, [detectedFaces, isCameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Face Recognition Attendance</h3>
        {isCameraActive && (
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <X className="w-4 h-4" />
            Stop Camera
          </button>
        )}
      </div>

      {/* Camera View */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {!isCameraActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="w-16 h-16 text-gray-500 mb-4" />
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Camera className="w-5 h-5" />
              Start Camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Processing Indicator */}
            {isProcessing && (
              <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}

            {/* Face Count and Quality Indicators */}
            {detectedFaces.length > 0 && (
              <div className="absolute top-4 left-4 space-y-2">
                <div className="bg-gray-900 bg-opacity-75 text-white px-3 py-2 rounded-lg">
                  <span className="text-sm">
                    {detectedFaces.length} face(s) detected
                  </span>
                </div>
                {detectedFaces.map((face, idx) => (
                  face.quality !== undefined && (
                    <div 
                      key={idx}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                        face.quality >= 0.7 ? 'bg-green-600' :
                        face.quality >= 0.5 ? 'bg-yellow-600' :
                        'bg-red-600'
                      } text-white`}
                    >
                      Quality: {face.quality >= 0.7 ? 'Excellent' : face.quality >= 0.5 ? 'Good' : 'Poor'}
                    </div>
                  )
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detected Faces Info */}
      {isCameraActive && detectedFaces.length > 0 && (
        <div className="mt-4 space-y-2">
          {detectedFaces.map((face, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-2 ${
                face.matched
                  ? 'bg-green-50 border-green-500'
                  : 'bg-red-50 border-red-500'
              }`}
            >
              {face.matched && face.student ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{face.student.name}</p>
                    <p className="text-sm text-gray-600">
                      {face.student.student_id} - Grade {face.student.grade}{face.student.section}
                    </p>
                    <p className="text-xs text-gray-500">
                      Confidence: {(face.match_confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  {!attendanceMarked && !autoMark && (
                    <button
                      onClick={markAttendance}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Mark Present
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-700">Face not recognized</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Instructions */}
      {!isCameraActive && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Instructions for Best Accuracy:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Click "Start Camera" to begin face detection</li>
            <li><strong>Face the camera directly</strong> - avoid side angles</li>
            <li><strong>Ensure good lighting</strong> - face should be clearly visible</li>
            <li><strong>Stay still</strong> for 1-2 seconds during detection</li>
            <li><strong>One person at a time</strong> - multiple faces will be rejected</li>
            <li>Wait for <strong>green box and "Excellent" quality</strong> indicator</li>
            <li>Minimum 65% confidence required for attendance marking</li>
          </ul>
        </div>
      )}
      
      {isCameraActive && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Tips for Perfect Match:
          </h4>
          <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
            <li>Position your face in the center of the frame</li>
            <li>Look directly at the camera</li>
            <li>Wait for "Excellent" quality indicator (green)</li>
            <li>Keep your face still when the green box appears</li>
          </ul>
        </div>
      )}
    </div>
  );
}
