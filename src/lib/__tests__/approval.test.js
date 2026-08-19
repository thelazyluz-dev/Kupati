import { describe, it, expect } from 'vitest'
import { applyApproval } from '../requests.js'

// Records every api call so we can assert exactly what an approval did.
function mockApi(settings = { globalExchangeRate: 2 }) {
  const calls = {
    addStars: [], adjustStars: [], adjustShekels: [], addTransaction: [],
    convertStars: [], addGoal: [], updateGoal: [], updateChild: [],
    startSavings: [], finishSavings: [], doTransferStars: [], doTransferMoney: [],
  }
  const api = {
    addStars: (...a) => calls.addStars.push(a),
    adjustStars: (...a) => calls.adjustStars.push(a),
    adjustShekels: (...a) => calls.adjustShekels.push(a),
    addTransaction: (...a) => calls.addTransaction.push(a),
    convertStars: (...a) => { calls.convertStars.push(a); return Math.round(a[1] * settings.globalExchangeRate * 100) / 100 },
    addGoal: (...a) => calls.addGoal.push(a),
    updateGoal: (...a) => calls.updateGoal.push(a),
    updateChild: (...a) => calls.updateChild.push(a),
    startSavings: (...a) => calls.startSavings.push(a),
    finishSavings: (...a) => calls.finishSavings.push(a),
    doTransferStars: (...a) => calls.doTransferStars.push(a),
    doTransferMoney: (...a) => calls.doTransferMoney.push(a),
    settings,
  }
  return { api, calls }
}

const lastTx = (calls) => calls.addTransaction[calls.addTransaction.length - 1][1]

describe('applyApproval — balance direction & currency per type', () => {
  it('money (deposit) → shekels UP, never stars', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'money', childId: 'c1', amount: 20, currency: 'shekels' }, api)
    expect(calls.adjustShekels).toEqual([['c1', 20]])
    expect(calls.addStars).toEqual([])
    expect(calls.adjustStars).toEqual([])
    expect(lastTx(calls)).toMatchObject({ currency: 'shekels', amount: 20 })
  })

  it('stars request → stars UP, never shekels', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'stars', childId: 'c1', amount: 10, currency: 'stars' }, api)
    expect(calls.addStars).toEqual([['c1', 10]])
    expect(calls.adjustShekels).toEqual([])
    expect(lastTx(calls)).toMatchObject({ currency: 'stars', amount: 10 })
  })

  it('purchase → shekels DOWN', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'purchase', childId: 'c1', amount: 15, currency: 'shekels' }, api)
    expect(calls.adjustShekels).toEqual([['c1', -15]])
    expect(lastTx(calls)).toMatchObject({ type: 'expense', currency: 'shekels' })
  })

  it('prize → stars DOWN', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'prize', childId: 'c1', amount: 8, currency: 'stars', choreName: 'גלידה' }, api)
    expect(calls.adjustStars).toEqual([['c1', -8]])
    expect(calls.adjustShekels).toEqual([])
    expect(lastTx(calls)).toMatchObject({ type: 'prize_redeem', currency: 'stars' })
  })

  it('chore → stars UP with chore transaction', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'chore', childId: 'c1', amount: 3, currency: 'stars', choreName: 'כלים', timestamp: 123 }, api)
    expect(calls.addStars).toEqual([['c1', 3]])
    expect(lastTx(calls)).toMatchObject({ type: 'chore', currency: 'stars', amount: 3, timestamp: 123 })
  })

  it('untyped request defaults to chore (stars)', () => {
    const { api, calls } = mockApi()
    applyApproval({ childId: 'c1', amount: 2, currency: 'stars', choreName: 'x' }, api)
    expect(calls.addStars).toEqual([['c1', 2]])
  })

  it('convert → convertStars + two conversion txs', () => {
    const { api, calls } = mockApi({ globalExchangeRate: 2 })
    applyApproval({ type: 'convert', childId: 'c1', amount: 10, currency: 'stars' }, api)
    expect(calls.convertStars).toEqual([['c1', 10, { globalExchangeRate: 2 }]])
    expect(calls.addTransaction).toHaveLength(2)
    expect(calls.addTransaction[0][1]).toMatchObject({ type: 'convert_out', currency: 'stars', amount: 10 })
    expect(calls.addTransaction[1][1]).toMatchObject({ type: 'convert_in', currency: 'shekels', amount: 20 })
  })
})

