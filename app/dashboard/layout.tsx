import BottomNav from '@/components/BottomNav'
import AuthGuard from '@/components/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-sm mx-auto pb-24">
          {children}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}
