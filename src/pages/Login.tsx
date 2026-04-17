import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle, signInWithEmail, signUp } from '../lib/auth'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.9 0 5.6 1.1 7.7 2.9L37.4 9C34 5.9 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c2.9 0 5.6 1.1 7.7 2.9L37.4 9C34 5.9 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.8 13.5-4.8l-6.2-5.2C29.5 35.6 26.9 36.5 24 36.5c-5.2 0-9.7-3.5-11.3-8.4l-6.5 5C9.5 39.7 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.4-2.4 4.5-4.4 6l6.2 5.2C40.5 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}

export default function Login() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  async function handleGoogle() {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Completa todos los campos'); return }
    setLoading(true); setError(null); setMessage(null)
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setMessage('Revisa tu correo para confirmar el registro.')
      }
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">K</div>
        <h1 className="login-title">K'Flow</h1>
        <p className="login-subtitle">Finanzas personales inteligentes</p>

        <button className="login-google" onClick={handleGoogle} type="button">
          <GoogleIcon />
          Continuar con Google
        </button>

        <div className="login-divider"><span>o</span></div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label className="login-label">Contraseña</label>
            <input
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error   && <div className="login-error">{error}</div>}
          {message && <div className="login-message">{message}</div>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <p className="login-toggle">
          {mode === 'login' ? (
            <>¿No tienes cuenta?{' '}
              <button type="button" onClick={() => { setMode('register'); setError(null); setMessage(null) }}>
                Regístrate
              </button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(null); setMessage(null) }}>
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
