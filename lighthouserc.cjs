// Lighthouse CI configuration for friday-go.icu
// 用法: npx lhci autorun
module.exports = {
  ci: {
    collect: {
      url: [
        'https://friday-go.icu/',
        'https://friday-go.icu/dev/backend/golang/',
        'https://friday-go.icu/ai/',
        'https://friday-go.icu/security/offensive/',
        'https://friday-go.icu/devops/',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'seo'],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.50 }],
        'categories:seo': ['error', { minScore: 0.85 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
  },
};
