from flask import Flask, request, jsonify
import requests
import boto3
from boto3.dynamodb.conditions import Key, Attr
import json
from PIL import Image
import numpy as np
import io
app = Flask(__name__)

AWS_ACCESS_KEY = "AWS_ACCESS_KEY"
AWS_SECRET_ACCESS_KEY = "AWS_SECRET_ACCESS_KEY"
AWS_S3_BUCKET_REGION = "AWS_S3_BUCKET_REGION"
AWS_S3_BUCKET_NAME = "AWS_S3_BUCKET_NAME"

s3 = boto3.resource(
service_name='s3',
region_name=AWS_S3_BUCKET_REGION,
aws_access_key_id=AWS_ACCESS_KEY,
aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

s3_client = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY,
                      aws_secret_access_key=AWS_SECRET_ACCESS_KEY)


@app.route('/inference')
def inference():
    print("connected")
    thresh=0.9
    unlabeled_data={}
    json_data = request.get_json()
    dict_data = json.loads(json_data)
    print(list(dict_data.values()))

    print("Inference..")
    for data in list(dict_data.values()):
        label, conf,img = predict(data)
        if(conf>thresh):
            key='labeled_data/'+label+'.jpg'
        else:
            key='unlabeled_data/'+label+'.jpg'
            unlabeled_data[data]=key
        
        in_mem_file = io.BytesIO()
        img.save(in_mem_file, format=img.format)
        in_mem_file.seek(0)
        s3_client.upload_fileobj(
            in_mem_file, 
            AWS_S3_BUCKET_NAME,
            key,
            ExtraArgs={
                'ACL': 'public-read'
            })

    print(unlabeled_data)
    requests.post("http://localhost:5000/annotator", json=json.dumps(unlabeled_data))
    
    return jsonify(unlabeled_data)


def predict(data):

    bucket =s3.Bucket(AWS_S3_BUCKET_NAME)
    print(data)
    obj=bucket.Object(data)
    response=obj.get()
    file_stream=response['Body']
    im=Image.open(file_stream)
    label, conf=model(im)
    return label,conf,im

def model(img):
    label='dog'
    conf=0.8
    return label, conf

if __name__ == "__main__":
    app.run(debug=True,host="0.0.0.0", port=8080)
    print('close..')