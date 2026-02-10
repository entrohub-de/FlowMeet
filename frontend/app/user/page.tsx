'use client';

import { useTranslation } from '@/lib/i18n/context';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, MessageSquare, Award } from 'lucide-react';

export default function UserHomePage() {
  const { t } = useTranslation();

  const quickLinks = [
    {
      title: t('user.signup'),
      description: t('user.signupDesc'),
      href: '/user/signup',
      icon: Calendar,
    },
    {
      title: t('user.matching'),
      description: t('user.matchingPageDesc'),
      href: '/user/matching',
      icon: Users,
    },
    {
      title: t('user.groups'),
      description: t('user.groupsPageDesc'),
      href: '/user/groups',
      icon: MessageSquare,
    },
    {
      title: t('user.rating'),
      description: t('user.ratingPageDesc'),
      href: '/user/rating',
      icon: Award,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero Image with Text Overlay */}
        <div className="relative mb-12 rounded-xl overflow-hidden">
          <Image
            src="/images/hero_image.jpg"
            alt="FlowMeet Hero"
            width={1200}
            height={400}
            className="w-full h-auto object-cover"
            priority
          />
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />

          {/* Welcome Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {t('user.welcomeHome')}
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl">
              {t('user.welcomeHomeDesc')}
            </p>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/40 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
