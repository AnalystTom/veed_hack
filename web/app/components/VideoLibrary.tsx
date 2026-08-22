'use client';

import { useState } from 'react';

import styles from './VideoLibrary.module.css';

export type ReviewVideo = {
  id: string;
  title: string;
  videoUrl: string;
  subjectName: string;
  treatment: string;
  sourceUrl: string;
};

export default function VideoLibrary({ videos }: { videos: ReviewVideo[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!videos.length) {
    return (
      <div className={styles.empty}>
        <span>NO APPROVED MEDIA</span>
        <h3>Your first finished roast will appear here.</h3>
        <p>The B-style click-through reviewer stays unavailable until a real generated video exists.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {videos.map((video, index) => (
          <button key={video.id} className={styles.videoCard} onClick={() => setSelectedIndex(index)}>
            <video src={video.videoUrl} preload="metadata" aria-hidden="true" />
            <span><strong>{video.title}</strong><small>{video.subjectName} · {video.treatment}</small></span>
          </button>
        ))}
      </div>
      {selectedIndex !== null && (
        <VideoReviewer videos={videos} index={selectedIndex} onIndexChange={setSelectedIndex} onClose={() => setSelectedIndex(null)} />
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
