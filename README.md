# TaskMatrix

This repository contains a small Todo application implemented with AWS serverless components:

- Backend: AWS Lambda (Python) + API Gateway
- Storage: DynamoDB (NoSQL)
- Frontend: Static site (vanilla JS) hosted on S3 as a website

This project uses the Serverless Framework to deploy AWS resources (functions, API, DynamoDB table and S3 website).

Prerequisites
- Node.js (for Serverless Framework CLI)
- Python 3.9+ (for Lambda code local lint/tests)
- Serverless Framework CLI (npm i -g serverless)
- AWS CLI configured with credentials (aws configure)

Quick overview
1. Edit the frontend `frontend/app.js` and replace the placeholder API URL with the API Gateway invoke URL (or use the value printed by `serverless deploy`).
2. Deploy backend (creates API + DynamoDB + S3 bucket):

```bash
# from the backend folder
cd backend
serverless deploy
```

3. Upload frontend files to the S3 website bucket created by CloudFormation. The bucket name and website URL are printed in the `serverless deploy` outputs. Example:

```bash
# from repository root
aws s3 sync frontend/ s3://<YOUR_WEBSITE_BUCKET_NAME>/ --acl public-read
```

Files
- `backend/serverless.yml` — Serverless Framework config (resources, functions, API routes, outputs)
- `backend/handler.py` — Lambda handlers for todos (create, list, update, delete)
- `backend/requirements.txt` — Python dependencies
- `frontend/` — static SPA files (index.html, app.js, style.css)

Notes & next steps
- The frontend includes a placeholder API URL; after deploying the backend, copy the API URL shown by Serverless into `frontend/app.js` (see README section "Configure frontend").
- The Serverless stack creates an S3 bucket for hosting the website. The README shows how to sync the frontend.

Security
- This example enables public read on the website bucket (for demo only). For production, use CloudFront + OAI and consider locking down permissions.

If you want, I can: deploy to your account (requires your AWS credentials/config in this environment) or run a local test harness for the Lambda handlers.

