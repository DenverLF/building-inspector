import BottomNav from '@/components/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto pb-24">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
