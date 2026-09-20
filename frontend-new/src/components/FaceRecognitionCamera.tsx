import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Loader2,
  ScanFace,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { attendanceAPI, getErrorMessage } from '../lib/api';
import type { AttendanceBatchResult, DetectedFace } from '../types';

interface FaceRecognitionCameraProps {
  onAttendanceMarked?: (result: AttendanceBatchResult) => void;
  /** Mark everyone the moment the frame is clean, without waiting for a click. */
  autoMark?: boolean;
}

const DETECTION_INTERVAL_MS = 1200;
/** After an auto-mark, pause before scanning again so the next group can step in. */
const AUTO_MARK_COOLDOWN_MS = 4000;

const QUALITY_LABELS = [
  { min: 0.7, label: 'Excellent', badge: 'bg-green-600' },
  { min: 0.45, label: 'Good', badge: 'bg-yellow-600' },
  { min: 0, label: 'Poor', badge: 'bg-red-600' },
];

function qualityLabel(quality: number) {
  return QUALITY_LABELS.find((entry) => quality >= entry.min) ?? QUALITY_LABELS[2];
}

export default function FaceRecognitionCamera({
  onAttendanceMarked,
  autoMark = false,
}: FaceRecognitionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Two canvases on purpose: the overlay draws boxes, while a detached canvas
  // grabs frames. Sharing one made every capture paint a frozen still over the
  // live video.
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The detection loop runs from setInterval, so it reads live values through
  // refs; reading state there would capture the values from the first render.
  const cameraActiveRef = useRef(false);
  const busyRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const autoMarkRef = useRef(autoMark);
  const facesRef = useRef<DetectedFace[]>([]);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastResult, setLastResult] = useState<AttendanceBatchResult | null>(null);

  useEffect(() => {
    autoMarkRef.current = autoMark;
  }, [autoMark]);

  const updateFaces = useCallback((faces: DetectedFace[]) => {
    facesRef.current = faces;
    setDetectedFaces(faces);
  }, []);

  // ------------------------------------------------------------- capture

  const getCaptureCanvas = () => {
    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas');
    }
    return captureCanvasRef.current;
  };

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    if (video.readyState < video.HAVE_CURRENT_DATA) return null;
    if (!video.videoWidth || !video.videoHeight) return null;

    const canvas = getCaptureCanvas();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    // 0.85 keeps faces sharp enough to recognise without a huge upload.
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // ------------------------------------------------------------- marking

  const markAttendance = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsMarking(true);
    setError('');

    try {
      const frame = captureFrame();
      if (!frame) {
        setError('Could not capture the frame. Please try again.');
        return;
      }

      const response = await attendanceAPI.markAttendance(frame);
      const result: AttendanceBatchResult = response.data;

      setLastResult(result);
      setStatusMessage(result.message);
      // Give the next group time to step in front of the camera.
      cooldownUntilRef.current = Date.now() + AUTO_MARK_COOLDOWN_MS;
      updateFaces([]);

      onAttendanceMarked?.(result);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to mark attendance');
      setError(message);
      // A frame where everyone is already marked should not retry immediately.
      if (message.toLowerCase().includes('already marked')) {
        cooldownUntilRef.current = Date.now() + AUTO_MARK_COOLDOWN_MS;
      }
    } finally {
      busyRef.current = false;
      setIsMarking(false);
    }
  }, [captureFrame, onAttendanceMarked, updateFaces]);

  // ----------------------------------------------------------- detection

  const detectFaces = useCallback(async () => {
    if (!cameraActiveRef.current || busyRef.current) return;
    if (Date.now() < cooldownUntilRef.current) return;

    busyRef.current = true;
    setIsProcessing(true);

    try {
      const frame = captureFrame();
      if (!frame) return;

      const response = await attendanceAPI.detectFaces(frame);
      const faces: DetectedFace[] = response.data.faces ?? [];

      setRegisteredStudents(response.data.registered_students ?? null);
      updateFaces(faces);
      setError('');

      if (autoMarkRef.current && faces.some((face) => face.markable)) {
        busyRef.current = false; // hand the lock to markAttendance
        setIsProcessing(false);
        await markAttendance();
        return;
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Face detection failed'));
    } finally {
      busyRef.current = false;
      setIsProcessing(false);
    }
  }, [captureFrame, markAttendance, updateFaces]);

  // -------------------------------------------------------------- camera

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    cameraActiveRef.current = false;
    busyRef.current = false;
    setIsCameraActive(false);
    updateFaces([]);
  }, [updateFaces]);

  const startCamera = useCallback(async () => {
    setError('');
    setStatusMessage('');
    setLastResult(null);
    setIsStarting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });

      streamRef.current = stream;
      cameraActiveRef.current = true;
      setIsCameraActive(true);

      // The <video> only renders once isCameraActive is true, so attach the
      // stream after React has had a chance to paint it.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      const video = videoRef.current;
      if (!video) throw new Error('Video element unavailable');

      video.srcObject = stream;
      await video.play().catch(() => undefined);

      cooldownUntilRef.current = 0;
      void detectFaces();
      intervalRef.current = setInterval(() => void detectFaces(), DETECTION_INTERVAL_MS);
    } catch (err) {
      const name = (err as Error)?.name;
      setError(
        name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser and try again.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : name === 'NotReadableError'
              ? 'The camera is already in use by another application.'
              : (err as Error)?.message || 'Failed to access the camera.'
      );
      stopCamera();
    } finally {
      setIsStarting(false);
    }
  }, [detectFaces, stopCamera]);

  // ------------------------------------------------------------- overlay

  useEffect(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Draw in video pixel space and let CSS scale the canvas, so the boxes
    // stay aligned whatever size the element is rendered at.
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!isCameraActive) return;

    detectedFaces.forEach((face) => {
      const [x1, y1, x2, y2] = face.bbox;
      const width = x2 - x1;
      const height = y2 - y1;

      const color = !face.matched
        ? '#ef4444'
        : face.already_marked
          ? '#3b82f6'
          : face.markable
            ? '#10b981'
            : '#f59e0b';

      context.strokeStyle = color;
      context.lineWidth = Math.max(2, canvas.width / 320);
      context.strokeRect(x1, y1, width, height);

      const label = face.student
        ? `${face.student.name} ${(face.match_confidence * 100).toFixed(0)}%${
            face.already_marked ? ' ✓' : ''
          }`
        : 'Unknown';

      const fontSize = Math.max(14, canvas.width / 48);
      context.font = `600 ${fontSize}px system-ui, sans-serif`;
      const textWidth = context.measureText(label).width;
      const boxHeight = fontSize * 1.6;
      // Keep the label on screen when the face is near the top edge.
      const labelY = y1 - boxHeight < 0 ? y2 : y1 - boxHeight;

      context.fillStyle = color;
      context.fillRect(x1, labelY, Math.max(width, textWidth + 12), boxHeight);

      context.fillStyle = '#ffffff';
      context.fillText(label, x1 + 6, labelY + fontSize * 1.15);
    });
  }, [detectedFaces, isCameraActive]);

  // Stop the camera when the component goes away, so the webcam light turns off.
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ---------------------------------------------------------------- view

  const matchedFaces = detectedFaces.filter((face) => face.matched);
  const markableFaces = detectedFaces.filter((face) => face.markable);
  const unknownFaces = detectedFaces.filter((face) => !face.matched);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-primary-600" />
            Face Recognition Attendance
          </h3>
          <p className="text-sm text-slate-500">
            Several students can be captured together &mdash; every recognised face is marked.
          </p>
        </div>
        {isCameraActive && (
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 px-4 py-2 bg-danger-600 text-white rounded-xl hover:bg-danger-700 transition font-semibold text-sm"
          >
            <X className="w-4 h-4" />
            Stop Camera
          </button>
        )}
      </div>

      {/* Camera view */}
      <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
            <Camera className="w-14 h-14 text-slate-500" />
            <button
              onClick={startCamera}
              disabled={isStarting}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-semibold disabled:opacity-50"
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              {isStarting ? 'Starting camera…' : 'Start Camera'}
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          // Mirrored so it reads like a mirror; the overlay is mirrored to match.
          style={{ transform: 'scaleX(-1)', display: isCameraActive ? 'block' : 'none' }}
        />
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ transform: 'scaleX(-1)', display: isCameraActive ? 'block' : 'none' }}
        />

        {isCameraActive && (
          <>
            {(isProcessing || isMarking) && (
              <div className="absolute top-3 right-3 bg-primary-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isMarking ? 'Marking…' : 'Scanning…'}
              </div>
            )}

            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <div className="bg-slate-900/75 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {detectedFaces.length} face(s) · {matchedFaces.length} recognised
              </div>
              {detectedFaces.length > 0 && (
                <div
                  className={`${qualityLabel(
                    Math.min(...detectedFaces.map((face) => face.quality))
                  ).badge} text-white px-3 py-1.5 rounded-lg text-xs font-semibold`}
                >
                  Lowest quality:{' '}
                  {qualityLabel(Math.min(...detectedFaces.map((face) => face.quality))).label}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Manual capture */}
      {isCameraActive && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={markAttendance}
            disabled={isMarking || markableFaces.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-success-600 text-white rounded-xl font-semibold hover:bg-success-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserCheck className="w-4 h-4" />
            {markableFaces.length > 0
              ? `Mark ${markableFaces.length} student(s) present`
              : 'No one ready to mark'}
          </button>
          {autoMark && (
            <span className="text-xs text-slate-500">
              Auto-capture is on &mdash; students are marked as soon as they are recognised.
            </span>
          )}
        </div>
      )}

      {/* Per-face breakdown */}
      {isCameraActive && detectedFaces.length > 0 && (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {detectedFaces.map((face, index) => {
            const tone = !face.matched
              ? 'bg-danger-50 border-danger-400'
              : face.already_marked
                ? 'bg-primary-50 border-primary-400'
                : face.markable
                  ? 'bg-success-50 border-success-400'
                  : 'bg-warning-50 border-warning-400';

            return (
              <div key={index} className={`p-3 rounded-xl border-2 ${tone}`}>
                {face.matched && face.student ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{face.student.name}</p>
                      <p className="text-sm text-slate-600">
                        {face.student.student_id}
                        {face.student.grade ? ` · Grade ${face.student.grade}` : ''}
                        {face.student.section ?? ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        Match {(face.match_confidence * 100).toFixed(1)}% · quality{' '}
                        {qualityLabel(face.quality).label.toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {face.already_marked
                        ? 'Already marked'
                        : face.markable
                          ? 'Ready'
                          : 'Hold still / move closer'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      Face {index + 1} not recognised &mdash; register this student with a clear photo.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Result of the last capture */}
      {lastResult && (
        <div className="mt-4 rounded-xl border border-success-200 bg-success-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-success-800">
            <CheckCircle className="w-5 h-5" />
            {lastResult.marked_count} of {lastResult.faces_detected} face(s) marked present
          </p>
          <ul className="mt-2 space-y-1 text-sm text-success-900">
            {lastResult.marked.map((entry) => (
              <li key={entry.attendance_id}>
                {entry.student.name} &mdash; {entry.confidence_score.toFixed(1)}% at {entry.time}
              </li>
            ))}
          </ul>
          {lastResult.skipped.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {lastResult.skipped.map((entry, index) => (
                <li key={index}>• {entry.detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-800">{error}</p>
        </div>
      )}

      {statusMessage && !error && (
        <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-xl flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-success-800">{statusMessage}</p>
        </div>
      )}

      {registeredStudents === 0 && isCameraActive && (
        <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-xl text-sm text-warning-800">
          No student in this school has a registered face yet. Add students with a clear, front-facing
          photo before taking attendance.
        </div>
      )}

      {/* Guidance */}
      {!isCameraActive && (
        <div className="mt-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
          <h4 className="font-semibold text-primary-900 mb-2">How to get the best results</h4>
          <ul className="text-sm text-primary-800 space-y-1 list-disc list-inside">
            <li><strong>Multiple students at once are supported</strong> &mdash; line them up facing the camera</li>
            <li>Make sure each face is well lit and looking towards the lens</li>
            <li>Stand close enough that faces fill a good part of the frame</li>
            <li>Green box = ready to mark, blue = already marked today, red = not recognised</li>
            <li>Each student can only be marked once per day</li>
          </ul>
        </div>
      )}

      {isCameraActive && unknownFaces.length > 0 && (
        <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-xl text-sm text-warning-800">
          {unknownFaces.length} face(s) could not be matched. They may not be registered, or the photo
          on file may need updating.
        </div>
      )}
    </div>
  );
}
