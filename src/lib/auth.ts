import { supabase } from './supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}

export function getUser() {
  return supabase.auth.getUser()
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback)
}
