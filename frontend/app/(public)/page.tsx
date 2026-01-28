import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
          发现你的下一场 FlowMeet
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          一站式创建活动、报名参会与实时互动，让流程更清晰、体验更顺畅。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto"
          >
            创建账号
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors w-full sm:w-auto"
          >
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}
