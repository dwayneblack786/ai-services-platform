# Chat Session Management System

## Overview
Complete implementation of persistent chat session management with MongoDB storage, cookie-based session tracking, and session recovery.

## Features

### 1. **Session Persistence**
- Chat sessions are stored in MongoDB with complete message history
- Sessions persist across page refreshes and browser restarts
- Automatic session recovery when user returns

### 2. **One Session Per Customer**
- Each customer can only have one active session at a time
- Starting a new session automatically ends the previous one
- History of all sessions is preserved

### 3. **Session Storage**
- Session ID stored in httpOnly cookies (secure)
- Backup storage in localStorage
- All messages saved to MongoDB in real-time

### 4. **User Controls**
- "New Chat" button to start fresh conversation
- Automatically resumes previous session on page load
- Clear session history when ending

## Architecture

### MongoDB Schema
Collection: `chat_messages`
```javascript
{
  sessionId: String,      // Unique session identifier
  customerId: String,     // Customer/tenant ID
  productId: String,      // Product ID (e.g., "va-service")
  messages: [{
    role: String,         // "user" or "assistant"
    content: String,      // Message text
    timestamp: Date,      // When message was sent
    intent: String        // Detected intent (for assistant messages)
  }],
  startedAt: Date,        // Session start time
  lastUpdatedAt: Date,    // Last message timestamp
  endedAt: Date,          // Session end time (null if active)
  isActive: Boolean       // Whether session is still active
}
```

### Indexes
- `{ sessionId: 1, timestamp: 1 }` - Fast session lookup and message ordering
- `{ customerId: 1, timestamp: -1 }` - Find customer's sessions
- `{ sessionId: 1 }` - Quick session queries

## API Endpoints

### Java Service (Port 8136)

#### `POST /chat/session`
Start new chat session (ends any existing active session)
```json
Request:
{
  "customerId": "ten-splendor-florida-33064",
  "productId": "69667c560e03d4f31472dbd3"
}

Response:
{
  "sessionId": "uuid-here",
  "customerId": "ten-splendor-florida-33064",
  "productId": "69667c560e03d4f31472dbd3",
  "status": "initialized",
  "greeting": "Hello! How can I assist you today?"
}
```

#### `POST /chat/message`
Send message in session (automatically saved to MongoDB)
```json
Request:
{
  "sessionId": "uuid-here",
  "message": "I need help"
}

Response:
{
  "sessionId": "uuid-here",
  "message": "I'm here to help!",
  "intent": "general_inquiry"
}
```

#### `GET /chat/history/{sessionId}`
Retrieve complete session history from MongoDB
```json
Response:
{
  "sessionId": "uuid-here",
  "customerId": "ten-splendor-florida-33064",
  "productId": "69667c560e03d4f31472dbd3",
  "messages": [
    {
      "role": "assistant",
      "content": "Hello!",
      "timestamp": "2026-01-14T20:00:00Z",
      "intent": null
    },
    {
      "role": "user",
      "content": "Hi",
      "timestamp": "2026-01-14T20:00:05Z"
    }
  ],
  "startedAt": "2026-01-14T20:00:00Z",
  "lastUpdatedAt": "2026-01-14T20:00:05Z",
  "endedAt": null,
  "isActive": true
}
```

#### `GET /chat/active-session/{customerId}`
Check if customer has active session
```json
Response:
{
  "hasActiveSession": "true",
  "sessionId": "uuid-here"
}
```

#### `POST /chat/end?sessionId={sessionId}`
End session and mark as inactive

### Node.js Backend (Port 5000)

#### `POST /api/chat/session`
Initialize or resume session (with cookies)
```json
Request:
{
  "productId": "va-service",
  "forceNew": false  // Optional: force new session
}

Response (new session):
{
  "sessionId": "uuid-here",
  "status": "initialized",
  "chatConfig": {
    "greeting": "Hello!",
    "typingIndicator": true,
    "maxTurns": 20,
    "showIntent": false
  }
}

Response (resumed session):
{
  "sessionId": "uuid-here",
  "status": "resumed",
  "messages": [...],  // Full history
  "chatConfig": {...}
}
```

