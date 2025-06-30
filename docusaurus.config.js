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

  url: 'https://kuldeepyadav7664.github.io',
  baseUrl: '/',

  organizationName: 'kuldeepyadav7664',
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
          editUrl: 'https://github.com/kuldeepyadav7664/docusaurus/edit/main/',
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
            href: 'https://github.com/kuldeepyadav7664/docusaurus',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
          {
            to: '/login',
            label: 'Login',
            position: 'right',
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
                html: `<a href="https://github.com/kuldeepyadav7664/docusaurus" target="_blank" rel="noopener noreferrer">
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
 authorUsers: [
      { email: 'author1@example.com', password: 'pass123' },
      { email: 'author2@example.com', password: 'pass456' },
    ],
    managerUsers: [
      { email: 'manager1@example.com', password: 'admin123' },
      { email: 'manager2@example.com', password: 'admin456' },
      { email: 'kuldeep@example.com', password: 'kuldeep' },
    ],
  },
};

export default config;
