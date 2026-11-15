// All backend calls live here. If Claude 1's API.md changes a shape, fix it in this file only.
import { supabase } from './supabase'

async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = error.message || 'Request failed'
    try {
      const ctx = await error.context?.json?.()
      if (ctx?.error) message = ctx.error
    } catch { /* keep default message */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/** { imageBase64?, mimeType?, text?, audioBase64?, audioMimeType? } -> AI analysis JSON */
export const analyzeComplaint = (payload) => callFunction('analyze-complaint', payload)

/** Complaint fields -> { id, complaint_number } */
export const submitComplaint = (payload) => callFunction('submit-complaint', payload)
