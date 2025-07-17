// docusaurus.config.js
import { themes as prismThemes } from 'prism-react-renderer';
import dotenv from 'dotenv';

dotenv.config(); // Load variables from .env

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'My Site',
  tagline: 'Dinosaurs are cool',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://Appsquadz-Software-Private-Limited.github.io',
  baseUrl: '/',

  organizationName: 'Appsquadz',
  projectName: 'docusaurus',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/Appsquadz-Software-Private-Limited/Docusaurus/edit/main/',
          includeCurrentVersion: true,
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Appsquadz',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: 'https://github.com/Appsquadz-Software-Private-Limited/Docusaurus',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'About Appsquadz',
            items: [
              {
                html: `<a href="/docs/intro">
               <i class="fas fa-info-circle fa-lg" style="margin-right: 8px;"></i>Introduction
             </a>`,
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                html: `<a href="https://www.linkedin.com/company/appsquadz" target="_blank" rel="noopener noreferrer">
               <i class="fab fa-linkedin fa-lg" style="margin-right: 8px;"></i>LinkedIn
             </a>`,
              },
              {
                html: `<a href="https://www.facebook.com/appsquadz/" target="_blank" rel="noopener noreferrer">
               <i class="fab fa-facebook fa-lg" style="margin-right: 8px;"></i>Facebook
             </a>`,
              },
              {
                html: `<a href="https://x.com/appsquadz" target="_blank" rel="noopener noreferrer">
               <i class="fab fa-x-twitter fa-lg" style="margin-right: 8px;"></i>X
             </a>`,
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                html: `<a href="/blog">
               <i class="fas fa-blog fa-lg" style="margin-right: 8px;"></i>Blog
             </a>`,
              },
              {
                html: `<a href="https://github.com/Appsquadz-Software-Private-Limited/Docusaurus" target="_blank" rel="noopener noreferrer">
               <i class="fab fa-github fa-lg" style="margin-right: 8px;"></i>GitHub
             </a>`,
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Appsquadz.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),

  customFields: {
    githubToken: process.env.VITE_GITHUB_TOKEN,
  },
};

export default config;
