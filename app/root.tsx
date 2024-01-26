import globalStyleSheetUrl from '#app/styles/global.css'
import {
    json,
    ActionFunctionArgs,
    HeadersFunction,
    LinksFunction,
    LoaderFunctionArgs,
    MetaFunction,
} from '@remix-run/cloudflare'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useFetcher,
    useLoaderData,
} from '@remix-run/react'
import { Theme, getTheme, setTheme } from '#app/lib/theme.server'
import { ClientHintCheck, getHints } from '#app/lib/client-hints'
import { honeypot } from '#app/lib/honeypot.server'
import { csrf } from '#app/lib/csrf.server'
import { combineHeaders, getDomainUrl, invariant } from '#app/lib/utils'
import { makeTimings } from '#app/lib/timing.server'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { useNonce } from '#app/lib/nonce-provider'
import { GeneralErrorBoundary } from '#app/lib/error-boundary'
import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import {
    SunIcon,
    MoonIcon,
    ComputerDesktopIcon,
} from '@heroicons/react/24/outline'
import { useCallback } from 'react'
import { TailwindIndicator } from '#app/components/tailwind-indicator'
import {
    ThemeFormSchema,
    useOptimisticThemeMode,
    useTheme,
} from '#app/lib/theme'

export const links: LinksFunction = () => [
    // Preconnect to speed up loading of external resources
    {
        rel: 'preconnect',
        href: 'https://rsms.me',
    },
    // Preload CSS as a resource to avoid render blocking
    { rel: 'preload', href: 'https://rsms.me/inter/inter.css', as: 'style' },
    { rel: 'preload', href: globalStyleSheetUrl, as: 'style' },
    ...(cssBundleHref
        ? [{ rel: 'preload', href: cssBundleHref, as: 'style' }]
        : []),
    {
        rel: 'stylesheet',
        href: 'https://rsms.me/inter/inter.css',
    },
    { rel: 'stylesheet', href: globalStyleSheetUrl },
    ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
]

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [
        { title: data ? 'remix-cloudflare' : 'Error | remix-cloudflare' },
        { name: 'description', content: 'Remix + Cloudflare Pages™ template' },
        {
            name: 'keywords',
            content: 'remix, cloudflare, template',
        },
        {
            property: 'og:title',
            content: 'remix-cloudflare',
        },
        {
            property: 'og:description',
            content: 'Remix + Cloudflare Pages™ template',
        },
    ]
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
    const headers = {
        'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
    }
    return headers
}

export async function loader({
    request,
    context: { env },
}: LoaderFunctionArgs) {
    invariant(env.SESSION_SECRET, 'Missing SESSION_SECRET')
    invariant(env.HONEYPOT_SECRET, 'Missing HONEYPOT_SECRET')
    invariant(env.CSRF_SECRET, 'Missing CSRF_SECRET')

    const timings = makeTimings('root loader')
    // const { toast, headers: toastHeaders } = await getToast(request)
    const honeyProps = honeypot(env.HONEYPOT_SECRET).getInputProps()
    const [csrfToken, csrfCookieHeader] = await csrf(
        env.SESSION_SECRET,
        env.CSRF_SECRET,
    ).commitToken()

    return json(
        {
            requestInfo: {
                hints: getHints(request),
                origin: getDomainUrl(request),
                path: new URL(request.url).pathname,
                userPrefs: {
                    theme: getTheme(request),
                },
            },
            ENV: {},
            // toast,
            honeyProps,
            csrfToken,
        },
        {
            headers: combineHeaders(
                { 'Server-Timing': timings.toString() },
                // toastHeaders,
                csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : null,
            ),
        },
    )
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData()
    const submission = parse(formData, {
        schema: ThemeFormSchema,
    })
    if (submission.intent !== 'submit') {
        return json({ status: 'idle', submission } as const)
    }
    if (!submission.value) {
        return json({ status: 'error', submission } as const, { status: 400 })
    }
    const { theme } = submission.value

    const responseInit = {
        headers: { 'set-cookie': setTheme(theme) },
    }
    return json({ success: true, submission }, responseInit)
}

function App() {
    const data = useLoaderData<typeof loader>()
    const nonce = useNonce()
    const theme = useTheme()

    return (
        <Document nonce={nonce} theme={theme} env={data.ENV}>
            <div className="relative flex min-h-screen flex-col">
                <Header
                    userPreferenceTheme={data.requestInfo.userPrefs.theme}
                />

                <div className="flex-1">
                    <Outlet />
                </div>

                <Footer />
            </div>
        </Document>
    )
}

