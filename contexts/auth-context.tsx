'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Initial session:', session?.user?.email || 'No session')
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email || 'No user')
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in with:', email)

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('Sign in response:', { error, data })

    if (error) {
      console.error('Sign in error:', error)
      return { error }
    }

    // Check if user email is confirmed
    if (data.user && !data.user.email_confirmed_at) {
      console.log('User not confirmed:', data.user)
      return {
        error: {
          message: "Please check your email to verify your account before signing in. If you didn't receive an email, please check your spam folder."
        }
      }
    }

    console.log('Sign in successful for user:', data.user?.email)
    return { error: null }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
        emailRedirectTo: `${window.location.origin}/auth/login`
      }
    })
    return { error }
  }

  const signOut = async () => {
    console.log('Context: signOut called')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Context: signOut error:', error)
    } else {
      console.log('Context: signOut successful')
    }
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}