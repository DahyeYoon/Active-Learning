from curses import flash
from distutils import file_util
from warnings import filters
from flask import Flask, request, jsonify,render_template
import requests
import boto3
from boto3.dynamodb.conditions import Key, Attr
import json
from PIL import Image
import numpy as np
import io
from base64 import b64encode

import os
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

global file_list
file_list=[]

@app.route('/annotator', methods = ['GET','POST'])
def annotator():
    print("connected")
    global file_list
    if (request.method == 'POST'):
        json_data = request.get_json()
        dict_data = json.loads(json_data)
        print(list(dict_data.values()))
        file_list=list(dict_data.keys())
        print(type(file_list))
        for i, f in enumerate(file_list):
            file_list[i] = "AWS_S3_BUCKET_URL"+ f
    
    print("file_list {}".format(file_list))
    
    return render_template("index.html", unlabeled_image = file_list)

if __name__ == "__main__":

    app.run(debug=True,host="0.0.0.0")
    print('close..')