# ☁️ Serverless Web Application on AWS

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?logo=github)](https://ankitkumar0009.github.io/serverless-web-application/)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange?logo=amazon-aws)](https://aws.amazon.com/lambda/)
[![Amazon DynamoDB](https://img.shields.io/badge/Amazon-DynamoDB-blue?logo=amazon-dynamodb)](https://aws.amazon.com/dynamodb/)
[![Amazon S3](https://img.shields.io/badge/Amazon-S3-red?logo=amazon-s3)](https://aws.amazon.com/s3/)
[![Amazon CloudFront](https://img.shields.io/badge/Amazon-CloudFront-purple?logo=amazon-aws)](https://aws.amazon.com/cloudfront/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-blueviolet?logo=terraform)](https://www.terraform.io/)
[![AWS SAM](https://img.shields.io/badge/IaC-AWS_SAM-red)](https://aws.amazon.com/serverless/sam/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🌐 **Live Web Demo**: [https://ankitkumar0009.github.io/serverless-web-application/](https://ankitkumar0009.github.io/serverless-web-application/)

A production-ready, highly scalable serverless web application built on **Amazon Web Services (AWS)**. Features an **atomic DynamoDB visitor counter**, a **full CRUD item management REST API**, **Infrastructure-as-Code (Terraform & SAM)**, automated **CI/CD via GitHub Actions**, and a **modern, responsive web dashboard**.

---

## 🏛️ System Architecture

```
                                  +-----------------------+
                                  |     User Browser      |
                                  +-----------+-----------+
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
            [Static Web Assets]                                    [REST API Calls]
                   |                                                     |
                   v                                                     v
      +------------------------+                           +------------------------+
      |    Amazon CloudFront   |                           |  Amazon API Gateway    |
      |     (Global CDN)       |                           |       (HTTP API)       |
      +-----------+------------+                           +-----------+------------+
                  |                                                    |
                  v                                                    v
      +------------------------+                           +------------------------+
      |       Amazon S3        |                           |       AWS Lambda       |
      | (Static Site Hosting)  |                           |     (Python 3.11)      |
      +------------------------+                           +-----------+------------+
                                                                       |
                                                                       v
                                                           +------------------------+
                                                           |    Amazon DynamoDB     |
                                                           |   (On-Demand Table)    |
                                                           +------------------------+
```

### Component Breakdown
1. **Frontend Hosting (S3 + CloudFront)**: Static HTML, CSS, and vanilla JavaScript hosted in an S3 bucket and distributed globally with HTTPS caching via Amazon CloudFront.
2. **API Gateway (HTTP API v2)**: Low-latency, cost-effective serverless entry point with full CORS configuration routing traffic to the backend.
3. **Compute (AWS Lambda)**: Python 3.11 microservice handling business logic, atomic counters, and CRUD transactions.
4. **Database (Amazon DynamoDB)**: Fully managed NoSQL database configured with on-demand (PAY_PER_REQUEST) capacity, sub-millisecond response times, and Point-in-Time Recovery (PITR).

---

## ✨ Key Enhancements & Features

- **🛡️ Atomic Visitor Counter**: Concurrency-safe view tracking using DynamoDB `update_item` expressions (`ADD views :inc`), eliminating race conditions present in traditional read-modify-write patterns.
- **⚡ Full RESTful CRUD API**: Complete item management (`GET`, `POST`, `PUT`, `DELETE`) with dynamic query routing, input validation, and proper HTTP status codes.
- **🚀 Dual Infrastructure-as-Code (IaC)**:
  - **Terraform**: Complete resource provisioning with least-privilege IAM roles and CloudFront CDN.
  - **AWS SAM**: Lightweight serverless deployment template for SAM CLI users.
- **💻 Local Dev & Offline Demo Mode**: Zero-dependency local Node.js server (`npm start`) with in-memory persistence and offline browser fallback—test without an active AWS account!
- **🎨 Modern Web UI**: Responsive glassmorphism interface featuring:
  - Live visitor counter with animated counter states.
  - Interactive greeting application.
  - Search and category filters.
  - Dynamic CRUD cards with modals and toast notifications.
  - Live API endpoint switcher in settings.
- **🔄 GitHub Actions CI/CD**: Automated linting, Python unit testing, Terraform validation, and static frontend deployments.

---

## 📁 Repository Structure

```
serverless-web-application/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD pipeline for tests and AWS deployment
├── backend/
│   ├── lambda_function.py        # Production AWS Lambda handler (CRUD + Counter)
│   └── test_lambda.py            # Unit tests with DynamoDB mocking
├── frontend/                     # Dedicated frontend asset folder
│   ├── index.html                # Modern dashboard layout
│   ├── style.css                 # Responsive stylesheet & animations
│   └── script.js                 # API client, CRUD actions, & demo state
├── terraform/                    # Infrastructure as Code
│   ├── main.tf                   # S3, CloudFront, Lambda, API Gateway, DynamoDB
│   ├── variables.tf              # Region and naming variables
│   ├── outputs.tf                # Endpoint URLs and resource identifiers
│   └── versions.tf               # Provider requirements
├── index.html                    # Root web entrypoint (for S3 / GitHub Pages)
├── style.css                     # Root stylesheet
├── script.js                     # Root JavaScript client
├── lambda-function.py            # Root Lambda handler copy
├── local-server.js               # Zero-dependency local mock API & static server
├── template.yaml                 # AWS SAM alternative IaC template
├── package.json                  # NPM scripts (npm start, npm test)
├── .gitignore                    # Environment and build artifact ignores
├── LICENSE                       # MIT License
└── README.md                     # Documentation
```

---

## 🚀 Quick Start (Local Development)

Test the frontend and mock backend locally in under 30 seconds without AWS credentials:

```bash
# 1. Clone the repository
git clone https://github.com/ankitkumar0009/serverless-web-application.git
cd serverless-web-application

# 2. Start the local server
npm start
# or: node local-server.js
```

Open your browser at **`http://localhost:3000`**. You can interact with the visitor counter, create items, search/filter, and edit/delete records!

---

## ☁️ Deployment Guide

### Option 1: Deploy with Terraform (Recommended)

Make sure you have [Terraform](https://developer.hashicorp.com/terraform/downloads) and the [AWS CLI](https://aws.amazon.com/cli/) configured (`aws configure`).

```bash
cd terraform

# Initialize providers
terraform init

# Review execution plan
terraform plan

# Deploy infrastructure
terraform apply -auto-approve
```

Once deployment completes, Terraform prints your live endpoints:
- `api_gateway_endpoint`: URL for your HTTP API.
- `cloudfront_domain_name`: HTTPS URL to view your web application.
- `s3_website_endpoint`: S3 static hosting bucket endpoint.

Upload frontend static assets to the S3 bucket:
```bash
aws s3 sync ../frontend/ s3://<s3_bucket_name>/
```

---

### Option 2: Deploy with AWS SAM

If you prefer the AWS Serverless Application Model (SAM):

```bash
# Build Lambda artifacts
sam build

# Deploy guided
sam deploy --guided
```

---

### Option 3: Manual Deployment (AWS Console)

<details>
<summary>Click to view step-by-step AWS Management Console instructions</summary>

1. **DynamoDB Table**:
   - Go to DynamoDB Console -> **Create table**.
   - Table name: `serverless-web-application-on-aws`.
   - Partition key: `id` (String).
   - Capacity: **On-demand**.

2. **Lambda Function**:
   - Go to Lambda Console -> **Create function**.
   - Runtime: Python 3.11.
   - Code: Paste contents of `backend/lambda_function.py`.
   - Permissions: Attach an IAM policy granting `dynamodb:*` on the created table and CloudWatch logs.
   - Environment variables: `TABLE_NAME` = `serverless-web-application-on-aws`.

3. **API Gateway (HTTP API)**:
   - Create an **HTTP API**.
   - Configure Lambda Integration pointing to your Lambda function.
   - Route: `$default` (or `/views` and `/items`).
   - CORS: Enable CORS with Allowed Origins `*`, Methods `GET, POST, PUT, DELETE, OPTIONS`.

4. **S3 Static Website**:
   - Create an S3 bucket (e.g. `my-serverless-webapp-bucket`).
   - Enable Static Website Hosting -> Index document: `index.html`.
   - Upload `index.html`, `style.css`, and `script.js`.
   - Paste your API Gateway URL into the frontend Settings modal or configure in `script.js`.

5. **CloudFront (Optional CDN)**:
   - Create distribution with origin pointing to your S3 website endpoint.
   - Default root object: `index.html`.
   - Redirect HTTP to HTTPS.

</details>

---

## 📡 REST API Reference

All requests accept and return `application/json`. CORS headers are attached to every response.

### 1. Atomic Visitor Counter
- **`GET /views`**
  - Increments and returns the current visitor count.
  - Response:
    ```json
    {
      "views": 105,
      "success": true
    }
    ```

### 2. List Items
- **`GET /items`**
  - Retrieves all active items sorted by creation time.
  - Response:
    ```json
    {
      "items": [
        {
          "id": "e4b2d56a-128b-4a57-9e48-8df0981971f1",
          "title": "Setup CloudFront CDN",
          "description": "Configure low-latency distribution with HTTPS",
          "category": "Architecture",
          "status": "completed",
          "createdAt": "2026-11-05T20:00:00Z",
          "updatedAt": "2026-11-05T20:00:00Z"
        }
      ],
      "count": 1
    }
    ```

### 3. Create Item
- **`POST /items`**
  - Request Body:
    ```json
    {
      "title": "Enable DynamoDB Backups",
      "description": "Enable automated point-in-time recovery",
      "category": "DevOps",
      "status": "active"
    }
    ```
  - Response (`201 Created`):
    ```json
    {
      "message": "Item created successfully",
      "item": { "id": "uuid", "title": "..." }
    }
    ```

### 4. Update Item
- **`PUT /items/{id}`**
  - Request Body:
    ```json
    {
      "status": "completed",
      "description": "Updated notes"
    }
    ```
  - Response (`200 OK`):
    ```json
    {
      "message": "Item updated successfully",
      "item": { ... }
    }
    ```

### 5. Delete Item
- **`DELETE /items/{id}`**
  - Response (`200 OK`):
    ```json
    {
      "message": "Item 'e4b2d56a-...' deleted successfully",
      "id": "e4b2d56a-..."
    }
    ```

---

## 🧪 Testing

Run backend unit tests with mocked DynamoDB:
```bash
python -m unittest discover -s backend -p "test_*.py"
```

Verify Terraform formatting:
```bash
cd terraform && terraform fmt -check
```

---

## 🔒 Security & Best Practices

- **Least-Privilege IAM**: The Lambda execution role has permissions restricted strictly to the required DynamoDB table and CloudWatch log group.
- **No Hardcoded Secrets**: Endpoints and table names are dynamically injected via environment variables (`TABLE_NAME`).
- **Race Condition Prevention**: Employs atomic DynamoDB update operations instead of separate read-then-write calls.
- **Pay-Per-Request Pricing**: Configured with DynamoDB On-Demand and Lambda 128MB memory—virtually 100% free under AWS Free Tier.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
