import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export { invariant } from '@epic-web/invariant'

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}

/**
 * Combine multiple header objects into one (uses append so headers are not overridden)
 */
export function combineHeaders(
    ...headers: Array<ResponseInit['headers'] | null | undefined>
): Headers {
    const combined = new Headers()
    for (const header of headers) {
        if (!header) continue
        for (const [key, value] of new Headers(header).entries()) {
            combined.append(key, value)
        }
    }
    return combined
}

export function getDomainUrl(request: Request): string {
    const host =
        request.headers.get('X-Forwarded-Host') ??
        request.headers.get('host') ??
        new URL(request.url).host
    const protocol = host.includes('localhost') ? 'http' : 'https'
    return `${protocol}://${host}`
}
