import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Modal from '../ui/Modal.jsx'

export default function PinModal() {
  const { closeModal, modalData, settings, updateSettings } = useApp()
  // mode: 'check' | 'setup' | 'change'
  const mode = modalData?.mode || 'check'
  const onSuccess = modalData?.onSuccess

  const [digits, setDigits] = useState([])
  const [firstPin, setFirstPin] = useState('')
  const [step, setStep] = useState(mode === 'check' ? 'check' : 'enter')
  const [error, setError] = useState('')

  function title() {
    if (mode === 'check') return '🔒 הזן קוד הורים'
    if (step === 'enter') return '🔑 בחר קוד 4 ספרות'
    return '🔑 אשר קוד'
  }

  function addDigit(d) {
    if (digits.length >= 4) return
    const next = [...digits, d]
    setDigits(next)
    setError('')
    if (next.length === 4) {
      setTimeout(() => handleComplete(next.join('')), 120)
    }
  }

  function backspace() {
    setDigits((prev) => prev.slice(0, -1))
    setError('')
  }

  function handleComplete(pin) {
    if (mode === 'check') {
      if (pin === settings.pin) {
        closeModal()
        onSuccess?.()
      } else {
        setDigits([])
        setError('קוד שגוי, נסה שוב')
      }
    } else {
      // setup / change
      if (step === 'enter') {
        // If changing, verify current PIN first
        if (mode === 'change' && settings.pin && pin !== settings.pin) {
          setDigits([])
          setError('הקוד הנוכחי שגוי')
          return
        }
        setFirstPin(pin)
        setDigits([])
        setStep(mode === 'change' ? 'new' : 'confirm')
        setError('')
      } else if (step === 'new') {
        setFirstPin(pin)
        setDigits([])
        setStep('confirm')
      } else if (step === 'confirm') {
        if (pin === firstPin) {
          updateSettings({ pin: firstPin })
          closeModal()
        } else {
          setDigits([])
          setStep(mode === 'change' ? 'new' : 'enter')
          setFirstPin('')
          setError('הקודים לא תואמים, נסה שוב')
        }
      }
    }
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < digits.length)

  return (
    <Modal title={title()} onClose={closeModal}>
      <div className="space-y-6">
        {/* 4 dots */}
        <div className="flex justify-center gap-4 py-2">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                filled ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-sm font-semibold animate-pop">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => addDigit(String(d))}
              className="h-14 rounded-2xl active:scale-90 transition-all text-xl font-bold text-gray-800 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: '1.5px solid rgba(229,231,235,0.8)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.07), inset 0 1px 2px rgba(255,255,255,1)',
              }}
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => addDigit('0')}
            className="h-14 rounded-2xl active:scale-90 transition-all text-xl font-bold text-gray-800 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: '1.5px solid rgba(229,231,235,0.8)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.07), inset 0 1px 2px rgba(255,255,255,1)',
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            className="h-14 rounded-2xl active:scale-90 transition-all text-xl text-gray-500 cursor-pointer"
            style={{
              background: 'rgba(249,250,251,0.9)',
              border: '1.5px solid rgba(229,231,235,0.8)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.07), inset 0 1px 2px rgba(255,255,255,1)',
            }}
          >
            ⌫
          </button>
        </div>
      </div>
    </Modal>
  )
}
