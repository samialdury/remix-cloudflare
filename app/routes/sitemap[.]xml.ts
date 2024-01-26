import { routes } from '@remix-run/dev/server-build'
import { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { generateSitemap } from '@nasa-gcn/remix-seo'
import { getDomainUrl } from '#app/lib/utils'

export function loader({ request }: LoaderFunctionArgs) {
    return generateSitemap(request, routes, {
        siteUrl: getDomainUrl(request),
        headers: {
            'Cache-Control': `public, max-age=${60 * 5}`,
        },
    })
}
