#!/bin/bash
set -euo pipefail

# ============================================================
# System Architecture — AWS Full Deployment Script
# ============================================================
# This script sets up:
#   1. S3 data bucket
#   2. IAM role for Lambda
#   3. Auth Lambda function
#   4. Chat Lambda function
#   5. API Gateway (HTTP API) with custom domain
#
# Prerequisites:
#   - AWS CLI v2 configured (aws configure)
#   - Node.js 22+
#   - A domain managed by Route 53
#
# Usage:
#   export JWT_SECRET="$(openssl rand -base64 32)"
#   export OPENAI_API_KEY="sk-..."
#   bash scripts/deploy-aws.sh
# ============================================================

REGION="eu-west-2"
BUCKET="sa-classroom-data"
ROLE_NAME="sa-lambda-role"
AUTH_FN="sa-auth"
CHAT_FN="sa-chat"
API_NAME="sa-api"
CUSTOM_DOMAIN="api.system-design.hillmanchan.com"

# Directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo " System Architecture — AWS Deployment"
echo "========================================"

# ---- Validate env vars ----
if [ -z "${JWT_SECRET:-}" ]; then
  echo "ERROR: JWT_SECRET not set."
  echo "Run: export JWT_SECRET=\"\$(openssl rand -base64 32)\""
  exit 1
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "ERROR: OPENAI_API_KEY not set."
  echo "Run: export OPENAI_API_KEY=\"sk-...\""
  exit 1
fi

if [ -z "${FIREBASE_SERVICE_ACCOUNT:-}" ]; then
  echo "ERROR: FIREBASE_SERVICE_ACCOUNT not set (base64-encoded service account JSON)."
  echo "Run: export FIREBASE_SERVICE_ACCOUNT=\"\$(base64 < path/to/serviceAccountKey.json)\""
  exit 1
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo ""

# ============================================================
# Step 1: S3 Data Bucket
# ============================================================
echo "--- Step 1: S3 Bucket ---"

if aws s3 ls "s3://$BUCKET" 2>/dev/null; then
  echo "Bucket $BUCKET already exists."
else
  aws s3 mb "s3://$BUCKET" --region "$REGION"
  echo "Created bucket $BUCKET."
fi

# Block all public access
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  2>/dev/null || true

# Upload data files
aws s3 cp "$ROOT_DIR/lambda/data/users.json" "s3://$BUCKET/users.json"
echo "Uploaded users.json"

# Generate and upload topic-index.json
echo "Generating topic-index.json..."
cd "$ROOT_DIR" && node scripts/generate-topic-index.mjs
aws s3 cp "$ROOT_DIR/topic-index.json" "s3://$BUCKET/topic-index.json"
echo "Uploaded topic-index.json"
echo ""

# ============================================================
# Step 2: IAM Role
# ============================================================
echo "--- Step 2: IAM Role ---"

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null; then
  echo "Role $ROLE_NAME already exists."
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$ROOT_DIR/lambda/iam/trust-policy.json"
  echo "Created role $ROLE_NAME."

  # Wait for role to propagate
  echo "Waiting for IAM role propagation..."
  sleep 10
fi

# Attach Lambda execution policy
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || true

# Attach custom S3 read policy
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name s3-read-sa-data \
  --policy-document "file://$ROOT_DIR/lambda/iam/s3-read-policy.json"

echo "IAM policies attached."
echo ""

# ============================================================
# Step 3: Auth Lambda
# ============================================================
echo "--- Step 3: Auth Lambda ---"

# Package (install deps for firebase-admin)
cd "$ROOT_DIR/lambda/auth"
npm install --omit=dev --silent
cd "$ROOT_DIR/lambda/auth" && zip -r /tmp/sa-auth.zip index.mjs package.json node_modules/
cd "$ROOT_DIR"

if aws lambda get-function --function-name "$AUTH_FN" --region "$REGION" 2>/dev/null; then
  echo "Updating existing $AUTH_FN..."
  aws lambda update-function-code \
    --function-name "$AUTH_FN" \
    --zip-file "fileb:///tmp/sa-auth.zip" \
    --region "$REGION" > /dev/null

  aws lambda wait function-updated --function-name "$AUTH_FN" --region "$REGION"

  aws lambda update-function-configuration \
    --function-name "$AUTH_FN" \
    --environment "Variables={DATA_BUCKET=$BUCKET,JWT_SECRET=$JWT_SECRET,FIREBASE_SERVICE_ACCOUNT=$FIREBASE_SERVICE_ACCOUNT}" \
    --region "$REGION" > /dev/null
else
  aws lambda create-function \
    --function-name "$AUTH_FN" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "$ROLE_ARN" \
    --zip-file "fileb:///tmp/sa-auth.zip" \
    --environment "Variables={DATA_BUCKET=$BUCKET,JWT_SECRET=$JWT_SECRET,FIREBASE_SERVICE_ACCOUNT=$FIREBASE_SERVICE_ACCOUNT}" \
    --region "$REGION" \
    --timeout 10 \
    --memory-size 256 > /dev/null
  echo "Created $AUTH_FN."
fi

echo "Auth Lambda ready."
echo ""

# ============================================================
# Step 4: Chat Lambda
# ============================================================
echo "--- Step 4: Chat Lambda ---"

cd "$ROOT_DIR/lambda/chat"
npm install --omit=dev --silent
zip -r /tmp/sa-chat.zip index.mjs package.json node_modules/
cd "$ROOT_DIR"

