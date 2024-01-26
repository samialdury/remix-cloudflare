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
import {
    ClipboardDocumentIcon,
    ClipboardDocumentCheckIcon,
    ArrowDownIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { invariant } from '#app/lib/utils'
import { useEventSource } from 'remix-utils/sse/react'
import { useHints } from '#app/lib/client-hints'
import { Cobe } from '#app/components/cobe'

const FormSchema = z.object({
    url: z
        .string()
        .url()
        .refine((url) => url.startsWith('https://'), {
            message: 'URL must start with https://',
        }),
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

    const { url } = submission.value

    return json({
        status: 'success',
        submission,
        url,
    } as const)
    // try {
    // } catch (err) {
    //     console.error(err)
    //     return json(
    //         {
    //             status: 'error',
    //             submission,
    //             error: 'Something went wrong',
    //         } as const,
    //         { status: 500 },
    //     )
    // }
}

export default function Index() {
    const fetcher = useFetcher<typeof action>()
    const [form, fields] = useForm({
        id: 'shorten-url',
        constraint: getFieldsetConstraint(FormSchema),
        lastSubmission: fetcher.data?.submission,
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        defaultValue: {
            url: '',
        } satisfies FormSchema,
        onValidate({ formData }) {
            return parse(formData, { schema: FormSchema })
        },
    })
    const [copied, setCopied] = useState(false)

    const loaderData = useLoaderData<typeof loader>()
    const time =
        useEventSource('/sse/time', { event: 'time' }) ?? loaderData.time
    const hints = useHints()

    return (
        <main className="flex flex-col items-center justify-center pt-10">
            <h1 className="group text-center font-display text-3xl font-light leading-tight lg:text-5xl">
                <span>Hi!</span>
            </h1>

            <Cobe
                lat={Number(loaderData.cf.latitude)}
                long={Number(loaderData.cf.longitude)}
            />

            <div className="min-h-6">
                <div className="border-2 border-gray-500">
                    This time is periodically sent via Server-Sent Events:
                    <br />
                    {time && (
                        <time dateTime={time}>
                            {new Date(time).toLocaleTimeString('en', {
                                minute: '2-digit',
                                second: '2-digit',
                                hour: '2-digit',
                                timeZone: hints.timeZone,
                            })}
                        </time>
                    )}
                </div>

                <div className="border-2 border-gray-500">
                    This information is from the Cloudflare request properties:
                    <pre>{JSON.stringify(loaderData.cf, null, 2)}</pre>
                </div>

                <div className="border-2 border-gray-500">
                    This information is from the browser:
                    <pre>{JSON.stringify(hints, null, 2)}</pre>
                </div>
            </div>
            <fetcher.Form method="POST" {...form.props} className="w-64 py-10">
                <CSRFInput />
                <HoneypotInput />

                <label htmlFor={fields.url.id}>URL</label>
                <input
                    id={fields.url.id}
                    type="text"
                    name={fields.url.name}
                    aria-invalid={!!fields.url.error}
                    onClick={() => {
                        setCopied(false)
                    }}
                />
                <div className="min-h-8">
                    {!!fields.url.error && (
                        <div className="text-base/6 text-red-600 dark:text-red-500 sm:text-sm/6">
                            {fields.url.error}
                        </div>
                    )}
                </div>

                <button
                    className="w-full"
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                >
                    Shorten
                </button>
                <div className="flex min-h-8 items-center justify-center">
                    {fetcher.data?.status === 'error' && (
                        <div className="text-base/6 text-red-600 dark:text-red-500 sm:text-sm/6">
                            {fetcher.data.error}
                        </div>
                    )}
                </div>
            </fetcher.Form>
            {fetcher.data?.status === 'success' && (
                <div className="flex flex-col items-center space-y-4">
                    <ArrowDownIcon className="size-6 animate-pulse" />
                    <output className="flex flex-col items-center justify-between gap-2">
                        <pre className="select-all selection:bg-gray-200 dark:selection:bg-gray-600">
                            {fetcher.data.url}
                        </pre>

                        <button
                            className="size-6"
                            aria-label="Copy to clipboard"
                            onClick={() => {
                                if (
                                    navigator.clipboard &&
                                    fetcher.data?.status === 'success'
                                ) {
                                    navigator.clipboard.writeText(
                                        fetcher.data.url,
                                    )
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 5000)
                                }
                            }}
                        >
                            {copied ? (
                                <ClipboardDocumentCheckIcon />
                            ) : (
                                <ClipboardDocumentIcon />
                            )}
                        </button>
                    </output>
                </div>
            )}
        </main>
    )
}
