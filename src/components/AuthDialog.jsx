import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { useAuth } from '../context/AuthContext'

// PRD.md §6 화면 구성 — 로그인 / 회원가입 (F4, 이메일+비밀번호)
export default function AuthDialog({ open, onOpenChange }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signIn') // 'signIn' | 'signUp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [infoMessage, setInfoMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setEmail('')
    setPassword('')
    setErrorMessage(null)
    setInfoMessage(null)
  }

  function handleOpenChange(nextOpen) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  function toggleMode() {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'))
    setErrorMessage(null)
    setInfoMessage(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)
    setIsSubmitting(true)

    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password)

    setIsSubmitting(false)

    if (result.error) {
      setErrorMessage(result.error)
      return
    }

    if (mode === 'signUp') {
      if (result.needsEmailConfirmation) {
        setInfoMessage('가입 확인 메일을 보냈어요. 메일함에서 인증한 뒤 로그인해주세요.')
        setMode('signIn')
        setPassword('')
      } else {
        handleOpenChange(false)
      }
      return
    }

    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'signIn' ? '로그인' : '회원가입'}</DialogTitle>
          <DialogDescription>
            이메일과 비밀번호로 {mode === 'signIn' ? '로그인' : '회원가입'}하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-700">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">비밀번호</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          {infoMessage && <p className="text-sm text-green-600">{infoMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '처리 중...' : mode === 'signIn' ? '로그인' : '회원가입'}
          </button>
        </form>

        <button
          type="button"
          onClick={toggleMode}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          {mode === 'signIn' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </DialogContent>
    </Dialog>
  )
}
