'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Package,
  Plane,
  MessageSquare,
  User,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  Truck,
  PackageCheck,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard, roles: ['traveler', 'sender'] },
  { name: 'My Trips', href: '/trips', icon: Plane, roles: ['traveler'] },
  { name: 'My Deliveries', href: '/my-deliveries', icon: Truck, roles: ['traveler'] },
  { name: 'Find Parcels', href: '/find-parcels', icon: Search, roles: ['traveler'] },
  { name: 'My Parcels', href: '/parcels', icon: Package, roles: ['sender'] },
  { name: 'My Sent Parcels', href: '/my-sent-parcels', icon: PackageCheck, roles: ['sender'] },
  { name: 'Find Travelers', href: '/find-travelers', icon: Search, roles: ['sender'] },
  { name: 'Match Requests', href: '/match-requests', icon: Bell, roles: ['traveler', 'sender'] },
  { name: 'Messages', href: '/messages', icon: MessageSquare, roles: ['traveler', 'sender'] },
  { name: 'Profile', href: '/profile', icon: User, roles: ['traveler', 'sender'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['traveler', 'sender'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);

  const filteredNavigation = navigation.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xl font-bold text-primary">PaarcelMate</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-5 space-y-1 px-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-primary-foreground' : 'text-gray-500 dark:text-gray-400',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info in mobile sidebar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {role} Mode
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="text-xl font-bold text-primary">
              PaarcelMate
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-primary-foreground' : 'text-gray-500 dark:text-gray-400',
                      'mr-3 h-5 w-5 flex-shrink-0'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info in desktop sidebar */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {role} Mode
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-40 rounded-md bg-white dark:bg-gray-800 p-2 text-gray-400 lg:hidden shadow-md"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>
    </>
  );
}