if aws lambda get-function --function-name "$CHAT_FN" --region "$REGION" 2>/dev/null; then
  echo "Updating existing $CHAT_FN..."
  aws lambda update-function-code \
    --function-name "$CHAT_FN" \
    --zip-file "fileb:///tmp/sa-chat.zip" \
    --region "$REGION" > /dev/null

  aws lambda wait function-updated --function-name "$CHAT_FN" --region "$REGION"

  aws lambda update-function-configuration \
    --function-name "$CHAT_FN" \
    --environment "Variables={DATA_BUCKET=$BUCKET,JWT_SECRET=$JWT_SECRET,OPENAI_API_KEY=$OPENAI_API_KEY,FIREBASE_SERVICE_ACCOUNT=$FIREBASE_SERVICE_ACCOUNT}" \
    --region "$REGION" > /dev/null
else
  aws lambda create-function \
    --function-name "$CHAT_FN" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "$ROLE_ARN" \
    --zip-file "fileb:///tmp/sa-chat.zip" \
    --environment "Variables={DATA_BUCKET=$BUCKET,JWT_SECRET=$JWT_SECRET,OPENAI_API_KEY=$OPENAI_API_KEY,FIREBASE_SERVICE_ACCOUNT=$FIREBASE_SERVICE_ACCOUNT}" \
    --region "$REGION" \
    --timeout 30 \
    --memory-size 256 > /dev/null
  echo "Created $CHAT_FN."
fi

echo "Chat Lambda ready."
echo ""

# ============================================================
# Step 5: API Gateway (HTTP API)
# ============================================================
echo "--- Step 5: API Gateway ---"

# Check if API already exists
EXISTING_API=$(aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Name=='$API_NAME'].ApiId" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_API" ] && [ "$EXISTING_API" != "None" ]; then
  API_ID="$EXISTING_API"
  echo "Using existing API: $API_ID"
else
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --cors-configuration \
      AllowOrigins="https://system-design.hillmanchan.com",AllowHeaders="Content-Type,Authorization",AllowMethods="POST,OPTIONS",MaxAge=86400 \
    --region "$REGION" \
    --query "ApiId" --output text)
  echo "Created API: $API_ID"
fi

API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

# Auth Integration
AUTH_INT_ID=$(aws apigatewayv2 create-integration \
  --api-id "$API_ID" \
  --integration-type AWS_PROXY \
  --integration-uri "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${AUTH_FN}" \
  --payload-format-version 2.0 \
  --region "$REGION" \
  --query "IntegrationId" --output text 2>/dev/null || echo "")

if [ -n "$AUTH_INT_ID" ]; then
  # Create or update route
  EXISTING_AUTH_ROUTE=$(aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" \
    --query "Items[?RouteKey=='POST /auth/login'].RouteId" --output text 2>/dev/null || echo "")

  if [ -z "$EXISTING_AUTH_ROUTE" ] || [ "$EXISTING_AUTH_ROUTE" = "None" ]; then
    aws apigatewayv2 create-route \
      --api-id "$API_ID" \
      --route-key "POST /auth/login" \
      --target "integrations/$AUTH_INT_ID" \
      --region "$REGION" > /dev/null
    echo "Created route: POST /auth/login"
  fi
fi

# Chat Integration
CHAT_INT_ID=$(aws apigatewayv2 create-integration \
  --api-id "$API_ID" \
  --integration-type AWS_PROXY \
  --integration-uri "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${CHAT_FN}" \
  --payload-format-version 2.0 \
  --region "$REGION" \
  --query "IntegrationId" --output text 2>/dev/null || echo "")

if [ -n "$CHAT_INT_ID" ]; then
  EXISTING_CHAT_ROUTE=$(aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" \
    --query "Items[?RouteKey=='POST /ai/chat'].RouteId" --output text 2>/dev/null || echo "")

  if [ -z "$EXISTING_CHAT_ROUTE" ] || [ "$EXISTING_CHAT_ROUTE" = "None" ]; then
    aws apigatewayv2 create-route \
      --api-id "$API_ID" \
      --route-key "POST /ai/chat" \
      --target "integrations/$CHAT_INT_ID" \
      --region "$REGION" > /dev/null
    echo "Created route: POST /ai/chat"
  fi
fi

# Create default stage with auto-deploy
aws apigatewayv2 create-stage \
  --api-id "$API_ID" \
  --stage-name '$default' \
  --auto-deploy \
  --region "$REGION" > /dev/null 2>&1 || true

# Grant API Gateway permission to invoke Lambdas
aws lambda add-permission \
  --function-name "$AUTH_FN" \
  --statement-id "apigateway-auth-${API_ID}" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
  --region "$REGION" 2>/dev/null || true

aws lambda add-permission \
  --function-name "$CHAT_FN" \
  --statement-id "apigateway-chat-${API_ID}" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
  --region "$REGION" 2>/dev/null || true

echo ""

# ============================================================
# Done
# ============================================================
echo "========================================"
echo " Deployment Complete!"
echo "========================================"
echo ""
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "Routes:"
echo "  POST $API_ENDPOINT/auth/login"
echo "  POST $API_ENDPOINT/ai/chat"
echo ""
echo "Test auth:"
echo "  curl -X POST $API_ENDPOINT/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"hillman@example.com\",\"code\":\"SA2026-ALPHA\"}'"
echo ""
echo "========================================"
echo " NEXT STEPS"
echo "========================================"
echo ""
echo "1. Set up custom domain (api.system-design.hillmanchan.com):"
echo "   - Request ACM certificate in $REGION for $CUSTOM_DOMAIN"
echo "   - Create custom domain in API Gateway"
echo "   - Add CNAME/A record in Route 53"
echo ""
echo "   OR update API_BASE in index.html to use the raw endpoint:"
echo "   const API_BASE = '$API_ENDPOINT';"
echo ""
echo "2. Update your real email in users.json:"
echo "   node scripts/add-user.mjs your-real@email.com"
echo ""
echo "3. Save your JWT_SECRET securely (password manager):"
echo "   echo \$JWT_SECRET"
echo ""
