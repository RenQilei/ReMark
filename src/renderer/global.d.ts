import type { RemarkAPI } from '../shared/api'

declare global {
  interface Window {
    remark: RemarkAPI
  }
}

export {}
