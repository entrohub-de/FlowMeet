import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>发现你的下一场 FlowMeet</h1>
        <p className={styles.description}>
          一站式创建活动、报名参会与实时互动，让流程更清晰、体验更顺畅。
        </p>
        <div className={styles.buttonGroup}>
          <Link href="/auth/signup" className={styles.signupBtn}>
            创建账号
          </Link>
          <Link href="/login" className={styles.loginBtn}>
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}
