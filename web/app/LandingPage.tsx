import Link from 'next/link';

import VideoLibrary, { type ReviewVideo } from './components/VideoLibrary';
import styles from './LandingPage.module.css';

// The MVP does not persist generated media yet. Keeping this collection empty
// makes the product state explicit instead of promoting prototype templates.
const approvedVideos: ReviewVideo[] = [];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <strong>Roastr</strong>
        <Link href="/create" className={styles.navCta}>Create a roast</Link>
      </nav>

      <section className={styles.hero}>
        <div className={styles.neutralBackdrop} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Research-led parody videos</p>
          <h1>Your repo has <em>notes</em><br />for you.</h1>
          <p className={styles.subhead}>
            Start with a public repository or product page. Review the evidence,
            approve the script, then decide what gets rendered.
          </p>
          <Link href="/create" className={styles.primaryCta}>Roast a subject <span>→</span></Link>
          <small>Nothing is generated before the approval checkpoint.</small>
        </div>
      </section>

      <section className={styles.librarySection} aria-labelledby="approved-roasts-heading">
        <header>
          <div>
            <p className={styles.kicker}>Review room</p>
            <h2 id="approved-roasts-heading">Approved <em>videos</em></h2>
          </div>
          <span>{approvedVideos.length} available</span>
        </header>
        <VideoLibrary videos={approvedVideos} />
      </section>
    </main>
  );
}
