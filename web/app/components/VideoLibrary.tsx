'use client';

import { useEffect, useState } from 'react';

import styles from './VideoLibrary.module.css';

export type ReviewVideo = {
  id: string;
  title: string;
  videoUrl: string;
  subjectName: string;
  treatment: string;
  sourceUrl: string;
};

export const REVIEW_LIBRARY_KEY = 'roastr:approved-videos';

export default function VideoLibrary({ videos }: { videos: ReviewVideo[] }) {
  const [availableVideos, setAvailableVideos] = useState(videos);
  const [loaded, setLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(REVIEW_LIBRARY_KEY) || '[]');
      const realVideos = Array.isArray(stored)
        ? stored.filter((item): item is ReviewVideo =>
            item && typeof item.id === 'string' && typeof item.title === 'string' &&
            typeof item.videoUrl === 'string' && item.videoUrl.startsWith('https://') &&
            typeof item.sourceUrl === 'string' && item.sourceUrl.startsWith('https://'))
        : [];
      setAvailableVideos([...realVideos, ...videos.filter((video) => !realVideos.some((storedVideo) => storedVideo.id === video.id))]);
    } catch {
      setAvailableVideos(videos);
    } finally {
      setLoaded(true);
    }
  }, [videos]);

  if (!loaded) {
    return <div className={styles.empty}><span>LOADING REVIEW LIBRARY</span></div>;
  }

  if (!availableVideos.length) {
    return (
      <div className={styles.empty}>
        <span>NO PREVIOUS ROASTS YET</span>
        <h3>Your first finished roast will appear here.</h3>
        <p>Choose a product or GitHub repo above to make one.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {availableVideos.map((video, index) => (
          <button key={video.id} className={styles.videoCard} onClick={() => setSelectedIndex(index)}>
            <video src={video.videoUrl} preload="metadata" aria-hidden="true" />
            <span><strong>{video.title}</strong><small>{video.subjectName} · {video.treatment}</small></span>
          </button>
        ))}
      </div>
      {selectedIndex !== null && (
        <VideoReviewer videos={availableVideos} index={selectedIndex} onIndexChange={setSelectedIndex} onClose={() => setSelectedIndex(null)} />
      )}
    </>
  );
}

function VideoReviewer({ videos, index, onIndexChange, onClose }: {
  videos: ReviewVideo[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const video = videos[index];
  return (
    <div className={styles.reviewer} role="dialog" aria-modal="true" aria-label={`Reviewing ${video.title}`}>
      <div className={styles.reviewerTopbar}>
        <span>{String(index + 1).padStart(2, '0')} / {videos.length}</span>
        <button onClick={onClose}>Close</button>
      </div>
      <div className={styles.reviewerCanvas}><video key={video.id} src={video.videoUrl} controls autoPlay /></div>
      <aside className={styles.reviewerCopy}>
        <span>{video.treatment}</span><h2>{video.title}</h2><p>{video.subjectName}</p>
        <a href={video.sourceUrl} target="_blank" rel="noreferrer">Open subject source ↗</a>
        <div className={styles.reviewSteps}>
          <button disabled={index === 0} onClick={() => onIndexChange(index - 1)}>← Previous</button>
          <button disabled={index === videos.length - 1} onClick={() => onIndexChange(index + 1)}>Next →</button>
        </div>
      </aside>
    </div>
  );
}