#### `POST /api/chat/message`
Forward message to Java service

#### `GET /api/chat/history/:sessionId`
Get session history from MongoDB

#### `POST /api/chat/end`
End session and clear cookies

## Frontend Implementation

### Session Initialization
```typescript
// On component mount
- Check for existing session cookie
- If found: Resume session and load history
- If not found: Create new session

// Cookie storage
- httpOnly cookie (backend managed)
- localStorage backup (frontend accessible)
```

### User Actions
```typescript
// Send message
1. Display user message immediately
2. Show "typing..." indicator
3. Send to backend
4. Display assistant response
5. Auto-save to MongoDB (backend handles this)

// Start new chat
1. End current session (API call)
2. Clear cookies and localStorage
3. Initialize new session
4. Display new greeting
```

### UI Components
- **Chat window**: Shows message history
- **Input box**: Type and send messages
- **New Chat button**: Start fresh conversation
- **Session indicator**: Shows current session ID

## Data Flow

### Starting Session
```
Frontend → Node.js Backend → Java Service → MongoDB
                  ↓
           Set cookie
                  ↓
        Return session data
```

### Sending Message
```
User types message
       ↓
Frontend adds to UI
       ↓
POST to backend
       ↓
Java Service:
  - Saves user message to MongoDB
  - Processes through LLM
  - Saves assistant response to MongoDB
  - Returns response
       ↓
Frontend displays response
```

### Session Recovery
```
User returns to site
       ↓
Frontend checks cookie
       ↓
POST /session (forceNew=false)
       ↓
Backend checks Java for active session
       ↓
If found:
  - GET history from MongoDB
  - Return messages to frontend
  - Display full conversation
```

## Security

### Cookie Settings
```javascript
{
  httpOnly: true,           // Not accessible via JavaScript
  secure: true,             // HTTPS only (production)
  sameSite: 'strict',       // CSRF protection
  maxAge: 24 * 60 * 60 * 1000  // 24 hours
}
```

### Session Validation
- All endpoints require authentication
- Session IDs validated against active sessions
- Customer ID verification for session access

## Usage Examples

### Testing Session Creation
```bash
# Start new session
curl -X POST http://localhost:5000/api/chat/session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "va-service"}' \
  -c cookies.txt

# Send message
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"sessionId": "SESSION_ID", "message": "Hello"}'

# Get history
curl http://localhost:5000/api/chat/history/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -b cookies.txt

# End session
curl -X POST http://localhost:5000/api/chat/end \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"sessionId": "SESSION_ID"}'
```

### Testing Session Resume
```bash
# First request - creates session
curl -X POST http://localhost:5000/api/chat/session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -c cookies.txt

# Navigate away, come back
# Second request - resumes session
curl -X POST http://localhost:5000/api/chat/session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -b cookies.txt
# Returns status: "resumed" with full message history
```

## Files Changed

### Java Service
- `ChatMessage.java` - Message model
- `ChatHistory.java` - History document model
- `ChatSessionService.java` - Session management logic
- `ChatSessionController.java` - REST endpoints

### Node.js Backend
- `chat-routes.ts` - Cookie handling and Java proxy

### Frontend
- `AssistantChat.tsx` - Session recovery and UI

### Scripts
- `create-chat-history-collection.js` - MongoDB setup

## Deployment Notes

1. **MongoDB**: Ensure `chat_messages` collection exists with indexes
2. **Cookies**: Update `secure` flag for production (HTTPS)
3. **Session Timeout**: Currently 24 hours, adjust `maxAge` as needed
4. **Storage**: Consider implementing periodic cleanup of old inactive sessions

## Future Enhancements

- [ ] Redis for session state (instead of in-memory)
- [ ] Session timeout with automatic cleanup
- [ ] Export chat history feature
- [ ] Multi-device session sync
- [ ] Push notifications for new messages
- [ ] File attachments in messages
- [ ] Rich text formatting
