import boto3
from botocore.exceptions import ClientError
import os
from loguru import logger
import uuid
from typing import Optional

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('AWS_S3_BUCKET')
        
        if not self.bucket_name:
            raise ValueError("AWS_S3_BUCKET environment variable not set")
    
    def upload_photo(self, file_content: bytes, content_type: str, student_id: str) -> Optional[str]:
        """
        Upload photo to S3 and return the public URL
        
        Args:
            file_content: Photo bytes
            content_type: MIME type (e.g., 'image/jpeg')
            student_id: Student ID for filename
            
        Returns:
            Public URL of uploaded photo, or None if upload fails
        """
        try:
            # Generate unique filename
            file_extension = content_type.split('/')[-1]
            filename = f"students/{student_id}_{uuid.uuid4()}.{file_extension}"
            
            # Upload to S3 with public-read ACL
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=filename,
                    Body=file_content,
                    ContentType=content_type,
                    ACL='public-read'  # Make the photo publicly accessible
                )
            except ClientError as e:
                # If ACL fails, try without ACL (bucket might have ACLs disabled)
                if 'AccessControlListNotSupported' in str(e):
                    logger.warning("ACLs not supported, uploading without ACL. Configure bucket policy for public access.")
                    self.s3_client.put_object(
                        Bucket=self.bucket_name,
                        Key=filename,
                        Body=file_content,
                        ContentType=content_type
                    )
                else:
                    raise
            
            # Generate public URL
            url = f"https://{self.bucket_name}.s3.{os.getenv('AWS_REGION', 'us-east-1')}.amazonaws.com/{filename}"
            
            logger.info(f"Photo uploaded to S3: {url}")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to upload photo to S3: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading to S3: {e}")
            return None
    
    def delete_photo(self, photo_url: str) -> bool:
        """
        Delete photo from S3 using its URL
        
        Args:
            photo_url: Public URL of the photo
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            # Extract key from URL
            # URL format: https://bucket-name.s3.region.amazonaws.com/key
            key = photo_url.split('.amazonaws.com/')[-1]
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            logger.info(f"Photo deleted from S3: {key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete photo from S3: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting from S3: {e}")
            return False

# Singleton instance
_s3_service = None

def get_s3_service() -> S3Service:
    """Get or create S3 service singleton"""
    global _s3_service
    if _s3_service is None:
        _s3_service = S3Service()
    return _s3_service
