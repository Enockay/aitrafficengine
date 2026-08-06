import {
  BarChart3,
  CalendarClock,
  CreditCard,
  FileText,
  Globe,
  Image,
  LayoutDashboard,
  type LucideIcon,
  Plug,
  Send,
  Settings,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export const OVERVIEW_ITEM: NavItem = { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Content',
    items: [
      { label: 'Sites', path: '/sites', icon: Globe },
      { label: 'Pages', path: '/pages', icon: FileText },
      { label: 'Posts', path: '/posts', icon: Send },
      { label: 'Flyers', path: '/flyers', icon: Image },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { label: 'Scheduler', path: '/scheduler', icon: CalendarClock },
      { label: 'Platforms', path: '/platforms', icon: Plug },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Analytics', path: '/analytics', icon: BarChart3 }],
  },
]

export const SETTINGS_ITEM: NavItem = { label: 'Settings', path: '/settings', icon: Settings }
export const BILLING_ITEM: NavItem = { label: 'Billing', path: '/billing', icon: CreditCard }

export const ALL_NAV_ITEMS: NavItem[] = [
  OVERVIEW_ITEM,
  ...NAV_SECTIONS.flatMap((s) => s.items),
  BILLING_ITEM,
  SETTINGS_ITEM,
]
