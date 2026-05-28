import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getInitials } from '@/lib/inspectors'
import type { Profile } from '@/lib/types'

const MENU = [
  {
    label: 'Kilometre Log',
    description: 'Track travel distances between sites',
    href: '/dashboard/km-log',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-orange-50 text-orange-600',
  },
  {
    label: 'Reports',
    description: 'Export inspections and km log as PDF',
    href: '/dashboard/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'bg-green-50 text-green-600',
  },
  {
    label: 'Map',
    description: 'View inspection sites on a map',
    href: '/dashboard/map',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    color: 'bg-blue-50 text-blue-600',
  },
]

export default async function MorePage() {
  let p: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      p = data as Profile | null
    }
  } catch { /* fallback */ }

  const initials = getInitials(p?.full_name)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1a1745] px-5 pt-10 pb-6">
        <h1 className="text-white text-xl font-bold mb-4">More</h1>
        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{p?.full_name ?? 'Inspector'}</p>
            <p className="text-purple-300 text-xs capitalize">{p?.role ?? 'inspector'}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3 pb-8">
        {MENU.map(item => (
          <Link key={item.href} href={item.href}>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-semibold text-sm">{item.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}

        {/* Sign out */}
        <div className="pt-4">
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-500 font-semibold text-sm shadow-sm"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
