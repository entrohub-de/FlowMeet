'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  href?: string;
  icon?: string;
  children?: NavItem[];
}

interface NavigationProps {
  items: NavItem[];
}

export default function Navigation({ items }: NavigationProps) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const isItemActive = (item: NavItem): boolean => {
    if (item.href) {
      return pathname === item.href || pathname.startsWith(item.href + '/');
    }
    if (item.children) {
      return item.children.some(child => isItemActive(child));
    }
    return false;
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  return (
    <nav className="sticky top-0 bg-white border-b border-border z-50">
      <div className="px-4 py-3 overflow-visible">
        <div className="flex items-center gap-2 overflow-visible flex-wrap">
          {items.map((item) => {
            const isActive = isItemActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = !!openDropdowns[item.label];

            if (hasChildren) {
              return (
                <div key={item.label} className="relative">
                  <button
                    onClick={() => toggleDropdown(item.label)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                      "hover:bg-secondary cursor-pointer",
                      isActive
                        ? "text-primary bg-primary/10 border-primary/20"
                        : "text-muted-foreground bg-transparent border-transparent"
                    )}
                  >
                    <span>{item.label}</span>
                    <svg 
                      className={cn(
                        "w-4 h-4 transition-transform",
                        isOpen && "rotate-180"
                      )} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>

                  {isOpen && item.children && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg py-2 z-50 w-56">
                      {item.children.map((child) => {
                        const isChildActive = isItemActive(child);
                        return (
                          <Link
                            key={child.href}
                            href={child.href || '#'}
                            onClick={() => setOpenDropdowns(prev => ({ ...prev, [item.label]: false }))}
                            className={cn(
                              "block px-4 py-2 text-sm transition-colors hover:bg-secondary",
                              isChildActive
                                ? "text-primary bg-primary/10 font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // 没有子菜单的项目
            return (
              <Link
                key={item.label}
                href={item.href || '#'}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                  "hover:bg-secondary",
                  isActive
                    ? "text-primary bg-primary/10 border-primary/20"
                    : "text-muted-foreground bg-transparent border-transparent"
                )}
              >
                {item.icon && <span className="text-base">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
