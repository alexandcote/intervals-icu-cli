import { createInterface } from 'node:readline/promises'
import type { ReadStream, WriteStream } from 'node:tty'
import { CliError } from './errors.js'

export type SecretPrompt = (message: string) => Promise<string>

/** Prompt for a secret without echoing it when attached to a terminal. */
export async function promptSecret(
  message: string,
  input: ReadStream = process.stdin,
  output: WriteStream = process.stderr,
): Promise<string> {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    const readline = createInterface({ input, output })
    try {
      return await readline.question(message)
    } finally {
      readline.close()
    }
  }

  return await new Promise<string>((resolve, reject) => {
    let value = ''
    const wasRaw = input.isRaw

    const cleanup = () => {
      input.removeListener('data', onData)
      input.removeListener('end', onEnd)
      input.removeListener('error', onError)
      input.setRawMode(wasRaw)
      input.pause()
    }
    const finish = () => {
      output.write('\n')
      cleanup()
      resolve(value)
    }
    const cancel = () => {
      output.write('\n')
      cleanup()
      reject(new CliError('USAGE_ERROR', 'API key prompt cancelled', 'Run `intervals config set api_key` and enter the key when prompted.'))
    }
    const onData = (chunk: Buffer | string) => {
      for (const char of chunk.toString()) {
        if (char === '\r' || char === '\n') return finish()
        if (char === '\u0003' || char === '\u0004') return cancel()
        if (char === '\u007f' || char === '\b') {
          value = Array.from(value).slice(0, -1).join('')
        } else if (char >= ' ') {
          value += char
        }
      }
    }
    const onEnd = () => cancel()
    const onError = (error: Error) => {
      output.write('\n')
      cleanup()
      reject(error)
    }

    output.write(message)
    input.setRawMode(true)
    input.on('data', onData)
    input.once('end', onEnd)
    input.once('error', onError)
    input.resume()
  })
}
