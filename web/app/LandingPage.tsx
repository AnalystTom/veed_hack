import Link from 'next/link';

import VideoLibrary, { type ReviewVideo } from './components/VideoLibrary';
import styles from './LandingPage.module.css';

// The production collection starts empty and is hydrated from genuine outputs
// saved by the generation flow. Prototype templates never enter this route.
const approvedVideos: ReviewVideo[] = [];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <strong>Roastr</strong>
        <div>
          <Link href="/create" className={styles.login}>Log in</Link>
          <Link href="/create" className={`${styles.pill} ${styles.navCta}`}>Roast my repo</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.neutralBackdrop} aria-hidden="true" />
        <div className={styles.scrim} aria-hidden="true" />
        <h1>Your repo has <em>notes</em><br />for you.</h1>
        <p className={styles.subhead}>
          Paste a GitHub URL. We read the code, issues and repository evidence,
          then turn the approved facts into a presenter-led roast.
        </p>
        <div className={styles.heroCta}>
          <Link href="/create" className={styles.pill}>Roast my repo <span>→</span></Link>
          <small>Free preview · you approve the script before anything renders</small>
        </div>
      </section>

      <section className={styles.librarySection} aria-labelledby="approved-roasts-heading">
        <header>
          <h2 id="approved-roasts-heading">Your approved <em>videos</em>.</h2>
          <span>Real generated media · click to review</span>
        </header>
        <VideoLibrary videos={approvedVideos} />
      </section>
    </main>
  );
}
