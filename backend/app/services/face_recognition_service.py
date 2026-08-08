"""
Face Recognition Service using InsightFace
Handles face encoding generation and matching for attendance system
"""
import os
import cv2
import numpy as np
from typing import Optional, List, Tuple
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity
import base64
from loguru import logger

class FaceRecognitionService:
    """Service for face detection, encoding, and matching"""
    
    def __init__(self):
        """Initialize InsightFace model"""
        self.app = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the face analysis model"""
        try:
            # Initialize InsightFace with Buffalo_L model (best balance of speed/accuracy)
            self.app = FaceAnalysis(
                name='buffalo_l',
                providers=['CPUExecutionProvider']  # Use CPU for Windows compatibility
            )
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("Face recognition model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize face recognition model: {e}")
            raise
    
    def generate_encoding_from_file(self, image_path: str) -> Optional[np.ndarray]:
        """
        Generate face encoding from an image file
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Face encoding as numpy array or None if no face detected
        """
        try:
            # Read image
            if not os.path.exists(image_path):
                logger.error(f"Image file not found: {image_path}")
                return None
            
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Failed to read image: {image_path}")
                return None
            
            # Detect faces
            faces = self.app.get(img)
            
            if len(faces) == 0:
                logger.warning(f"No face detected in image: {image_path}")
                return None
            
            if len(faces) > 1:
                logger.warning(f"Multiple faces detected in image: {image_path}, using the largest face")
            
            # Get the largest face (by bounding box area)
            largest_face = max(faces, key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]))
            
            # Return the embedding (512-d vector)
            encoding = largest_face.embedding
            logger.info(f"Successfully generated encoding from {image_path}")
            return encoding
            
        except Exception as e:
            logger.error(f"Error generating encoding from file {image_path}: {e}")
            return None
    
    def generate_encoding_from_base64(self, base64_image: str) -> Optional[np.ndarray]:
        """
        Generate face encoding from base64 encoded image
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            Face encoding as numpy array or None if no face detected
        """
        try:
            # Decode base64 to image
            img_data = base64.b64decode(base64_image.split(',')[-1])  # Remove data:image/jpeg;base64, prefix if present
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("Failed to decode base64 image")
                return None
            
            # Detect faces
            faces = self.app.get(img)
            
            if len(faces) == 0:
                logger.warning("No face detected in base64 image")
                return None
            
            # Get the largest face
            largest_face = max(faces, key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]))
            
            encoding = largest_face.embedding
            logger.info("Successfully generated encoding from base64 image")
            return encoding
            
        except Exception as e:
            logger.error(f"Error generating encoding from base64: {e}")
            return None
    
    def detect_faces_in_frame(self, frame: np.ndarray) -> List[dict]:
        """
        Detect all faces in a frame and return their encodings and bounding boxes
        
        Args:
            frame: Image frame as numpy array (BGR format)
            
        Returns:
            List of dictionaries containing face info:
            [{'encoding': np.ndarray, 'bbox': [x1, y1, x2, y2], 'confidence': float}, ...]
        """
        try:
            faces = self.app.get(frame)
            
            result = []
            for face in faces:
                result.append({
                    'encoding': face.embedding,
                    'bbox': face.bbox.tolist(),  # [x1, y1, x2, y2]
                    'confidence': float(face.det_score)
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting faces in frame: {e}")
            return []
    
    def compare_encodings(self, encoding1: np.ndarray, encoding2: np.ndarray, threshold: float = 0.4) -> Tuple[bool, float]:
        """
        Compare two face encodings using cosine similarity
        
        Args:
            encoding1: First face encoding
            encoding2: Second face encoding
            threshold: Similarity threshold (0.4 is recommended for InsightFace)
            
        Returns:
            Tuple of (is_match: bool, similarity: float)
        """
        try:
            # Reshape for sklearn
            enc1 = encoding1.reshape(1, -1)
            enc2 = encoding2.reshape(1, -1)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(enc1, enc2)[0][0]
            
            # InsightFace embeddings: higher similarity = more similar
            # Threshold typically 0.3-0.5 for good matches
            is_match = similarity >= threshold
            
            return is_match, float(similarity)
            
        except Exception as e:
            logger.error(f"Error comparing encodings: {e}")
            return False, 0.0
    
    def find_best_match(
        self, 
        target_encoding: np.ndarray, 
        known_encodings: List[Tuple[int, np.ndarray]], 
        threshold: float = 0.4
    ) -> Optional[Tuple[int, float]]:
        """
        Find the best matching face from a list of known encodings
        
        Args:
            target_encoding: The encoding to match
            known_encodings: List of tuples (student_id, encoding)
            threshold: Minimum similarity threshold
            
        Returns:
            Tuple of (student_id, similarity) for best match, or None if no match
        """
        try:
            if not known_encodings:
                return None
            
            best_match_id = None
            best_similarity = 0.0
            
            target = target_encoding.reshape(1, -1)
            
            for student_id, encoding in known_encodings:
                enc = encoding.reshape(1, -1)
                similarity = cosine_similarity(target, enc)[0][0]
                
                if similarity > best_similarity and similarity >= threshold:
                    best_similarity = similarity
                    best_match_id = student_id
            
            if best_match_id is not None:
                logger.info(f"Best match found: Student ID {best_match_id} with similarity {best_similarity:.3f}")
                return best_match_id, best_similarity
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding best match: {e}")
            return None
    
    def encoding_to_base64(self, encoding: np.ndarray) -> str:
        """Convert numpy encoding to base64 string for storage"""
        return base64.b64encode(encoding.tobytes()).decode('utf-8')
    
    def base64_to_encoding(self, base64_str: str) -> np.ndarray:
        """Convert base64 string back to numpy encoding"""
        encoding_bytes = base64.b64decode(base64_str)
        return np.frombuffer(encoding_bytes, dtype=np.float32)

# Singleton instance
_face_recognition_service = None

def get_face_recognition_service() -> FaceRecognitionService:
    """Get or create the face recognition service singleton"""
    global _face_recognition_service
    if _face_recognition_service is None:
        _face_recognition_service = FaceRecognitionService()
    return _face_recognition_service
