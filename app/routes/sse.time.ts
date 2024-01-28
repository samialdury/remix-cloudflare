import { LoaderFunctionArgs } from '@remix-run/cloudflare'
import { eventStream } from 'remix-utils/sse/server'
import { interval } from 'remix-utils/timers'

export async function loader({ request }: LoaderFunctionArgs) {
    return eventStream(request.signal, (send) => {
        async function run() {
            console.log('Starting SSE time stream')

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of interval(1000, { signal: request.signal })) {
                send({ event: 'time', data: new Date().toISOString() })
            }
        }

        run()

        return () => {
            console.log('Closing SSE time stream')
        }
    })
}
