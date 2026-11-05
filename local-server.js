/**
 * Local Development Server for Serverless Web Application
 * Zero-dependency Node.js HTTP server providing:
 *   1. Static file hosting (index.html, style.css, script.js)
 *   2. Complete local mock REST API simulating AWS Lambda + DynamoDB
 *
 * Usage:
 *   node local-server.js
 *   or: npm start
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

// In-memory mock database
const db = {
  views: 128,
  items: [
    {
      id: 'mock-1',
      title: 'Design Cloud Architecture Diagram',
      description: 'Create multi-tier serverless architecture with S3, CloudFront, Lambda, and DynamoDB.',
      status: 'completed',
      category: 'Architecture',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'mock-2',
      title: 'Deploy Infrastructure via Terraform',
      description: 'Provision AWS IAM roles, DynamoDB table with on-demand capacity, and HTTP API Gateway.',
      status: 'in-progress',
      category: 'DevOps',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'mock-3',
      title: 'Configure GitHub Actions CI/CD',
      description: 'Automate static frontend deployment to AWS S3 and invalidate CloudFront edge caches.',
      status: 'active',
      category: 'CI/CD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));
}

function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  // --- API Routes ---

  // Visitor Counter
  if (pathname === '/views' || pathname === '/counter' || pathname === '/api/views') {
    if (method === 'GET' || method === 'POST') {
      db.views += 1;
      return sendJson(res, 200, { views: db.views, success: true, localMock: true });
    }
  }

  // Items CRUD
  if (pathname === '/items' || pathname === '/api/items') {
    if (method === 'GET') {
      return sendJson(res, 200, { items: db.items, count: db.items.length, localMock: true });
    }

    if (method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.title || !body.title.trim()) {
        return sendJson(res, 400, { error: 'Title is required' });
      }
      const newItem = {
        id: body.id || 'item-' + crypto.randomBytes(4).toString('hex'),
        title: body.title.trim(),
        description: (body.description || '').trim(),
        status: body.status || 'active',
        category: body.category || 'general',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.items.unshift(newItem);
      return sendJson(res, 201, { message: 'Item created successfully', item: newItem, localMock: true });
    }
  }

  // Item single item operations
  const itemMatch = pathname.match(/^\/(?:api\/)?items\/([a-zA-Z0-9_-]+)$/);
  if (itemMatch) {
    const itemId = itemMatch[1];
    const index = db.items.findIndex(i => i.id === itemId);

    if (method === 'GET') {
      if (index === -1) return sendJson(res, 404, { error: `Item '${itemId}' not found` });
      return sendJson(res, 200, { item: db.items[index], localMock: true });
    }

    if (method === 'PUT') {
      if (index === -1) return sendJson(res, 404, { error: `Item '${itemId}' not found` });
      const body = await parseRequestBody(req);
      if (body.title && body.title.trim()) db.items[index].title = body.title.trim();
      if (body.description !== undefined) db.items[index].description = body.description.trim();
      if (body.status) db.items[index].status = body.status;
      if (body.category) db.items[index].category = body.category;
      db.items[index].updatedAt = new Date().toISOString();
      return sendJson(res, 200, { message: 'Item updated successfully', item: db.items[index], localMock: true });
    }

    if (method === 'DELETE') {
      if (index === -1) return sendJson(res, 404, { error: `Item '${itemId}' not found` });
      db.items.splice(index, 1);
      return sendJson(res, 200, { message: `Item '${itemId}' deleted successfully`, id: itemId, localMock: true });
    }
  }

  // --- Static File Serving ---
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Serverless Web App Local Dev Server is running!`);
  console.log(`👉 Web Interface:  http://localhost:${PORT}`);
  console.log(`👉 Mock API Base:   http://localhost:${PORT}`);
  console.log(`👉 View Counter:    http://localhost:${PORT}/views`);
  console.log(`👉 Items Endpoint:  http://localhost:${PORT}/items`);
  console.log(`=======================================================`);
});