function Header({
    userPreferenceTheme,
}: {
    userPreferenceTheme: Theme | null
}) {
    return (
        <header className="sticky top-0 z-10 border-b border-zinc-950/10 bg-white px-6 py-4 dark:border-white/5 dark:bg-zinc-900 sm:px-8 lg:z-10 lg:flex lg:h-16 lg:items-center lg:py-0">
            <div className="mx-auto flex w-full max-w-xl items-center justify-between lg:max-w-7xl">
                {/* <div>
                    <Link to="/" aria-label="Home">
                        <div className="whitespace-nowrap font-display text-lg font-normal lg:text-2xl">
                            <span>remix</span>
                            <span>-</span>
                            <span className="text-orange-400">cloudflare</span>
                        </div>
                    </Link>
                </div> */}
                <div className="flex items-center justify-center space-x-2 whitespace-nowrap font-display text-lg font-normal lg:text-2xl">
                    <a
                        href="https://remix.run"
                        rel="noreferrer noopener"
                        target="_blank"
                    >
                        Remix
                    </a>
                    <span className="text-xl">+</span>
                    <a
                        href="https://pages.cloudflare.com"
                        rel="noreferrer noopener"
                        target="_blank"
                        className="text-orange-500"
                    >
                        Cloudflare Pages™
                    </a>
                </div>

                <div className="flex items-center justify-center">
                    <ThemeSwitch userPreference={userPreferenceTheme} />
                </div>
            </div>
        </header>
    )
}

function Footer() {
    return (
        <footer className="mt-32 w-full">
            <div className="w-full border-t border-zinc-950/10 bg-white py-4 dark:border-white/5 dark:bg-zinc-900">
                <p className="text-balance text-center text-sm leading-loose text-slate-500 dark:text-slate-400">
                    The source code is available on{' '}
                    <a
                        href="https://github.com/samialdury/remix-cloudflare"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-medium underline underline-offset-4"
                    >
                        GitHub
                    </a>
                    .
                </p>
            </div>
        </footer>
    )
}

function ThemeSwitch({ userPreference }: { userPreference?: Theme | null }) {
    const fetcher = useFetcher<typeof action>()

    const [form] = useForm({
        id: 'theme-switch',
        lastSubmission: fetcher.data?.submission,
    })

    const optimisticMode = useOptimisticThemeMode()
    const mode = optimisticMode ?? userPreference ?? 'system'
    const nextMode =
        mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'

    const getModeLabel = useCallback((mode: Theme | 'system') => {
        const { icon: Icon, label } = {
            light: {
                icon: SunIcon,
                label: 'Light',
            },
            dark: {
                icon: MoonIcon,
                label: 'Dark',
            },
            system: {
                icon: ComputerDesktopIcon,
                label: 'System',
            },
        }[mode]

        return (
            <Icon className="size-5">
                <span className="sr-only">{label}</span>
            </Icon>
        )
    }, [])

    return (
        <fetcher.Form method="POST" {...form.props}>
            <input type="hidden" name="theme" value={nextMode} />

            <button
                className="flex items-center justify-center"
                type="submit"
                title={`Switch to ${nextMode.toLowerCase()}`}
            >
                {getModeLabel(mode)}
            </button>
        </fetcher.Form>
    )
}

function Document({
    children,
    nonce,
    theme = 'light',
    env = {},
}: {
    children: React.ReactNode
    nonce: string
    theme?: Theme
    env?: Record<string, string>
}) {
    return (
        <html lang="en" className={`${theme}`}>
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                />
                <ClientHintCheck nonce={nonce} />
                <Meta />
                <Links />
            </head>
            <body className="min-h-screen overflow-x-hidden overflow-y-scroll bg-white font-sans text-black antialiased dark:bg-zinc-900 dark:text-white">
                {children}
                <script
                    nonce={nonce}
                    dangerouslySetInnerHTML={{
                        __html: `window.ENV = ${JSON.stringify(env)}`,
                    }}
                />
                <TailwindIndicator />
                <ScrollRestoration nonce={nonce} />
                <Scripts nonce={nonce} />
                <LiveReload nonce={nonce} />
            </body>
        </html>
    )
}

export default function AppWithProviders() {
    const data = useLoaderData<typeof loader>()
    return (
        <AuthenticityTokenProvider token={data.csrfToken}>
            <HoneypotProvider {...data.honeyProps}>
                <App />
            </HoneypotProvider>
        </AuthenticityTokenProvider>
    )
}

export function ErrorBoundary() {
    // the nonce doesn't rely on the loader so we can access that
    const nonce = useNonce()

    // NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
    // likely failed to run so we have to do the best we can.
    // We could probably do better than this (it's possible the loader did run).
    // This would require a change in Remix.

    // Just make sure your root route never errors out and you'll always be able
    // to give the user a better UX.

    return (
        <Document nonce={nonce}>
            <GeneralErrorBoundary />
        </Document>
    )
}
