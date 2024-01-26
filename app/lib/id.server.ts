import { customAlphabet } from 'nanoid'

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export const nanoid = customAlphabet(alphabet, 10)
