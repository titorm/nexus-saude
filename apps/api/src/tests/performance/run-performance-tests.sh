#!/bin/bash

# Search Performance Testing Script
# Tests the search system performance with various query types and loads

echo "🚀 Starting Search Performance Tests"
echo "===================================="

# Configuration
API_URL="http://localhost:3001/api"
AUTH_TOKEN="" # Add authentication token if needed

# Test queries with different complexity levels
declare -a SIMPLE_QUERIES=(
    "diabetes"
    "patient"
    "consultation"
    "headache"
    "test"
)

declare -a COMPLEX_QUERIES=(
    "diabetes type 2 hypertension"
    "viral infection symptoms"
    "metformin lisinopril medication"
    "emergency consultation urgent"
    "follow up appointment"
)

declare -a PHRASE_QUERIES=(
    "\"diabetes type 2\""
    "\"viral infection\""
    "\"emergency consultation\""
    "\"follow up\""
    "\"regular check-up\""
)

# Function to test search endpoint performance
test_search_endpoint() {
    local query="$1"
    local endpoint="$2"
    local description="$3"
    
    echo "Testing: $description ($query)"
    
    # Run the search request and measure time
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}|%{time_total}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -X POST \
        "$API_URL$endpoint" \
        -d "{\"query\":\"$query\",\"limit\":50}")
    local end_time=$(date +%s%3N)
    
    # Parse response
    local http_code=$(echo "$response" | grep -o '[0-9]*|[0-9.]*$' | cut -d'|' -f1)
    local curl_time=$(echo "$response" | grep -o '[0-9]*|[0-9.]*$' | cut -d'|' -f2)
    local total_time=$((end_time - start_time))
    
    # Extract result count from JSON response
    local result_count=0
    local body=$(echo "$response" | sed 's/|[0-9.]*$//')
    if [[ $http_code == "200" ]]; then
        result_count=$(echo "$body" | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")
    fi
    
    # Display results
    if [[ $http_code == "200" ]]; then
        printf "  ✅ Status: %s | Time: %sms | Results: %s | Curl: %ss\n" \
            "$http_code" "$total_time" "$result_count" "$curl_time"
    else
        printf "  ❌ Status: %s | Time: %sms | Error\n" "$http_code" "$total_time"
    fi
    
    # Return metrics for aggregation
    echo "$total_time,$result_count,$http_code" >> /tmp/performance_metrics.csv
}

# Function to test autocomplete performance
test_autocomplete() {
    local query="$1"
    
    echo "Testing autocomplete: $query"
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}|%{time_total}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$API_URL/search/autocomplete?query=$query&limit=10")
    local end_time=$(date +%s%3N)
    
    local http_code=$(echo "$response" | grep -o '[0-9]*|[0-9.]*$' | cut -d'|' -f1)
    local total_time=$((end_time - start_time))
    
    if [[ $http_code == "200" ]]; then
        printf "  ✅ Autocomplete: %s | Time: %sms\n" "$query" "$total_time"
    else
        printf "  ❌ Autocomplete: %s | Time: %sms | Error: %s\n" "$query" "$total_time" "$http_code"
    fi
}

# Function to run concurrent tests
run_concurrent_tests() {
    local query="$1"
    local concurrent_users="$2"
    
    echo "Testing concurrent load: $concurrent_users users searching '$query'"
    
    # Create temporary script for concurrent execution
    cat > /tmp/concurrent_test.sh << EOF
#!/bin/bash
curl -s -w "%{time_total}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -X POST \
    "$API_URL/search/global" \
    -d '{"query":"$query","limit":20}' > /dev/null
EOF
    chmod +x /tmp/concurrent_test.sh
    
    local start_time=$(date +%s%3N)
    
    # Run concurrent requests
    for ((i=1; i<=concurrent_users; i++)); do
        /tmp/concurrent_test.sh &
    done
    
    # Wait for all background jobs to complete
    wait
    
    local end_time=$(date +%s%3N)
    local total_time=$((end_time - start_time))
    
    printf "  ✅ Concurrent test completed in %sms (%s users)\n" "$total_time" "$concurrent_users"
    
    # Cleanup
    rm -f /tmp/concurrent_test.sh
}

# Initialize metrics file
echo "test_time_ms,result_count,http_code" > /tmp/performance_metrics.csv

echo ""
echo "🔍 Testing Simple Queries"
echo "------------------------"
for query in "${SIMPLE_QUERIES[@]}"; do
    test_search_endpoint "$query" "/search/global" "Simple query"
    sleep 0.5