describe('applyApproval — non-balance types', () => {
  it('goal (new) → addGoal', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'goal', childId: 'c1', meta: { name: 'אופניים', emoji: '🚲', targetAmount: 200 } }, api)
    expect(calls.addGoal).toEqual([['c1', { name: 'אופניים', emoji: '🚲', targetAmount: 200, goalImage: undefined }]])
    expect(calls.updateGoal).toEqual([])
  })

  it('goal (existing id) → updateGoal', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'goal', childId: 'c1', meta: { goalId: 'g9', name: 'עדכון', targetAmount: 50 } }, api)
    expect(calls.updateGoal).toEqual([['c1', 'g9', { name: 'עדכון', emoji: undefined, targetAmount: 50 }]])
    expect(calls.addGoal).toEqual([])
  })

  it('profile → updateChild with the requested changes only', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'profile', childId: 'c1', meta: { changes: { name: 'רון', avatar: '🐼' } } }, api)
    expect(calls.updateChild).toEqual([['c1', { name: 'רון', avatar: '🐼' }]])
  })

  it('transfer stars → doTransferStars', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'transfer', childId: 'c1', amount: 5, currency: 'stars', meta: { toChildId: 'c2' } }, api)
    expect(calls.doTransferStars).toEqual([['c1', 'c2', 5, 0]])
    expect(calls.doTransferMoney).toEqual([])
  })

  it('transfer shekels → doTransferMoney', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'transfer', childId: 'c1', amount: 7, currency: 'shekels', meta: { toChildId: 'c2' } }, api)
    expect(calls.doTransferMoney).toEqual([['c1', 'c2', 7]])
    expect(calls.doTransferStars).toEqual([])
  })

  it('savings_open → startSavings', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'savings_open', childId: 'c1', amount: 30 }, api)
    expect(calls.startSavings).toEqual([['c1', { amount: 30 }]])
  })

  it('savings_withdraw → finishSavings with saving id + mode', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'savings_withdraw', childId: 'c1', meta: { savingId: 's1', mode: 'early' } }, api)
    expect(calls.finishSavings).toEqual([['c1', 's1', 'early']])
  })

  it('free with no reward → no balance change at all', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'free', childId: 'c1', title: 'לישון מאוחר' }, api)
    expect(calls.addStars).toEqual([])
    expect(calls.adjustShekels).toEqual([])
    expect(calls.addTransaction).toEqual([])
  })

  it('free with reward → grants the bonus', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'free', childId: 'c1', title: 'עזרה' }, api, { rewardStars: 5, rewardShekels: 2 })
    expect(calls.addStars).toEqual([['c1', 5]])
    expect(calls.adjustShekels).toEqual([['c1', 2]])
  })
})

describe('applyApproval — amount override (approve-with-edit)', () => {
  it('money honours opts.amount over req.amount', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'money', childId: 'c1', amount: 20, currency: 'shekels' }, api, { amount: 5 })
    expect(calls.adjustShekels).toEqual([['c1', 5]])
  })

  it('stars honours opts.amount over req.amount', () => {
    const { api, calls } = mockApi()
    applyApproval({ type: 'stars', childId: 'c1', amount: 100, currency: 'stars' }, api, { amount: 10 })
    expect(calls.addStars).toEqual([['c1', 10]])
  })
})

describe('applyApproval — invariants', () => {
  const currencyTypes = [
    { type: 'money', currency: 'shekels', touches: 'adjustShekels' },
    { type: 'stars', currency: 'stars', touches: 'addStars' },
    { type: 'purchase', currency: 'shekels', touches: 'adjustShekels' },
    { type: 'prize', currency: 'stars', touches: 'adjustStars' },
  ]
  currencyTypes.forEach(({ type, touches }) => {
    it(`${type} touches only ${touches} among the four balance mutators`, () => {
      const { api, calls } = mockApi()
      applyApproval({ type, childId: 'c1', amount: 4, currency: type.includes('money') || type === 'purchase' ? 'shekels' : 'stars' }, api)
      const mutators = ['addStars', 'adjustStars', 'adjustShekels']
      mutators.forEach((m) => {
        if (m === touches) expect(calls[m].length, `${type} should call ${m}`).toBe(1)
        else expect(calls[m].length, `${type} should NOT call ${m}`).toBe(0)
      })
    })
  })

  it('does not throw on an unknown type', () => {
    const { api, calls } = mockApi()
    expect(() => applyApproval({ type: 'nonsense', childId: 'c1', amount: 1 }, api)).not.toThrow()
    expect(calls.addStars).toEqual([])
    expect(calls.adjustShekels).toEqual([])
  })
})
