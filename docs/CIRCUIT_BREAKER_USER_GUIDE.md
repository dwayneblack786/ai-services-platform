# Circuit Breaker Pattern - User Guide

📑 **Table of Contents**
- [What is a Circuit Breaker?](#what-is-a-circuit-breaker)
- [🚦 Circuit States Explained](#-circuit-states-explained)
  - [✅ CLOSED (Green Badge - "Service Healthy")](#-closed-green-badge---service-healthy)
  - [⚠️ OPEN (Red Badge - "Service Degraded")](#️-open-red-badge---service-degraded)
  - [🔄 HALF_OPEN (Yellow Badge - "Service Recovering")](#-half_open-yellow-badge---service-recovering)
- [📊 Understanding the Circuit Monitor](#-understanding-the-circuit-monitor)
  - [Badge Location](#badge-location)
  - [Badge Colors](#badge-colors)
  - [Viewing Statistics](#viewing-statistics)
  - [Resetting the Circuit](#resetting-the-circuit)
- [🔄 How Circuit Breaker Works (Timeline)](#-how-circuit-breaker-works-timeline)
  - [Scenario: Backend Service Goes Down](#scenario-backend-service-goes-down)
  - [Scenario: Backend Service Comes Back Online](#scenario-backend-service-comes-back-online)
- [⚙️ Configuration](#️-configuration)
  - [Thresholds](#thresholds)
  - [What Counts as a Failure?](#what-counts-as-a-failure)
  - [What Doesn't Count as a Failure?](#what-doesnt-count-as-a-failure)
- [🎯 Best Practices](#-best-practices)
  - [For End Users](#for-end-users)
  - [For Developers](#for-developers)
- [🐛 Troubleshooting](#-troubleshooting)
  - [Badge is Red but Backend is Running](#badge-is-red-but-backend-is-running)
  - [Badge Won't Turn Green After Reset](#badge-wont-turn-green-after-reset)
  - [Circuit Opens Immediately on Page Load](#circuit-opens-immediately-on-page-load)
- [📈 Monitoring Tips](#-monitoring-tips)
  - [Check Circuit Health](#check-circuit-health)
  - [When to Alert](#when-to-alert)
  - [Logging](#logging)
- [🎓 Key Concepts](#-key-concepts)
  - [Why "CLOSED" is Good?](#why-closed-is-good)
  - [Why Block Requests When Service is Down?](#why-block-requests-when-service-is-down)
  - [Why Wait 30 Seconds?](#why-wait-30-seconds)
- [📞 Support](#-support)
- [🔗 Related Documentation](#-related-documentation)

---

## What is a Circuit Breaker?

The circuit breaker protects your application from cascading failures when backend services become unavailable. Think of it like an electrical circuit breaker in your home - it "trips" to prevent damage when there's a problem.

---

## 🚦 Circuit States Explained

### ✅ CLOSED (Green Badge - "Service Healthy")
**What it means:** Everything is working normally
- All API requests flow through
- Backend services are responding
- No issues detected

**What you see:**
- Green badge in header: "Service Healthy"
- Success rate: 100% or high percentage
- All features work normally

---

### ⚠️ OPEN (Red Badge - "Service Degraded")
**What it means:** Backend service has failed repeatedly
- Circuit has "tripped" after 5 consecutive failures
- All requests are blocked for 30 seconds
- Fast-fail responses prevent long timeouts
- Protects system from cascading failures

**What you see:**
- Red badge in header: "Service Degraded"
- Warning message in affected features
- Automatic retry countdown

**What happens:**
- You'll see fallback messages like "Service temporarily unavailable"
- Chat might show "I apologize, but I'm temporarily unable to process your message"
- After 30 seconds, circuit automatically tries to recover

---

### 🔄 HALF_OPEN (Yellow Badge - "Service Recovering")
**What it means:** Circuit is testing if service is back online
- Allows 1-2 test requests through
- If they succeed → Circuit goes back to CLOSED (green)
- If they fail → Circuit goes back to OPEN (red) for another 30 seconds

**What you see:**
- Yellow badge in header: "Service Recovering"
- Some requests might work, others might not

---

## 📊 Understanding the Circuit Monitor

### Badge Location
Look in the **top-right corner** of every page, next to the settings dropdown.

### Badge Colors
- **Green** 🟢 = All systems operational
- **Yellow** 🟡 = Testing service recovery
- **Red** 🔴 = Service temporarily unavailable

### Viewing Statistics
1. **Click the badge** to open the dropdown
2. You'll see:
   - **State**: CLOSED/OPEN/HALF_OPEN
   - **Success Rate**: Percentage of successful API calls
   - **Total Requests**: All API calls made
   - **Failures**: Number of failed requests
   - **Successes**: Number of successful requests
   - **Last Failure**: Timestamp of most recent failure

### Resetting the Circuit
1. Click the badge to open dropdown
2. Click **"🔧 Reset Circuit"** (red badge) or **"↻ Clear Stats"** (green badge)
3. Circuit immediately closes and stats clear
4. Badge should turn green within 2 seconds

---

## 🔄 How Circuit Breaker Works (Timeline)

### Scenario: Backend Service Goes Down

```
Time 0s:   API request fails → Green badge (1 failure counted)
Time 1s:   API request fails → Green badge (2 failures)
Time 2s:   API request fails → Green badge (3 failures)
Time 3s:   API request fails → Green badge (4 failures)
Time 4s:   API request fails → RED BADGE (5 failures, circuit OPENS)
           ⬇️
           All requests blocked with fast-fail for 30 seconds
           ⬇️
Time 34s:  Circuit tries test request → YELLOW BADGE (HALF_OPEN)
           ⬇️
           If success → GREEN BADGE (circuit CLOSED)
           If failure → RED BADGE (another 30s timeout)
```

### Scenario: Backend Service Comes Back Online

```
Circuit is OPEN (red badge)
           ⬇️
Wait 30 seconds (automatic)
           ⬇️
Circuit goes HALF_OPEN (yellow badge)
           ⬇️
Next API request succeeds
           ⬇️
Circuit goes CLOSED (green badge)
           ⬇️
All features work normally again
```

---

## ⚙️ Configuration

### Thresholds
- **Failure Threshold**: 5 consecutive failures to open circuit
- **Success Threshold**: 2 consecutive successes to close circuit
- **Timeout**: 30 seconds before retry
- **Retry Strategy**: Exponential backoff (1s → 2s → 4s)

### What Counts as a Failure?
- Network errors (can't reach server)
- 500-level server errors (backend crashes)
- Request timeouts (>10 seconds)

### What Doesn't Count as a Failure?
- 400-level client errors (bad request, unauthorized)
- Successful responses with error data
- Validation errors

---

## 🎯 Best Practices

### For End Users

**If you see a red badge:**
1. **Wait 30 seconds** - Circuit will auto-retry
2. **Try your action again** - It might work after recovery
3. **Manual reset** - Click badge → Reset Circuit (if you know backend is fixed)

**Don't:**
- Spam the reset button
- Refresh the page repeatedly
- Try the same action immediately after failure

### For Developers

**When developing:**
1. **Start backend before frontend** to avoid initial circuit opening
2. **Check the badge** to see if your backend is responding
3. **Use the dropdown stats** to debug API issues
4. **Reset circuit** after fixing backend issues

**When deploying:**
1. Ensure all backend services start before frontend
2. Monitor circuit state in production
3. Set up alerts for OPEN circuit states
4. Review failure patterns in stats

---

## 🐛 Troubleshooting

### Badge is Red but Backend is Running

**Check:**
1. Is backend on the correct port? (default: 5000)
2. Is MongoDB connected?
3. Are there CORS errors? (Check browser console F12)
4. Is the API URL correct? (`frontend/.env` → `VITE_API_URL`)

**Fix:**
1. Click badge → Reset Circuit
2. Refresh the page
3. Check browser console (F12 → Console) for errors
4. Check backend logs for errors

### Badge Won't Turn Green After Reset

**Possible causes:**
1. Backend still not responding
2. MongoDB connection issue
3. CORS configuration problem

**Fix:**
1. Test backend directly: `curl http://localhost:5000/api/health`
2. Check backend logs
3. Restart backend service
4. Clear browser cache and refresh

### Circuit Opens Immediately on Page Load

**Cause:** Frontend loaded before backend was ready

**Fix:**
1. Start backend first: `cd backend-node && npm start`
2. Wait for "Server running" message
3. Then start frontend: `cd frontend && npm run dev`
4. Click badge → Reset Circuit

---

## 📈 Monitoring Tips

### Check Circuit Health
- Badge updates **every 2 seconds** automatically
- Click badge to see detailed stats
- Monitor success rate percentage
- Watch failure count trends

### When to Alert
- Circuit stays OPEN for >5 minutes
- Success rate drops below 90%
- Frequent OPEN/HALF_OPEN transitions

### Logging
Circuit state changes are logged to browser console:
```
[CircuitBreaker:BackendAPI] Initialized
[CircuitBreaker:BackendAPI] Circuit OPENED until 10:30:45 PM
[CircuitBreaker:BackendAPI] Circuit CLOSED
[CircuitBreaker:BackendAPI] Circuit manually reset
```

---

## 🎓 Key Concepts

### Why "CLOSED" is Good?
In circuit breaker pattern terminology:
- **CLOSED** = Circuit is complete, electricity flows = **Healthy** ✅
- **OPEN** = Circuit is broken, electricity blocked = **Unhealthy** ❌

Think of it like an electrical circuit, not a door.

### Why Block Requests When Service is Down?
Instead of waiting 10-30 seconds for each timeout:
- Circuit breaker fails fast (instant)
- Prevents resource exhaustion
- Shows user-friendly errors immediately
- Allows service time to recover without additional load

### Why Wait 30 Seconds?
Gives backend services time to:
- Restart if crashed
- Clear backlog of requests
- Reconnect to databases
- Recover from temporary issues

---

## 📞 Support

If you continue to see circuit breaker issues:
1. Check [CIRCUIT_BREAKER_TASK_BREAKDOWN.md](CIRCUIT_BREAKER_TASK_BREAKDOWN.md) for technical details
2. Review backend logs for errors
3. Test API endpoints directly with curl/Postman
4. Contact your development team

---

## 🔗 Related Documentation

- [CIRCUIT_BREAKER_TASK_BREAKDOWN.md](CIRCUIT_BREAKER_TASK_BREAKDOWN.md) - Implementation details
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - System architecture
- Backend API documentation - `/api/docs` endpoint

---

**Last Updated:** January 15, 2026
