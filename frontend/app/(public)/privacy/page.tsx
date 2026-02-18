'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

export default function PrivacyPage() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div className="min-h-screen bg-background relative">
      <button
        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        className="absolute top-4 right-4 px-button h-button text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-button transition-colors cursor-pointer flex items-center justify-center"
      >
        {locale === 'zh' ? 'EN' : '中文'}
      </button>

      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="text-sm text-primary hover:underline mb-8 inline-block"
        >
          &larr; {t('common.back')}
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">
          {t('privacy.policy.title')}
        </h1>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <p className="text-muted-foreground text-sm">
            {t('privacy.policy.lastUpdated')}: 2026-02-18
          </p>

          {/* Section 1: Data Controller */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.controllerTitle')}
            </h2>
            {locale === 'zh' ? (
              <p>
                FlowMeet（以下简称「我们」）是本网站的数据控制者。如果您对数据处理有任何疑问，请通过以下方式联系我们：
                <br />
                邮箱：privacy@flowmeet.org
              </p>
            ) : (
              <p>
                FlowMeet (hereinafter &quot;we&quot;) is the data controller for this website. If you have any questions about data processing, please contact us at:
                <br />
                Email: privacy@flowmeet.org
              </p>
            )}
          </section>

          {/* Section 2: Data We Collect */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.dataCollectedTitle')}
            </h2>
            {locale === 'zh' ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>账户信息：邮箱地址、昵称、头像（如您选择上传）</li>
                <li>个人资料：性别、年龄段、语言能力、兴趣领域、职业背景</li>
                <li>活动数据：报名信息、签到记录、配对记录、评分反馈</li>
                <li>技术数据：IP 地址、浏览器类型、设备信息（用于网站功能和安全）</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>Account information: email address, nickname, avatar (if you choose to upload)</li>
                <li>Profile data: gender, age group, language skills, interests, professional background</li>
                <li>Event data: registration info, check-in records, matching records, rating feedback</li>
                <li>Technical data: IP address, browser type, device information (for website functionality and security)</li>
              </ul>
            )}
          </section>

          {/* Section 3: Legal Basis */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.legalBasisTitle')}
            </h2>
            {locale === 'zh' ? (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>同意（Art. 6(1)(a) DSGVO）</strong>：注册账户、提供个人资料时基于您的明确同意</li>
                <li><strong>合同履行（Art. 6(1)(b) DSGVO）</strong>：为提供活动管理服务所必需的数据处理</li>
                <li><strong>合法利益（Art. 6(1)(f) DSGVO）</strong>：网站安全、防滥用、服务改进</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Consent (Art. 6(1)(a) GDPR)</strong>: When you create an account and provide personal data based on your explicit consent</li>
                <li><strong>Contract performance (Art. 6(1)(b) GDPR)</strong>: Processing necessary to provide our event management services</li>
                <li><strong>Legitimate interest (Art. 6(1)(f) GDPR)</strong>: Website security, abuse prevention, service improvement</li>
              </ul>
            )}
          </section>

          {/* Section 4: Purpose of Processing */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.purposeTitle')}
            </h2>
            {locale === 'zh' ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>提供活动注册、签到和管理服务</li>
                <li>实现参与者配对和小组分配功能</li>
                <li>生成个性化对话话题</li>
                <li>改进我们的服务质量</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide event registration, check-in, and management services</li>
                <li>Enable participant matching and group assignment features</li>
                <li>Generate personalized conversation topics</li>
                <li>Improve the quality of our services</li>
              </ul>
            )}
          </section>

          {/* Section 5: Cookies */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.cookiesTitle')}
            </h2>
            {locale === 'zh' ? (
              <p>
                我们使用必要的 Cookie 来维持您的登录状态和网站功能。这些 Cookie 对网站正常运行至关重要，无法关闭。我们不使用任何跟踪或广告 Cookie。
              </p>
            ) : (
              <p>
                We use essential cookies to maintain your login session and website functionality. These cookies are strictly necessary for the website to function and cannot be disabled. We do not use any tracking or advertising cookies.
              </p>
            )}
          </section>

          {/* Section 6: Third-Party Services */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.thirdPartyTitle')}
            </h2>
            {locale === 'zh' ? (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase</strong>：数据库和身份验证服务提供商（服务器位于欧盟）</li>
                <li><strong>Google OAuth</strong>：可选的第三方登录服务。使用 Google 登录时，我们仅接收您的邮箱地址和基本资料</li>
                <li><strong>Vercel</strong>：网站托管服务提供商</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase</strong>: Database and authentication service provider (servers located in the EU)</li>
                <li><strong>Google OAuth</strong>: Optional third-party login service. When using Google Sign-In, we only receive your email address and basic profile</li>
                <li><strong>Vercel</strong>: Website hosting service provider</li>
              </ul>
            )}
          </section>

          {/* Section 7: Your Rights */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.rightsTitle')}
            </h2>
            {locale === 'zh' ? (
              <>
                <p>根据 DSGVO，您享有以下权利：</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>访问权（Art. 15）</strong>：您有权了解我们处理了哪些个人数据</li>
                  <li><strong>更正权（Art. 16）</strong>：您有权要求更正不准确的数据</li>
                  <li><strong>删除权（Art. 17）</strong>：您有权要求删除您的个人数据</li>
                  <li><strong>限制处理权（Art. 18）</strong>：您有权要求限制数据处理</li>
                  <li><strong>数据可携带权（Art. 20）</strong>：您有权以结构化格式获取您的数据</li>
                  <li><strong>反对权（Art. 21）</strong>：您有权反对基于合法利益的数据处理</li>
                  <li><strong>撤回同意权</strong>：您可以随时撤回之前给予的同意</li>
                </ul>
                <p>
                  如需行使以上权利，请发送邮件至 privacy@flowmeet.org。您也有权向数据保护监管机构投诉。
                </p>
              </>
            ) : (
              <>
                <p>Under the GDPR, you have the following rights:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Right of access (Art. 15)</strong>: You have the right to know what personal data we process</li>
                  <li><strong>Right to rectification (Art. 16)</strong>: You have the right to correct inaccurate data</li>
                  <li><strong>Right to erasure (Art. 17)</strong>: You have the right to request deletion of your personal data</li>
                  <li><strong>Right to restriction (Art. 18)</strong>: You have the right to restrict data processing</li>
                  <li><strong>Right to data portability (Art. 20)</strong>: You have the right to receive your data in a structured format</li>
                  <li><strong>Right to object (Art. 21)</strong>: You have the right to object to processing based on legitimate interests</li>
                  <li><strong>Right to withdraw consent</strong>: You can withdraw your consent at any time</li>
                </ul>
                <p>
                  To exercise any of these rights, please email privacy@flowmeet.org. You also have the right to lodge a complaint with a data protection supervisory authority.
                </p>
              </>
            )}
          </section>

          {/* Section 8: Data Retention */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.retentionTitle')}
            </h2>
            {locale === 'zh' ? (
              <p>
                您的个人数据将在您的账户有效期间保留。删除账户后，我们将在 30 天内删除或匿名化您的个人数据，除非法律要求我们保留更长时间。
              </p>
            ) : (
              <p>
                Your personal data will be retained for as long as your account is active. After account deletion, we will delete or anonymize your personal data within 30 days, unless we are legally required to retain it longer.
              </p>
            )}
          </section>

          {/* Section 9: Contact */}
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacy.policy.contactTitle')}
            </h2>
            {locale === 'zh' ? (
              <p>
                如果您对本隐私政策有任何疑问，请联系我们：
                <br />
                邮箱：privacy@flowmeet.org
              </p>
            ) : (
              <p>
                If you have any questions about this privacy policy, please contact us:
                <br />
                Email: privacy@flowmeet.org
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
