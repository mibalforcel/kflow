import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { fetchProfile, saveProfile as dbSaveProfile } from '../lib/db'
import type { UserProfileRow, UserProfileInsert, Currency } from '../lib/types'

interface ProfileContextType {
  profile: UserProfileRow | null
  loading: boolean
  currency: Currency
  saveProfile: (updates: Partial<UserProfileInsert>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  currency: 'USD',
  saveProfile: async () => {},
  refreshProfile: async () => {},
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile() {
    try {
      const p = await fetchProfile()
      setProfile(p)
      if (p) localStorage.setItem('kflow_currency', p.currency)
    } catch {
      // silent — profile may not exist yet (initProfile runs in AuthContext)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    loadProfile()
  }, [user])

  async function saveProfile(updates: Partial<UserProfileInsert>) {
    const updated = await dbSaveProfile(updates)
    setProfile(updated)
    if (updates.currency) localStorage.setItem('kflow_currency', updates.currency)
  }

  const currency: Currency =
    (profile?.currency ?? (localStorage.getItem('kflow_currency') as Currency | null) ?? 'USD')

  return (
    <ProfileContext.Provider value={{ profile, loading, currency, saveProfile, refreshProfile: loadProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
