async function getGeolocation(ip, token) {
  if (!ip || ip === 'unknown' || !token) return null
  
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/radar/entities/asns/ip?ip=${ip}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!response.ok) {
      console.error(`Cloudflare API error: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    console.log('Cloudflare API response:', JSON.stringify(data))
    return data.result || data
  } catch (error) {
    console.error('Geolocation fetch error:', error)
    return null
  }
}

async function logToR2(bucket, timestamp, ip, userAgent, id, email, geo) {
  const date = new Date(timestamp)
  const filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}.csv`
  
  const safeUserAgent = (userAgent || '').replace(/"/g, '""')
  const geoData = geo ? `"${JSON.stringify(geo).replace(/"/g, '""')}"` : '""'
  const csvLine = `${timestamp},"${ip || ''}","${safeUserAgent}","${id}","${email || ''}",${geoData}\n`
  
  try {
    const existing = await bucket.get(filename)
    const content = existing ? await existing.text() : 'timestamp,ip_address,user_agent,id,email,asn\n'
    await bucket.put(filename, content + csvLine)
  } catch (error) {
    console.error('Failed to log to R2:', error)
  }
}

export default {
  async fetch(request, env, ctx) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id") || "unknown"
    const email = searchParams.get("email")
    const timestamp = new Date().toISOString()
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'
    const userAgent = request.headers.get('User-Agent') || 'unknown'

    // Get geolocation and log to R2 bucket
    const token = 'EXS40-fvvrrBInkm1y_Xo1Y3kXTfcW_YWzELjOK5'
    const geo = (ip && ip !== 'unknown') ? await getGeolocation(ip, token) : null
    
    try {
      await logToR2(env.TRACKING_PIXEL_BUCKET, timestamp, ip, userAgent, id, email, geo)
    } catch (error) {
      console.error('Logging failed:', error)
    }

    // Serve a 1x1 transparent PNG
    const pixel = Uint8Array.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    return new Response(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  }
}
