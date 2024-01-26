import { GeneralErrorBoundary } from '#app/lib/error-boundary'
import { SEOHandle } from '@nasa-gcn/remix-seo'
import { json } from '@remix-run/cloudflare'
import { Link, useLocation } from '@remix-run/react'

export function loader() {
    throw json({ status: 'error', error: 'Not found' } as const, {
        status: 404,
    })
}

export const handle: SEOHandle = {
    getSitemapEntries: () => null,
}

export default function NotFound() {
    return <ErrorBoundary />
}

export function ErrorBoundary() {
    const location = useLocation()
    return (
        <GeneralErrorBoundary
            statusHandlers={{
                404: () => (
                    <div className="flex flex-col items-center justify-center gap-6 pt-20">
                        <h1 className="text-4xl font-semibold">Not found</h1>
                        <p className="text-lg">
                            The route{' '}
                            <span className="font-mono">
                                {location.pathname}
                            </span>{' '}
                            does not exist.
                        </p>
                        <button>
                            <Link to="/">Back to home</Link>
                        </button>
                    </div>
                ),
            }}
        />
    )
}
