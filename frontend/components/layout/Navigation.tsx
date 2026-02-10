'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon?: string;
  children?: NavItem[];
}

interface NavigationProps {
  items: NavItem[];
  rightSlot?: React.ReactNode;
}

export default function Navigation({ items, rightSlot }: NavigationProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setOpenDropdowns({});
  }, [pathname]);

  return (
    <nav className="sticky top-0 bg-background border-b border-border z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-button h-button rounded-button text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Right Slot (Profile Avatar, etc.) */}
          <div className="flex items-center">
            {rightSlot}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute left-0 right-0 top-full bg-background border-b border-border shadow-lg max-h-[80vh] overflow-y-auto"
          >
            <div className="px-4 py-2 space-y-1">
              {items.map((item) => {
                const isActive = isItemActive(item);
                const hasChildren = item.children && item.children.length > 0;
                const isOpen = !!openDropdowns[item.label];

                if (hasChildren) {
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleDropdown(item.label)}
                        className={cn(
                          "w-full flex items-center justify-between px-button h-button rounded-button text-sm font-medium transition-colors",
                          isActive
                            ? "text-primary bg-primary/10"
                            : "text-foreground hover:bg-secondary"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {item.icon && <span className="text-base">{item.icon}</span>}
                          {item.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>

                      {isOpen && item.children && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const isChildActive = isItemActive(child);
                            return (
                              <Link
                                key={child.href}
                                href={child.href || '#'}
                                className={cn(
                                  "block px-button h-button rounded-button text-sm transition-colors flex items-center",
                                  isChildActive
                                    ? "text-primary bg-primary/10 font-medium"
                                    : "text-muted-foreground hover:bg-secondary"
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

                // Items without children
                return (
                  <Link
                    key={item.label}
                    href={item.href || '#'}
                    className={cn(
                      "flex items-center gap-2 px-button h-button rounded-button text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
