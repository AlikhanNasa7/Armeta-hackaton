import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vparu.kz'

// Ensure this route is dynamic
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Next.js API route handler that proxies requests to the backend
 * This bypasses CORS restrictions since requests come from the server
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const params = await Promise.resolve(context.params)
  return handleRequest(request, params, 'GET')
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const params = await Promise.resolve(context.params)
  return handleRequest(request, params, 'POST')
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const params = await Promise.resolve(context.params)
  return handleRequest(request, params, 'PATCH')
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const params = await Promise.resolve(context.params)
  return handleRequest(request, params, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const params = await Promise.resolve(context.params)
  return handleRequest(request, params, 'DELETE')
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    // Reconstruct the backend path
    const path = Array.isArray(params.path)
      ? params.path.join('/')
      : String(params.path || '')

    console.log('Proxy request:', { path, method, params })

    const url = new URL(request.url)
    const queryString = url.search

    const backendUrl = `${BACKEND_URL}/${path}${
      queryString ? `?${queryString}` : ''
    }`

    console.log('Proxying to:', backendUrl)

    // Prepare headers
    const headers: HeadersInit = {
      'ngrok-skip-browser-warning': 'true',
    }

    // Forward cookies if present
    const cookie = request.headers.get('cookie')
    if (cookie) {
      headers['Cookie'] = cookie
    }

    // Handle request body (only for methods that support it)
    let body: BodyInit | undefined
    const contentType = request.headers.get('content-type')

    if (method !== 'GET' && method !== 'HEAD') {
      if (contentType?.includes('multipart/form-data')) {
        // For file uploads, forward FormData as-is
        body = await request.formData()
      } else if (contentType?.includes('application/json')) {
        // For JSON, parse and forward
        const json = await request.json()
        body = JSON.stringify(json)
        headers['Content-Type'] = 'application/json'
      } else if (contentType) {
        // For other types with content, forward as blob
        body = await request.blob()
        headers['Content-Type'] = contentType
      }
    }

    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    })

    // Get response data
    const responseHeaders = new Headers()

    // Forward Set-Cookie headers for authentication
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders.append(key, value)
      }
    })

    // Determine response content type
    const responseContentType = response.headers.get('content-type')

    if (responseContentType?.includes('application/json')) {
      const data = await response.json()
      return NextResponse.json(data, {
        status: response.status,
        headers: responseHeaders,
      })
    } else {
      const data = await response.blob()
      return new NextResponse(data, {
        status: response.status,
        headers: {
          ...Object.fromEntries(responseHeaders),
          'Content-Type': responseContentType || 'application/octet-stream',
        },
      })
    }
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
