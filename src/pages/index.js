import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

export default function Home() {
  const features = [
    {
      icon: '🎥',
      title: 'VideoCrypt',
      desc: 'Multi-DRM, OTT & encrypted two-way streaming on AWS.',
    },
    {
      icon: '📚',
      title: 'eLearning Suite',
      desc: 'Interactive live classes, gamification & AI tutors.',
    },
    {
      icon: '☁️',
      title: 'AWS DevOps',
      desc: 'CI/CD pipelines, WAF, cost optimization & S3.',
    },
    {
      icon: '🔐',
      title: 'Security & Compliance',
      desc: 'IAM, WAF, encryption & cloud auditing.',
    },
  ];

  return (
    <Layout title="AppSquadz Docs" description="Secure. Scalable. Streamed.">
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <h1 className={styles.title}>
              Secure. Scalable.<br />
              Streamed with <span className={styles.gradientText}>AppSquadz</span>
            </h1>
            <p className={styles.subtitle}>
              Empowering your digital solutions with AWS-powered platforms.
            </p>
            <div className={styles.cta}>
              <Link className="button button--primary" to="/docs/intro">🚀 Get Started</Link>
              <Link className="button button--secondary" to="https://appsquadz.com">🌐 Visit Website</Link>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.orbitContainer}>
              <div className={styles.orbitBig} />
              <div className={styles.orbitSmall} />
              <div className={styles.planet} />
            </div>
            <img src="/img/cloud-network.png" alt="Cloud Network" className={styles.heroImage} />
          </div>
        </section>

        <section className={styles.features}>
          {features.map(({ icon, title, desc }, idx) => (
            <div key={idx} className={styles.card} style={{ animationDelay: `${idx * 0.25}s` }}>
              <div className={styles.cardIcon}>{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </section>

        <section className={styles.devopsAnimatedSection}>
          <h2 className={styles.devopsTitle}>DevOps Automation with AppSquadz</h2>
          <p className={styles.devopsSubtitle}>
            AppSquadz - Advanced AWS Partner.
          </p>
          <div className={styles.iconMarquee}>
            <div className={styles.marqueeContent}>
              <span>🗂️ Amazon S3</span>
              <span>🌐 Amazon Translate</span>
              <span>🎙️ Amazon Transcribe</span>
              <span>🛡️ AWS WAF</span>
              <span>📈 Amazon CloudWatch</span>
              <span>💻 Amazon EC2</span>
              <span>📡 AWS MediaLive</span>
              <span>🎞️ MediaConvert</span>
              <span>🎭 MediaTailor</span>
              <span>📦 MediaPackage</span>
              <span>📺 Amazon IVS</span>
              <span>🚀 CloudFront</span>
            </div>
            <div className={styles.marqueeContent}>
              <span>        </span>
              <span>🗂️ Amazon S3</span>
              <span>🌐 Amazon Translate</span>
              <span>🎙️ Amazon Transcribe</span>
              <span>🛡️ AWS WAF</span>
              <span>📈 Amazon CloudWatch</span>
              <span>💻 Amazon EC2</span>
              <span>📡 AWS MediaLive</span>
              <span>🎞️ MediaConvert</span>
              <span>🎭 MediaTailor</span>
              <span>📦 MediaPackage</span>
              <span>📺 Amazon IVS</span>
              <span>🚀 CloudFront</span>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <img src="/img/logo.svg" alt="AppSquadz" className={styles.logo} />
          <p>© {new Date().getFullYear()} AppSquadz Technologies. All rights reserved.</p>
        </footer>
      </main>
    </Layout>
  );
}
