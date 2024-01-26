import { getDomainUrl } from '#app/lib/utils'
import { generateRobotsTxt } from '@nasa-gcn/remix-seo'
import { LoaderFunctionArgs } from '@remix-run/cloudflare'

export function loader({ request }: LoaderFunctionArgs) {
    return generateRobotsTxt(
        [{ type: 'sitemap', value: `${getDomainUrl(request)}/sitemap.xml` }],
        {
            headers: {
                'Cache-Control': `public, max-age=${60 * 5}`,
            },
        },
    )
}
