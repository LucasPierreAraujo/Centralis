# withAuth Middleware Pattern Reference

## Quick Reference

### Pattern Structure

```javascript
// 1. Import the middleware
import { withAuth } from '../../../lib/authMiddleware';

// 2. Create handler functions (instead of direct exports)
async function getHandler(request, { user, ...context }) {
  // Your handler code here
  // You now have access to the user object
}

async function postHandler(request, { user, ...context }) {
  // Your handler code here
}

// 3. Export wrapped with withAuth
export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
```

### Complete Example: Before and After

#### BEFORE (Unprotected)
```javascript
// src/app/api/example/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request) {
  try {
    const data = await prisma.example.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await prisma.example.create({ data: body });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

#### AFTER (Protected)
```javascript
// src/app/api/example/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { withAuth } from '../../../lib/authMiddleware';

async function getHandler(request, { user }) {
  try {
    const data = await prisma.example.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

async function postHandler(request, { user }) {
  try {
    const body = await request.json();
    // Optional: Use user object for logging or authorization
    console.log(`User ${user.username} creating example`);
    
    const result = await prisma.example.create({ data: body });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
```

### Dynamic Routes Example (with params)

#### BEFORE
```javascript
export async function GET(request, { params }) {
  const { id } = await params;
  // handler code
}
```

#### AFTER
```javascript
async function getHandler(request, { params, user }) {
  const { id } = await params;
  // handler code - now with user access
}

export const GET = withAuth(getHandler);
```

## User Object Structure

The `user` object passed to handlers contains:

```javascript
{
  id: string,        // User ID from database
  username: string,  // Username
  role: string       // User role (e.g., 'admin', 'user')
}
```

## Using the User Object

### Example 1: Logging
```javascript
async function postHandler(request, { user }) {
  console.log(`Action performed by user: ${user.username} (${user.id})`);
  // ... rest of handler
}
```

### Example 2: Authorization
```javascript
async function deleteHandler(request, { user }) {
  // Only admins can delete
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access required' },
      { status: 403 }
    );
  }
  // ... rest of handler
}
```

### Example 3: Audit Trail
```javascript
async function postHandler(request, { user }) {
  const body = await request.json();
  
  const result = await prisma.example.create({
    data: {
      ...body,
      createdBy: user.id,
      createdByUsername: user.username
    }
  });
  
  return NextResponse.json(result);
}
```

## Import Path Reference

The import path for `withAuth` depends on the route location:

```javascript
// For /api/example/route.js
import { withAuth } from '../../../lib/authMiddleware';

// For /api/example/[id]/route.js  
import { withAuth } from '../../../../lib/authMiddleware';

// For /api/example/nested/route.js
import { withAuth } from '../../../../lib/authMiddleware';

// For /api/example/nested/[id]/route.js
import { withAuth } from '../../../../../lib/authMiddleware';
```

## HTTP Methods Supported

You can protect any HTTP method:

```javascript
async function getHandler(request, { user }) { /* ... */ }
async function postHandler(request, { user }) { /* ... */ }
async function putHandler(request, { user }) { /* ... */ }
async function patchHandler(request, { user }) { /* ... */ }
async function deleteHandler(request, { user }) { /* ... */ }

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PUT = withAuth(putHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
```

## Error Responses

When authentication fails, the middleware automatically returns:

```json
{
  "error": "Unauthorized"
}
```

With HTTP status: `401 Unauthorized`

## Testing Protected Routes

### With cURL
```bash
# Without auth (will fail)
curl http://localhost:3000/api/example

# With auth cookie
curl -b "token=YOUR_JWT_TOKEN" http://localhost:3000/api/example
```

### With JavaScript fetch
```javascript
// The cookie is automatically sent if it's HttpOnly
fetch('/api/example')
  .then(res => {
    if (res.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return res.json();
  });
```

## Routes That Should NOT Be Protected

Never protect these authentication-related routes:
- `/api/auth/login` - Login endpoint
- `/api/auth/logout` - Logout endpoint  
- `/api/auth/register` - Registration endpoint (if you have one)

The `/api/auth/me` endpoint can optionally remain unprotected as it internally validates the token.

## Checklist for Adding Protection

- [ ] Import `withAuth` from the correct path
- [ ] Rename `export async function METHOD` to `async function methodHandler`
- [ ] Update function signature to accept `{ user, ...context }`
- [ ] Add `export const METHOD = withAuth(methodHandler);` at the end
- [ ] Test that the route requires authentication
- [ ] Test that the route works with valid authentication
- [ ] Verify the user object is accessible if needed

## Common Mistakes to Avoid

1. ❌ Forgetting to remove `export` from the handler function
2. ❌ Not updating the function signature to accept `user` in context
3. ❌ Wrong import path for `withAuth`
4. ❌ Protecting authentication endpoints
5. ❌ Not handling the case where `params` needs to be awaited (Next.js 15+)

## Need Help?

Refer to any of the protected routes in the codebase for working examples:
- `/src/app/api/membros/route.js`
- `/src/app/api/planilhas/route.js`
- `/src/app/api/atas/route.js`
