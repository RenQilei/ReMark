import { notarize } from '@electron/notarize'
import path from 'node:path'

export default async function afterSign(context) {
  if (process.env.REMARK_NOTARIZE !== '1') {
    console.log('Skipping notarization (REMARK_NOTARIZE is not 1).')
    return
  }
  const { appOutDir, packager } = context
  const appName = packager.appInfo.productFilename
  const appleApiKey = process.env.APPLE_API_KEY
  const appleApiKeyId = process.env.APPLE_API_KEY_ID
  const appleApiIssuer = process.env.APPLE_API_ISSUER
  if (!appleApiKey || !appleApiKeyId || !appleApiIssuer) {
    throw new Error('Stable notarization requires APPLE_API_KEY, APPLE_API_KEY_ID and APPLE_API_ISSUER in CI secrets.')
  }
  await notarize({
    appPath: path.join(appOutDir, `${appName}.app`),
    appleApiKey,
    appleApiKeyId,
    appleApiIssuer,
  })
}
