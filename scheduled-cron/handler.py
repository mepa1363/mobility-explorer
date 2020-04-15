import json
import urllib.request
from datetime import datetime
import boto3
import psycopg2

conn_string = "host='traffic-cameras-instance-1.cepm2lyl9jau.us-east-1.rds.amazonaws.com' port='5432' dbname='traffic' user='postgres' password='9u3URfoHgEqYXZiwG2XR'"


def process_image(camera_ids, phenomenon_time, model_endpoint):
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()

    for camera_id in camera_ids:
        image_url = f'https://trafficcam.calgary.ca/loc{camera_id}.jpg'
        response = urllib.request.urlopen(image_url)
        image = response.read()

        client = boto3.client('sagemaker-runtime')
        response = client.invoke_endpoint(EndpointName=model_endpoint,
                                          ContentType='image/jpeg',
                                          Accept='json',
                                          Body=bytearray(image))

        response = json.loads(response['Body'].read())
        detections = response['input.jpg']['detections']
        for det in detections:
            confidence = det['confidence']
            label = det['label'].lower()
            query = f"""INSERT INTO count (camera_id, label, confidence, time) VALUES ({camera_id}, '{label}', {confidence}, to_timestamp('{phenomenon_time}', 'YYYY-MM-DD HH24:MI:SS'))"""
            cur.execute(query)

    conn.commit()
    cur.close()
    conn.close()


def count_vehicles(event, context):
    phenomenon_time = datetime.now()
    camera_ids = [122, 107, 129, 95, 36, 75, 26, 32]
    process_image(camera_ids, phenomenon_time, 'vehicle-model-endpoint')


def count_humans(event, context):
    phenomenon_time = datetime.now()
    camera_ids = [122, 107, 129, 95, 36, 75, 26, 32]
    process_image(camera_ids, phenomenon_time, 'human-model-endpoint')


def count_bikes(event, context):
    phenomenon_time = datetime.now()
    camera_ids = [122, 107, 129, 95, 36, 75, 26, 32]
    process_image(camera_ids, phenomenon_time, 'bike-model-endpoint')
