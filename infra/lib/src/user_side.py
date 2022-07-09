from email.headerregistry import ContentTypeHeader
from flask import Flask, request, jsonify
import requests
import boto3
import json
from boto3.dynamodb.conditions import Key, Attr
from PIL import Image

AWS_ACCESS_KEY = "AWS_ACCESS_KEY"
AWS_SECRET_ACCESS_KEY = "AWS_SECRET_ACCESS_KEY"
AWS_S3_BUCKET_REGION = "AWS_S3_BUCKET_REGION"
AWS_S3_BUCKET_NAME = "AWS_S3_BUCKET_NAME"

app = Flask(__name__)

s3 = boto3.resource(
    service_name='s3',
    region_name=AWS_S3_BUCKET_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

def get_img_data():
    prefix='img_data/'
    objs=[]
    bucket =s3.Bucket(AWS_S3_BUCKET_NAME)
    for obj in bucket.objects.filter(Prefix=prefix):
        objs.append(obj.key)
    non_img_files=[]
    for obj in objs:
        if ('jpg' in obj) or ('png' in obj) : pass
        else:
            non_img_files.append(obj)
    for nif in non_img_files:
        objs.remove(nif)
    return objs


if __name__ == "__main__":
    print('send to inference server..')
    input_files={}
    for i, input_file in enumerate(get_img_data()):
        input_files[i]=input_file
        
    data = json.dumps(input_files)

    res = requests.post("http://localhost:8080/inference", json=data)
    print(res.text)
