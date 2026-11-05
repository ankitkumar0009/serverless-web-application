"""
Unit Tests for Serverless Web Application Lambda Handler
Tests CRUD operations, counter increment, and CORS headers using unittest.mock.
"""

import os
import sys
import json
import unittest
from unittest.mock import MagicMock

# Configure dummy AWS environment variables BEFORE importing boto3 or handler
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['AWS_REGION'] = 'us-east-1'
os.environ['AWS_ACCESS_KEY_ID'] = 'testing-key-id'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing-secret-key'
os.environ['AWS_SECURITY_TOKEN'] = 'testing-token'
os.environ['AWS_SESSION_TOKEN'] = 'testing-session'
os.environ['TABLE_NAME'] = 'test-table'

# Ensure the backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import lambda_function


class TestLambdaHandler(unittest.TestCase):

    def setUp(self):
        # Reset mock table for each test
        self.mock_table = MagicMock()
        lambda_function.table = self.mock_table

    def test_cors_preflight(self):
        """Test OPTIONS preflight returns 200 with CORS headers."""
        event = {'httpMethod': 'OPTIONS', 'path': '/items'}
        response = lambda_function.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], '*')

    def test_handle_counter(self):
        """Test view counter atomic update."""
        self.mock_table.update_item.return_value = {
            'Attributes': {'views': 42}
        }
        event = {'httpMethod': 'GET', 'path': '/views'}
        response = lambda_function.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertEqual(body['views'], 42)
        self.assertTrue(body['success'])

    def test_list_items(self):
        """Test listing items excludes the counter entry."""
        self.mock_table.scan.return_value = {
            'Items': [
                {'id': '0', 'views': 10},
                {'id': 'item-1', 'title': 'First Item', 'createdAt': '2026-01-01T00:00:00Z'},
                {'id': 'item-2', 'title': 'Second Item', 'createdAt': '2026-01-02T00:00:00Z'}
            ]
        }
        event = {'httpMethod': 'GET', 'path': '/items'}
        response = lambda_function.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertEqual(body['count'], 2)
        self.assertEqual(body['items'][0]['id'], 'item-2')

    def test_create_item_valid(self):
        """Test creating an item with a valid title."""
        event = {
            'httpMethod': 'POST',
            'path': '/items',
            'body': json.dumps({'title': 'New Serverless Task', 'description': 'Automate deployment'})
        }
        response = lambda_function.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 201)
        body = json.loads(response['body'])
        self.assertEqual(body['item']['title'], 'New Serverless Task')
        self.mock_table.put_item.assert_called_once()

    def test_create_item_missing_title(self):
        """Test creating an item without a title returns 400 Bad Request."""
        event = {
            'httpMethod': 'POST',
            'path': '/items',
            'body': json.dumps({'description': 'Missing title'})
        }
        response = lambda_function.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 400)

    def test_delete_item(self):
        """Test deleting an item."""
        event = {
            'httpMethod': 'DELETE',
            'path': '/items/item-123',
            'pathParameters': {'id': 'item-123'}
        }
        response = lambda_function.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        self.mock_table.delete_item.assert_called_once_with(Key={'id': 'item-123'})


if __name__ == '__main__':
    unittest.main()
