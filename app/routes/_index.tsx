import { validateCSRF } from '#app/lib/csrf.server'
import { checkHoneypot } from '#app/lib/honeypot.server'
import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
    json,
} from '@remix-run/cloudflare'
import { useFetcher, useLoaderData } from '@remix-run/react'
import { useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { z } from 'zod'
import { CSRFInput } from '#app/lib/csrf'
import { HoneypotInput } from '#app/lib/honeypot'
import { invariant } from '#app/lib/utils'
import { useEventSource } from 'remix-utils/sse/react'
import { useHints } from '#app/lib/client-hints'
import { Cobe } from '#app/components/cobe'

const FormSchema = z.object({
    name: z.string(),
})

type FormSchema = z.infer<typeof FormSchema>

export function loader({
    request: { headers },
    context: { cf },
}: LoaderFunctionArgs) {
    console.log('loader', cf)
    return json({
        cf: {
            ip: headers.get('cf-connecting-ip') || 'n/a',
            asOrganization: cf.asOrganization || 'n/a',
            asn: cf.asn || 'n/a',
            timezone: cf.timezone || 'n/a',
            latitude: cf.latitude || 'n/a',
            longitude: cf.longitude || 'n/a',
            city: cf.city || 'n/a',
            postalCode: cf.postalCode || 'n/a',
            region: cf.region || 'n/a',
            regionCode: cf.regionCode || 'n/a',
            colo: cf.colo || 'n/a',
            country: cf.country || headers.get('cf-ipcountry') || 'n/a',
            isEUCountry: cf.isEUCountry || 'n/a',
            continent: cf.continent || 'n/a',
        },
        time: new Date().toISOString(),
    } as const)
}

export async function action({
    request,
    context: { env },
}: ActionFunctionArgs) {
    invariant(env.SESSION_SECRET, 'Missing SESSION_SECRET')
    invariant(env.HONEYPOT_SECRET, 'Missing HONEYPOT_SECRET')
    invariant(env.CSRF_SECRET, 'Missing CSRF_SECRET')

    const formData = await request.formData()
    await validateCSRF(
        formData,
        request.headers,
        env.SESSION_SECRET,
        env.CSRF_SECRET,
    )
    checkHoneypot(formData, env.HONEYPOT_SECRET)

    const submission = parse(formData, {
        schema: FormSchema,
    })

    if (submission.intent !== 'submit') {
        return json({ status: 'idle', submission } as const)
    }

    if (!submission.value) {
        return json(
            {
                status: 'error',
                submission,
                error: 'Invalid submission',
            } as const,
            { status: 400 },
        )
    }

    const { name } = submission.value

    return json({
        status: 'success',
        submission,
        greeting: `Hello, ${name}! 👋 This was sent from the server.`,
    } as const)
}

function Separator() {
    return <div className="h-px w-[80%] bg-zinc-950/10 dark:bg-white/5" />
}

export default function Index() {
    const fetcher = useFetcher<typeof action>()
    const [form, fields] = useForm({
        id: 'get-greeting',
        constraint: getFieldsetConstraint(FormSchema),
        lastSubmission: fetcher.data?.submission,
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        defaultValue: {
            name: '',
        } satisfies FormSchema,
        onValidate({ formData }) {
            return parse(formData, { schema: FormSchema })
        },
    })

    const loaderData = useLoaderData<typeof loader>()
    const time =
        useEventSource('/sse/time', { event: 'time' }) ?? loaderData.time
    const hints = useHints()

    return (
        <main>
            {/* <h1 className="pt-6 text-center font-display text-3xl font-light leading-tight lg:text-5xl">
                Remix + Cloudflare Pages™ demo
            </h1> */}
            <Cobe
                lat={Number(loaderData.cf.latitude)}
                long={Number(loaderData.cf.longitude)}
            />
            <p className="px-2 text-center text-xl text-gray-700 dark:text-gray-400">
                📍 drag to see your location on the globe
            </p>

            <div className="flex flex-col items-center justify-center gap-4 px-5 pt-10 *:max-w-2xl sm:px-0">
                <section className="flex flex-col items-center justify-center">
                    <p className="text-balance text-center text-xl font-semibold">
                        Time from server-sent event:
                    </p>
                    <time
                        dateTime={time}
                        className="text-center font-mono text-3xl font-light leading-tight lg:text-5xl"
                    >
                        {new Date(time).toLocaleTimeString('en', {
                            minute: '2-digit',
                            second: '2-digit',
                            hour: '2-digit',
                            timeZone: hints.timeZone,
                        })}
                    </time>
                    <p className="text-md text-balance text-center">
                        (check the network tab to see the SSE requests)
                    </p>
                </section>
                <Separator />
                <section className="flex w-full flex-col items-center justify-center">
                    <p className="text-balance text-center text-xl font-semibold">
                        <code>`cf`</code> request properties:
                    </p>
                    <div className="flex w-full flex-col border">
                        <output className="whitespace-pre-wrap font-mono">
                            {JSON.stringify(loaderData.cf, null, 2)}
                        </output>
                    </div>
                </section>
                <Separator />
                <section className="flex w-full flex-col items-center justify-center">
                    <p className="text-balance text-center text-xl font-semibold">
                        Client hints:
                    </p>
                    <div className="flex w-full flex-col border">
                        <output className="whitespace-pre-wrap font-mono">
                            {JSON.stringify(hints, null, 2)}
                        </output>
                    </div>
                </section>
                <Separator />
                <section className="flex w-full flex-col items-center justify-center">
                    <p className="text-balance text-center text-xl font-semibold">
                        Example form submission:
                    </p>
                    <fetcher.Form
                        method="POST"
                        {...form.props}
                        className="flex w-full flex-col items-center justify-center border"
                    >
                        <CSRFInput />
                        <HoneypotInput />

                        <div className="flex w-full flex-col items-center justify-center">
                            <label htmlFor={fields.name.id}>Your name</label>
                            <input
                                id={fields.name.id}
                                type="text"
                                name={fields.name.name}
                                aria-invalid={!!fields.name.error}
                                className="w-1/2 rounded-sm border bg-zinc-950/10 dark:border-gray-700 dark:dark:bg-white/5 dark:text-white"
                            />
                            <div className="min-h-8">
                                {!!fields.name.error && (
                                    <div className="text-base/6 text-red-600 dark:text-red-500 sm:text-sm/6">
                                        {fields.name.error}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            className="w-1/2 max-w-[70%] rounded-sm border bg-zinc-950/20 dark:border-gray-700 dark:bg-white/10 dark:text-white"
                            type="submit"
                            disabled={fetcher.state !== 'idle'}
                        >
                            Get greeting
                        </button>
                        <div className="flex min-h-8 items-center justify-center">
                            {fetcher.data?.status === 'error' && (
                                <div className="text-base/6 text-red-600 dark:text-red-500 sm:text-sm/6">
                                    {fetcher.data.error}
                                </div>
                            )}
                        </div>

                        {fetcher.data?.status === 'success' && (
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="animate-pulse text-2xl">↓</div>
                                <output className="select-all whitespace-pre-wrap text-center font-mono selection:bg-gray-200 dark:selection:bg-gray-600">
                                    {fetcher.data.greeting}
                                </output>
                            </div>
                        )}
                    </fetcher.Form>
                </section>
            </div>
        </main>
    )
}
