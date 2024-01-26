import { Honeypot, SpamError } from 'remix-utils/honeypot/server'

export function honeypot(honeypotSecret: string) {
    return new Honeypot({
        encryptionSeed: honeypotSecret,
    })
}

export function checkHoneypot(formData: FormData, honeypotSecret: string) {
    try {
        honeypot(honeypotSecret).check(formData)
    } catch (error) {
        if (error instanceof SpamError) {
            throw new Response('Form not submitted properly', { status: 400 })
        }
        throw error
    }
}
