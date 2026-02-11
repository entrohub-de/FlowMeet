'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon?: string;
  children?: NavItem[];
}

interface NavigationProps {
  items: NavItem[];
  rightSlot?: React.ReactNode;
  logoHref?: string;
}

export default function Navigation({ items, rightSlot, logoHref }: NavigationProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  }, [pathname]);

  return (
    <>
      <nav className={cn(
        "sticky top-0 border-b border-border z-50 transition-colors",
        isMenuOpen ? "bg-gray-200" : "bg-background"
      )}>
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

            {/* Center Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              {logoHref ? (
                <Link href={logoHref}>
                  <Image
                    src="/images/entrohub-full-logo.png"
                    alt="Logo"
                    width={120}
                    height={32}
                    className="object-contain hover:opacity-80 transition-opacity"
                    priority
                  />
                </Link>
              ) : (
                <Image
                  src="/images/entrohub-full-logo.png"
                  alt="Logo"
                  width={120}
                  height={32}
                  className="object-contain"
                  priority
                />
              )}
            </div>

            {/* Right Slot (Profile Avatar, etc.) */}
            <div className="flex items-center">
              {rightSlot}
            </div>
          </div>
        </div>
      </nav>

      {/* Backdrop Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Side Drawer Menu */}
      <div
        ref={menuRef}
        className={cn(
          "fixed top-0 left-0 h-full w-56 bg-background border-r border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto",
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="relative flex items-center justify-start px-6 py-4 border-b border-border">
          {/* Logo */}
          {logoHref ? (
            <Link href={logoHref} className="flex items-center">
              <Image
                src="/images/entrohub-full-logo.png"
                alt="Logo"
                width={140}
                height={40}
                className="object-contain hover:opacity-80 transition-opacity"
                priority
              />
            </Link>
          ) : (
            <Image
              src="/images/entrohub-full-logo.png"
              alt="Logo"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          )}

          {/* Close Button */}
          <button
            onClick={() => setIsMenuOpen(false)}
            className="absolute right-4 top-4 p-2 hover:bg-secondary rounded-button transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="px-4 py-2 space-y-1">
          {items.map((item) => {
            const isActive = isItemActive(item);
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren) {
              return (
                <div key={item.label}>
                  <div
                    className={cn(
                      "w-full flex items-center px-button h-button text-sm font-medium",
                      isActive
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon && <span className="text-base">{item.icon}</span>}
                      {item.label}
                    </span>
                  </div>

                  <div className="ml-3 mt-1 space-y-1">
                    {item.children?.map((child) => {
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
    </>
  );
}
