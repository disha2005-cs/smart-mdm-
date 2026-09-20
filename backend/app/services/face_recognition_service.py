"""
Face Recognition Service using InsightFace
Handles face encoding generation and matching for attendance system
"""
import base64
import os
import threading
from typing import List, Optional, Tuple

import cv2
import numpy as np
from insightface.app import FaceAnalysis
from loguru import logger

# Similarity thresholds for the 512-d ArcFace embeddings produced by buffalo_l.
# Both sides are L2-normalised, so cosine similarity is a plain dot product.
DEFAULT_MATCH_THRESHOLD = 0.40
# A match must beat the runner-up by this margin, otherwise it is ambiguous.
# This is what stops two similar-looking children being marked as each other.
AMBIGUITY_MARGIN = 0.05
MIN_FACE_QUALITY = 0.30

# Where the buffalo_l model files live. InsightFace hardcodes "~/.insightface"
# and does NOT read an environment variable of its own, so the path has to be
# passed to FaceAnalysis explicitly - otherwise a model baked into a container
# image at a different path is silently ignored and re-downloaded at runtime.
MODEL_ROOT = os.getenv("INSIGHTFACE_HOME", "~/.insightface")


class FaceRecognitionService:
    """Service for face detection, encoding, and matching"""

    def __init__(self):
        """Initialize InsightFace model"""
        self.app = None
        self._initialize_model()

    def _initialize_model(self):
        """Initialize the face analysis model"""
        try:
            # Buffalo_L: the best speed/accuracy balance of the bundled models.
            self.app = FaceAnalysis(
                name='buffalo_l',
                root=MODEL_ROOT,
                providers=['CPUExecutionProvider'],  # CPU keeps this portable
            )
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info(f"Face recognition model initialized (models under {MODEL_ROOT})")
        except Exception as e:
            logger.error(f"Failed to initialize face recognition model: {e}")
            raise

    # ------------------------------------------------------------- encoding

    @staticmethod
    def normalize_encoding(encoding: np.ndarray) -> np.ndarray:
        """L2-normalize a face embedding for consistent cosine similarity."""
        encoding = np.asarray(encoding, dtype=np.float32)
        norm = float(np.linalg.norm(encoding))
        if norm > 0:
            return encoding / norm
        return encoding

    def parse_stored_encoding(self, encoding_data) -> Optional[np.ndarray]:
        """
        Parse face encoding from database storage.
        Supports JSONB float lists (512 dims) and legacy base64 strings.
        """
        if encoding_data is None:
            return None

        try:
            if isinstance(encoding_data, str):
                arr = self.base64_to_encoding(encoding_data)
            elif isinstance(encoding_data, (list, tuple)):
                arr = np.array(encoding_data, dtype=np.float32)
            elif isinstance(encoding_data, np.ndarray):
                arr = encoding_data.astype(np.float32)
            else:
                logger.warning(f"Unsupported encoding type: {type(encoding_data)}")
                return None

            if arr.size != 512:
                logger.warning(f"Unexpected encoding size: {arr.size}")
                return None

            return self.normalize_encoding(arr)
        except Exception as e:
            logger.error(f"Failed to parse stored encoding: {e}")
            return None

    def encoding_to_list(self, encoding: np.ndarray) -> list:
        """Convert encoding to JSON-serializable list for database storage."""
        return [float(v) for v in self.normalize_encoding(encoding)]

    def _largest_face_encoding(self, img: np.ndarray, context: str) -> Optional[np.ndarray]:
        faces = self.app.get(img)
        if not faces:
            logger.warning(f"No face detected in {context}")
            return None
        if len(faces) > 1:
            logger.warning(f"Multiple faces detected in {context}; using the largest face")
        largest = max(
            faces,
            key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]),
        )
        return self.normalize_encoding(largest.embedding)

    def generate_encoding_from_bytes(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """Generate face encoding from raw image bytes."""
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                logger.error("Failed to decode image bytes")
                return None
            return self._largest_face_encoding(img, "image bytes")
        except Exception as e:
            logger.error(f"Error generating encoding from bytes: {e}")
            return None

    def generate_encoding_from_file(self, image_path: str) -> Optional[np.ndarray]:
        """Generate face encoding from an image file."""
        try:
            if not os.path.exists(image_path):
                logger.error(f"Image file not found: {image_path}")
                return None

            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Failed to read image: {image_path}")
                return None

            return self._largest_face_encoding(img, image_path)
        except Exception as e:
            logger.error(f"Error generating encoding from file {image_path}: {e}")
            return None

    def generate_encoding_from_base64(self, base64_image: str) -> Optional[np.ndarray]:
        """Generate face encoding from a base64 encoded image."""
        try:
            img = self.decode_base64_frame(base64_image)
            if img is None:
                return None
            return self._largest_face_encoding(img, "base64 image")
        except Exception as e:
            logger.error(f"Error generating encoding from base64: {e}")
            return None

    # ------------------------------------------------------------ detection

    @staticmethod
    def decode_base64_frame(base64_image: str) -> Optional[np.ndarray]:
        """Decode a (possibly data-URI prefixed) base64 image into a BGR frame."""
        try:
            payload = (base64_image or "").split(',')[-1]
            img_data = base64.b64decode(payload, validate=False)
            if not img_data:
                return None
            nparr = np.frombuffer(img_data, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            logger.error(f"Failed to decode base64 frame: {e}")
            return None

    def detect_faces_in_frame(self, frame: np.ndarray) -> List[dict]:
        """
        Detect every face in a frame and return encodings, boxes and quality.

        Returns a list of
        ``{'encoding': np.ndarray, 'bbox': [x1, y1, x2, y2], 'confidence': float, 'quality': float}``
        sorted left-to-right so the order is stable between consecutive frames.
        """
        try:
            if frame is None or frame.size == 0:
                return []

            # Lightweight preprocessing: lift very dark frames so detection works
            # in poorly lit classrooms without paying for CLAHE on every frame.
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            avg_brightness = float(np.mean(gray))

            processed_frame = frame
            if avg_brightness < 80:
                hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
                h, s, v = cv2.split(hsv)
                v = cv2.add(v, 30)
                processed_frame = cv2.cvtColor(cv2.merge([h, s, v]), cv2.COLOR_HSV2BGR)

            faces = self.app.get(processed_frame)

            frame_area = float(processed_frame.shape[0] * processed_frame.shape[1]) or 1.0
            result = []
            for face in faces:
                bbox = face.bbox
                face_area = float((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
                size_ratio = face_area / frame_area

                # Quality blends detector confidence with how much of the frame
                # the face fills. A face needs ~5% of the frame to score full
                # marks on size, which keeps distant/blurry faces out.
                quality_score = float(face.det_score) * min(size_ratio * 20.0, 1.0)

                result.append({
                    'encoding': self.normalize_encoding(face.embedding),
                    'bbox': [float(v) for v in bbox],
                    'confidence': float(face.det_score),
                    'quality': float(quality_score),
                })

            result.sort(key=lambda item: item['bbox'][0])
            return result

        except Exception as e:
            logger.error(f"Error detecting faces in frame: {e}")
            return []

    # -------------------------------------------------------------- matching

    def compare_encodings(
        self,
        encoding1: np.ndarray,
        encoding2: np.ndarray,
        threshold: float = DEFAULT_MATCH_THRESHOLD,
    ) -> Tuple[bool, float]:
        """Compare two face encodings using cosine similarity."""
        try:
            enc1 = self.normalize_encoding(encoding1)
            enc2 = self.normalize_encoding(encoding2)
            similarity = float(np.dot(enc1, enc2))
            return similarity >= threshold, similarity
        except Exception as e:
            logger.error(f"Error comparing encodings: {e}")
            return False, 0.0

    @staticmethod
    def build_encoding_matrix(
        known_encodings: List[Tuple[int, np.ndarray]]
    ) -> Tuple[List[int], Optional[np.ndarray]]:
        """
        Stack known encodings into one (N, 512) matrix.

        Matching a face is then a single matrix-vector product instead of a
        Python loop per student, which is what makes multi-face frames fast.
        """
        ids: List[int] = []
        rows: List[np.ndarray] = []
        for student_id, encoding in known_encodings:
            arr = np.asarray(encoding, dtype=np.float32)
            if arr.size != 512:
                continue
            norm = float(np.linalg.norm(arr))
            rows.append(arr / norm if norm > 0 else arr)
            ids.append(student_id)
        if not rows:
            return [], None
        return ids, np.vstack(rows)

    def find_best_match(
        self,
        target_encoding: np.ndarray,
        known_encodings: List[Tuple[int, np.ndarray]],
        threshold: float = DEFAULT_MATCH_THRESHOLD,
    ) -> Optional[Tuple[int, float]]:
        """Find the best matching student for one encoding, or None."""
        ids, matrix = self.build_encoding_matrix(known_encodings)
        if matrix is None:
            return None
        result = self.match_against_matrix(target_encoding, ids, matrix, threshold=threshold)
        if result is None:
            return None
        return result[0], result[1]

    def match_against_matrix(
        self,
        target_encoding: np.ndarray,
        ids: List[int],
        matrix: np.ndarray,
        threshold: float = DEFAULT_MATCH_THRESHOLD,
        ambiguity_margin: float = AMBIGUITY_MARGIN,
    ) -> Optional[Tuple[int, float, float]]:
        """
        Match one encoding against a pre-built matrix.

        Returns ``(student_id, similarity, runner_up_similarity)`` or None when
        nothing clears the threshold or the top two candidates are too close to
        tell apart.
        """
        try:
            if matrix is None or not ids:
                return None

            target = self.normalize_encoding(target_encoding)
            similarities = matrix @ target

            best_index = int(np.argmax(similarities))
            best_similarity = float(similarities[best_index])

            if best_similarity < threshold:
                return None

            runner_up = 0.0
            if len(similarities) > 1:
                runner_up = float(np.partition(similarities, -2)[-2])
                if best_similarity - runner_up < ambiguity_margin:
                    logger.warning(
                        "Ambiguous face match: best %.3f vs runner-up %.3f",
                        best_similarity,
                        runner_up,
                    )
                    return None

            return ids[best_index], best_similarity, runner_up
        except Exception as e:
            logger.error(f"Error matching encoding: {e}")
            return None

    # ------------------------------------------------------- legacy helpers

    def encoding_to_base64(self, encoding: np.ndarray) -> str:
        """Convert numpy encoding to base64 string (legacy storage format)."""
        return base64.b64encode(self.normalize_encoding(encoding).tobytes()).decode('utf-8')

    def base64_to_encoding(self, base64_str: str) -> np.ndarray:
        """Convert base64 string back to numpy encoding (legacy storage format)."""
        encoding_bytes = base64.b64decode(base64_str)
        return np.frombuffer(encoding_bytes, dtype=np.float32)


# Singleton instance. The lock keeps two concurrent first requests from each
# loading a copy of the ~300MB model.
_face_recognition_service: Optional[FaceRecognitionService] = None
_service_lock = threading.Lock()


def get_face_recognition_service() -> FaceRecognitionService:
    """Get or create the face recognition service singleton"""
    global _face_recognition_service
    if _face_recognition_service is None:
        with _service_lock:
            if _face_recognition_service is None:
                _face_recognition_service = FaceRecognitionService()
    return _face_recognition_service
