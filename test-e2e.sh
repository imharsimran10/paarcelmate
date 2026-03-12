#!/bin/bash

# PaarcelMate E2E Test Script
# Tests all major API endpoints

BASE_URL="http://localhost:3000/api/v1"
TEST_EMAIL="e2e-test-$(date +%s)@example.com"
TEST_PASSWORD="Test123456!"
ACCESS_TOKEN=""
USER_ID=""
TRIP_ID=""
PARCEL_ID=""

echo "========================================="
echo "PaarcelMate E2E Testing"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=$5
    local headers=$6

    echo -e "${YELLOW}Testing: $name${NC}"

    if [ -z "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$body"
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_code, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "$body"
    fi
    echo ""

    # Return body for further processing
    echo "$body"
}

echo "1. HEALTH CHECK"
echo "---------------"
test_endpoint "Health Check" "GET" "/health" "" 200
echo ""

echo "2. AUTHENTICATION FLOW"
echo "----------------------"

# Send OTP
echo "Sending OTP to $TEST_EMAIL..."
test_endpoint "Send OTP" "POST" "/auth/send-otp" "{\"email\":\"$TEST_EMAIL\"}" 200

echo "⚠️  Check backend logs for OTP code (development mode)"
echo "Waiting 3 seconds..."
sleep 3

# In a real test, we'd extract OTP from logs or email
# For now, we'll test with a dummy OTP (will fail, but shows flow)
OTP="123456"

echo ""
echo "3. USER REGISTRATION"
echo "--------------------"
register_response=$(test_endpoint "Register User" "POST" "/auth/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\",\"phone\":\"+1234567890\"}" 201)

# Extract tokens if registration succeeded
if echo "$register_response" | grep -q "accessToken"; then
    ACCESS_TOKEN=$(echo "$register_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    USER_ID=$(echo "$register_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "✓ User registered successfully"
    echo "User ID: $USER_ID"
fi

echo ""
echo "4. USER LOGIN"
echo "-------------"
login_response=$(test_endpoint "Login" "POST" "/auth/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 200)

if echo "$login_response" | grep -q "accessToken"; then
    ACCESS_TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    echo "✓ Login successful"
    echo "Access Token: ${ACCESS_TOKEN:0:50}..."
fi

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}✗ No access token obtained. Cannot proceed with authenticated tests.${NC}"
    echo ""
    echo "SUMMARY"
    echo "======="
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    exit 1
fi

echo ""
echo "5. AUTHENTICATED ENDPOINTS"
echo "--------------------------"

# Get current user
test_endpoint "Get Current User" "GET" "/auth/me" "" 200 "Authorization: Bearer $ACCESS_TOKEN"

# Get user profile
test_endpoint "Get User Profile" "GET" "/users/profile" "" 200 "Authorization: Bearer $ACCESS_TOKEN"

# Get user statistics
test_endpoint "Get User Statistics" "GET" "/users/statistics" "" 200 "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo "6. TRIP MANAGEMENT"
echo "------------------"

# Create a trip
trip_data='{
  "origin": "New York",
  "destination": "Los Angeles",
  "departureDate": "2026-04-01T10:00:00Z",
  "arrivalDate": "2026-04-01T18:00:00Z",
  "availableSpace": "MEDIUM",
  "pricePerKg": 10,
  "maxParcelWeight": 5,
  "description": "Test trip from NY to LA"
}'

trip_response=$(test_endpoint "Create Trip" "POST" "/trips" "$trip_data" 201 "Authorization: Bearer $ACCESS_TOKEN")

if echo "$trip_response" | grep -q '"id"'; then
    TRIP_ID=$(echo "$trip_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "✓ Trip created with ID: $TRIP_ID"
fi

# List trips
test_endpoint "List User Trips" "GET" "/trips" "" 200 "Authorization: Bearer $ACCESS_TOKEN"

if [ ! -z "$TRIP_ID" ]; then
    # Get specific trip
    test_endpoint "Get Trip Details" "GET" "/trips/$TRIP_ID" "" 200 "Authorization: Bearer $ACCESS_TOKEN"
fi

echo ""
echo "7. PARCEL MANAGEMENT"
echo "--------------------"

# Create a parcel
parcel_data='{
  "title": "Test Package",
  "description": "Test parcel for E2E testing",
  "size": "SMALL",
  "weight": 2,
  "value": 100,
  "isFragile": false,
  "origin": "San Francisco",
  "destination": "Seattle",
  "pickupDate": "2026-04-15T09:00:00Z",
  "deliveryDeadline": "2026-04-20T17:00:00Z",
  "offeredPrice": 20
}'

parcel_response=$(test_endpoint "Create Parcel" "POST" "/parcels" "$parcel_data" 201 "Authorization: Bearer $ACCESS_TOKEN")

if echo "$parcel_response" | grep -q '"id"'; then
    PARCEL_ID=$(echo "$parcel_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "✓ Parcel created with ID: $PARCEL_ID"
fi

# List parcels
test_endpoint "List User Parcels" "GET" "/parcels" "" 200 "Authorization: Bearer $ACCESS_TOKEN"

if [ ! -z "$PARCEL_ID" ]; then
    # Get specific parcel
    test_endpoint "Get Parcel Details" "GET" "/parcels/$PARCEL_ID" "" 200 "Authorization: Bearer $ACCESS_TOKEN"
fi

echo ""
echo "8. NOTIFICATIONS"
echo "----------------"
test_endpoint "Get Notifications" "GET" "/notifications" "" 200 "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo "9. MESSAGES"
echo "-----------"
test_endpoint "Get Messages" "GET" "/messages" "" 200 "Authorization: Bearer $ACCESS_TOKEN"
test_endpoint "Get Unread Count" "GET" "/messages/unread-count" "" 200 "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    exit 1
fi
