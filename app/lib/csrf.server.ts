import { createCookie } from '@remix-run/cloudflare'
import { CSRF, CSRFError } from 'remix-utils/csrf/server'

export function csrf(sessionSecret: string, csrfSecret: string) {
    const cookie = createCookie('csrf', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        secrets: sessionSecret.split(','),
    })

    return new CSRF({ cookie, secret: csrfSecret })
}

export async function validateCSRF(
    formData: FormData,
    headers: Headers,
    sessionSecret: string,
    csrfSecret: string,
) {
    try {
        await csrf(sessionSecret, csrfSecret).validate(formData, headers)
    } catch (err) {
        if (err instanceof CSRFError) {
            throw new Response('Invalid CSRF token', { status: 403 })
        }
        throw err
    }
}
