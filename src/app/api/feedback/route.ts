import { createSign } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const spreadsheetId =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
  '1YfkG-qQKoIC2pQt2BotHI1qbaykfkVe_9Hg0LwJLq4w'
const tokenUrl = 'https://oauth2.googleapis.com/token'
const sheetsScope = 'https://www.googleapis.com/auth/spreadsheets'

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function getGoogleCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets 연동 환경변수가 없습니다')
  }

  return { clientEmail, privateKey }
}

async function getAccessToken() {
  const { clientEmail, privateKey } = getGoogleCredentials()
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: sheetsScope,
    aud: tokenUrl,
    iat: now,
    exp: now + 3600,
  }))
  const unsignedToken = `${header}.${payload}`
  const signature = createSign('RSA-SHA256')
    .update(unsignedToken)
    .sign(privateKey)
  const assertion = `${unsignedToken}.${base64Url(signature)}`

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.error_description ?? 'Google 인증에 실패했습니다')
  }

  return String(result.access_token)
}

async function getAppendRange(accessToken: string) {
  if (process.env.GOOGLE_SHEETS_RANGE) return process.env.GOOGLE_SHEETS_RANGE

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'Google Sheet 정보를 가져오지 못했습니다')
  }

  const firstSheetTitle = result?.sheets?.[0]?.properties?.title
  if (!firstSheetTitle) throw new Error('Google Sheet 탭을 찾지 못했습니다')

  return `${firstSheetTitle}!A:D`
}

async function appendFeedback(values: string[]) {
  const accessToken = await getAccessToken()
  const range = await getAppendRange(accessToken)
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    }
  )
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'Google Sheet 저장에 실패했습니다')
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const category = String(body?.category ?? '').trim()
  const content = String(body?.content ?? '').trim()

  if (!category || !content) {
    return NextResponse.json({ error: '카테고리와 내용을 입력하세요' }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: '내용은 2000자 이하로 입력하세요' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const author = user?.email ?? '비로그인'
    const createdAt = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Seoul',
    }).format(new Date())

    await appendFeedback([category, content, author, createdAt])

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '피드백 저장에 실패했습니다' },
      { status: 500 }
    )
  }
}
