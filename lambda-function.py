"""
Serverless Web Application - AWS Lambda Handler
Supports:
  - Atomic DynamoDB Visitor Counter
  - Full CRUD operations for Items
  - API Gateway v1/v2 and Lambda Function URL events
  - CORS preflight & response headers
  - Safe Decimal JSON serialization
"""

import os
import json
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError

# Configuration
TABLE_NAME = os.environ.get('TABLE_NAME', 'serverless-web-application-on-aws')
COUNTER_ID = '0'  # Retained for backward-compatibility with original schema

# DynamoDB client initialization
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle DynamoDB Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)


def build_response(status_code, body=None):
    """Helper to return API Gateway / Lambda Function URL compliant HTTP response with CORS."""
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    }
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, cls=DecimalEncoder) if body is not None else ''
    }


def parse_event(event):
    """Normalize method and path across REST API (v1), HTTP API (v2), and Function URLs."""
    http_method = event.get('httpMethod')
    if not http_method and 'requestContext' in event:
        http_method = event['requestContext'].get('http', {}).get('method')
    http_method = (http_method or 'GET').upper()

    path = event.get('path') or event.get('rawPath') or '/'

    path_parameters = event.get('pathParameters') or {}
    item_id = path_parameters.get('id')
    if not item_id and '/items/' in path:
        item_id = path.rstrip('/').split('/')[-1]

    raw_body = event.get('body')
    body = {}
    if raw_body:
        try:
            body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
        except Exception:
            body = {}

    return http_method, path, item_id, body


# --- Route Handlers ---

def handle_counter():
    """Atomically increment and return the visitor view counter."""
    try:
        response = table.update_item(
            Key={'id': COUNTER_ID},
            UpdateExpression='ADD #v :inc',
            ExpressionAttributeNames={'#v': 'views'},
            ExpressionAttributeValues={':inc': 1},
            ReturnValues='UPDATED_NEW'
        )
        views = int(response.get('Attributes', {}).get('views', 1))
        return build_response(200, {'views': views, 'success': True})
    except ClientError as e:
        print(f"DynamoDB Error updating counter: {e.response['Error']['Message']}")
        return build_response(500, {'error': 'Failed to increment view counter', 'details': str(e)})


def list_items():
    """List all items, excluding system metadata/counter keys."""
    try:
        response = table.scan()
        all_records = response.get('Items', [])
        items = [item for item in all_records if item.get('id') != COUNTER_ID and not item.get('id', '').startswith('counter_')]
        items.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        return build_response(200, {'items': items, 'count': len(items)})
    except ClientError as e:
        print(f"DynamoDB Error listing items: {e.response['Error']['Message']}")
        return build_response(500, {'error': 'Failed to retrieve items', 'details': str(e)})


def get_item(item_id):
    """Retrieve a single item by id."""
    try:
        response = table.get_item(Key={'id': item_id})
        item = response.get('Item')
        if not item or item.get('id') == COUNTER_ID:
            return build_response(404, {'error': f"Item with id '{item_id}' not found"})
        return build_response(200, {'item': item})
    except ClientError as e:
        print(f"DynamoDB Error fetching item: {e.response['Error']['Message']}")
        return build_response(500, {'error': 'Failed to fetch item', 'details': str(e)})


def create_item(data):
    """Create a new item in DynamoDB."""
    title = (data.get('title') or '').strip()
    if not title:
        return build_response(400, {'error': 'Title is required'})

    item_id = str(data.get('id') or uuid.uuid4())
    now = datetime.utcnow().isoformat() + 'Z'
    new_item = {
        'id': item_id,
        'title': title,
        'description': data.get('description', '').strip(),
        'status': data.get('status', 'active'),
        'category': data.get('category', 'general'),
        'createdAt': now,
        'updatedAt': now
    }

    try:
        table.put_item(Item=new_item)
        return build_response(201, {'message': 'Item created successfully', 'item': new_item})
    except ClientError as e:
        print(f"DynamoDB Error creating item: {e.response['Error']['Message']}")
        return build_response(500, {'error': 'Failed to create item', 'details': str(e)})


def update_item(item_id, data):
    """Update an existing item in DynamoDB."""
    if not item_id:
        return build_response(400, {'error': 'Item ID is required'})

    try:
        existing = table.get_item(Key={'id': item_id}).get('Item')
        if not existing or existing.get('id') == COUNTER_ID:
            return build_response(404, {'error': f"Item with id '{item_id}' not found"})
    except ClientError as e:
        return build_response(500, {'error': 'Failed to check item existence', 'details': str(e)})

    update_fields = {}
    if 'title' in data and data['title'].strip():
        update_fields['title'] = data['title'].strip()
    if 'description' in data:
        update_fields['description'] = data['description'].strip()
    if 'status' in data:
        update_fields['status'] = data['status']
    if 'category' in data:
        update_fields['category'] = data['category']
    update_fields['updatedAt'] = datetime.utcnow().isoformat() + 'Z'

    update_expr = "SET " + ", ".join([f"#{k} = :{k}" for k in update_fields.keys()])
    expr_names = {f"#{k}": k for k in update_fields.keys()}
    expr_values = {f":{k}": v for k, v in update_fields.items()}

    try:
        response = table.update_item(
            Key={'id': item_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        return build_response(200, {'message': 'Item updated successfully', 'item': response.get('Attributes')})
    except ClientError as e:
        print(f"DynamoDB Error updating item: {e.response['Error']['Message']}")
        return build_response(500, {'error': 'Failed to update item', 'details': str(e)})


def delete_item(item_id):
    """Delete an item by id."""
    if not item_id:
        return build_response(400, {'error': 'Item ID is required'})

    try:
        table.delete_item(Key={'id': item_id})
        return build_response(200, {'message': f"Item '{item_id}' deleted successfully", 'id': item_id})
    except ClientError as e:
        print(f"DynamoDB Error deleting item: {e.response['Error']['Message']}")
        return build_response(500, {'error': 'Failed to delete item', 'details': str(e)})


def lambda_handler(event, context):
    """Main AWS Lambda Handler routing requests."""
    print(f"Received event: {json.dumps(event) if isinstance(event, dict) else event}")

    if not event:
        return handle_counter()

    method, path, item_id, body = parse_event(event)

    if method == 'OPTIONS':
        return build_response(200, {'status': 'ok'})

    if path == '/views' or path == '/counter' or (path == '/' and method == 'GET' and not item_id):
        return handle_counter()

    if path.startswith('/items') or path.startswith('/api/items'):
        if method == 'GET':
            if item_id:
                return get_item(item_id)
            return list_items()
        elif method == 'POST':
            return create_item(body)
        elif method == 'PUT':
            return update_item(item_id, body)
        elif method == 'DELETE':
            return delete_item(item_id)
        else:
            return build_response(405, {'error': f"Method '{method}' not allowed on items"})

    if method == 'GET':
        return handle_counter()

    return build_response(404, {'error': f"Route '{method} {path}' not found"})