done

echo ""
echo "🧠 Testing Complex Queries"
echo "-------------------------"
for query in "${COMPLEX_QUERIES[@]}"; do
    test_search_endpoint "$query" "/search/global" "Complex query"
    sleep 0.5
done

echo ""
echo "📝 Testing Phrase Queries"
echo "------------------------"
for query in "${PHRASE_QUERIES[@]}"; do
    test_search_endpoint "$query" "/search/global" "Phrase query"
    sleep 0.5
done

echo ""
echo "🎯 Testing Entity-Specific Searches"
echo "----------------------------------"
test_search_endpoint "patient" "/search/patients" "Patient search"
test_search_endpoint "diabetes" "/search/clinical-notes" "Clinical notes search"
test_search_endpoint "consultation" "/search/appointments" "Appointments search"

echo ""
echo "⚡ Testing Autocomplete"
echo "---------------------"
test_autocomplete "pat"
test_autocomplete "diab"
test_autocomplete "cons"
test_autocomplete "emerg"

echo ""
echo "👥 Testing Concurrent Load"
echo "-------------------------"
run_concurrent_tests "diabetes" 5
run_concurrent_tests "patient" 10
run_concurrent_tests "consultation" 20

echo ""
echo "📊 Performance Analysis"
echo "======================"

# Analyze metrics
if [[ -f /tmp/performance_metrics.csv ]]; then
    total_tests=$(tail -n +2 /tmp/performance_metrics.csv | wc -l)
    avg_time=$(tail -n +2 /tmp/performance_metrics.csv | cut -d',' -f1 | awk '{sum+=$1} END {printf "%.2f", sum/NR}')
    max_time=$(tail -n +2 /tmp/performance_metrics.csv | cut -d',' -f1 | sort -n | tail -1)
    min_time=$(tail -n +2 /tmp/performance_metrics.csv | cut -d',' -f1 | sort -n | head -1)
    fast_queries=$(tail -n +2 /tmp/performance_metrics.csv | awk -F',' '$1 < 100' | wc -l)
    slow_queries=$(tail -n +2 /tmp/performance_metrics.csv | awk -F',' '$1 > 1000' | wc -l)
    error_count=$(tail -n +2 /tmp/performance_metrics.csv | awk -F',' '$3 != 200' | wc -l)
    
    echo "Total tests: $total_tests"
    echo "Average response time: ${avg_time}ms"
    echo "Min response time: ${min_time}ms"
    echo "Max response time: ${max_time}ms"
    echo "Fast queries (<100ms): $fast_queries"
    echo "Slow queries (>1000ms): $slow_queries"
    echo "Errors: $error_count"
    
    # Performance rating
    fast_percentage=$((fast_queries * 100 / total_tests))
    
    echo ""
    if [[ $fast_percentage -gt 80 ]]; then
        echo "🟢 Performance Rating: EXCELLENT ($fast_percentage% fast queries)"
    elif [[ $fast_percentage -gt 60 ]]; then
        echo "🟡 Performance Rating: GOOD ($fast_percentage% fast queries)"
    elif [[ $fast_percentage -gt 40 ]]; then
        echo "🟠 Performance Rating: FAIR ($fast_percentage% fast queries)"
    else
        echo "🔴 Performance Rating: NEEDS IMPROVEMENT ($fast_percentage% fast queries)"
    fi
    
    echo ""
    echo "💡 Recommendations:"
    if [[ $slow_queries -gt 0 ]]; then
        echo "  ⚠️  Optimize slow queries - consider database indexing"
    fi
    if [[ $error_count -gt 0 ]]; then
        echo "  ⚠️  Fix error responses - check API implementation"
    fi
    if [[ $(echo "$avg_time > 200" | bc -l) -eq 1 ]]; then
        echo "  ⚠️  Average response time is high - consider caching"
    fi
    echo "  ✅ Monitor performance in production environments"
    echo "  ✅ Set up alerting for response times > 500ms"
    echo "  ✅ Implement query optimization based on usage patterns"
    
    # Save detailed report
    echo ""
    echo "📄 Detailed metrics saved to: /tmp/performance_metrics.csv"
    echo "   You can analyze this data further with spreadsheet tools"
fi

# Cleanup
rm -f /tmp/performance_metrics.csv

echo ""
echo "✅ Performance testing completed!"