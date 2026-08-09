"""
Configure S3 bucket for public read access to student photos
Run this ONCE after creating the bucket
"""
import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

# AWS Configuration
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

bucket_name = os.getenv('AWS_S3_BUCKET')

print(f"Configuring bucket: {bucket_name}")

# 1. Disable Block Public Access settings
try:
    s3_client.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': False,
            'IgnorePublicAcls': False,
            'BlockPublicPolicy': False,
            'RestrictPublicBuckets': False
        }
    )
    print("✓ Public access block settings updated")
except Exception as e:
    print(f"✗ Failed to update public access block: {e}")

# 2. Set bucket policy to allow public read
bucket_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": f"arn:aws:s3:::{bucket_name}/students/*"
        }
    ]
}

try:
    s3_client.put_bucket_policy(
        Bucket=bucket_name,
        Policy=json.dumps(bucket_policy)
    )
    print("✓ Bucket policy set for public read access")
except Exception as e:
    print(f"✗ Failed to set bucket policy: {e}")

# 3. Enable CORS for web access
cors_configuration = {
    'CORSRules': [
        {
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['GET', 'HEAD'],
            'AllowedOrigins': ['*'],
            'ExposeHeaders': [],
            'MaxAgeSeconds': 3000
        }
    ]
}

try:
    s3_client.put_bucket_cors(
        Bucket=bucket_name,
        CORSConfiguration=cors_configuration
    )
    print("✓ CORS configuration set")
except Exception as e:
    print(f"✗ Failed to set CORS: {e}")

print("\n✅ S3 bucket configuration complete!")
print(f"Student photos will be accessible at:")
print(f"https://{bucket_name}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/students/")
