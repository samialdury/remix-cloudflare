/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import type { AppLoadContext, EntryContext } from '@remix-run/cloudflare'
import { RemixServer } from '@remix-run/react'
import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'
import { NonceProvider } from '#app/lib/nonce-provider'
import { makeTimings } from '#app/lib/timing.server'

export default async function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
    // This is ignored so we can keep it in the template for visibility.  Feel
    // free to delete this parameter in your app if you're not using it!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loadContext: AppLoadContext,
) {
    const nonce = crypto.randomUUID().replace(/-/g, '')

    const timings = makeTimings('render', 'renderToReadableStream')

    const body = await renderToReadableStream(
        <NonceProvider value={nonce}>
            <RemixServer context={remixContext} url={request.url} />
        </NonceProvider>,
        {
            signal: request.signal,
            onError(error: unknown) {
                // Log streaming rendering errors from inside the shell
                console.error(error)
                responseStatusCode = 500
            },
            nonce,
        },
    )

    if (isbot(request.headers.get('user-agent')!)) {
        await body.allReady
    }

    responseHeaders.set('Content-Type', 'text/html; charset=utf-8')
    responseHeaders.append('Server-Timing', timings.toString())

    // CSP
    responseHeaders.set(
        'Content-Security-Policy-Report-Only',
        [
            "default-src 'self'",
            "script-src 'self' 'strict-dynamic' 'nonce-" + nonce + "'",
            "script-src-attr 'nonce-" + nonce + "'",
            "script-src-elem 'self' https://unpkg.com 'nonce-" + nonce + "'",
            "style-src 'self' https://rsms.me  https://unpkg.com 'nonce-" +
                nonce +
                "'",
            "img-src 'self' data:",
            "font-src 'self' https://rsms.me",
            "media-src 'self'",
            "frame-src 'self'",
            `connect-src 'self' ${
                process.env.NODE_ENV === 'development' ? 'ws:' : ''
            }`,
            "object-src 'none'",
        ].join('; '),
    )

    return new Response(body, {
        headers: responseHeaders,
        status: responseStatusCode,
    })
}
