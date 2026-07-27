import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext(null)

const CONFIG_ERROR_MESSAGE =
  'Supabase 설정이 되어 있지 않습니다. .env의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 확인해주세요.'

// PRD.md F4 — 이메일/비밀번호 로그인 상태를 앱 전체에서 쓸 수 있게 관리한다.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp(email, password) {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR_MESSAGE }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }

    // 프로젝트의 "이메일 확인" 설정에 따라 가입 직후 세션이 없을 수 있다.
    return { error: null, needsEmailConfirmation: !data.session }
  }

  async function signIn(email, password) {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR_MESSAGE }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signUp, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
