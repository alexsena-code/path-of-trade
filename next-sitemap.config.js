const { getSitemapPosts, getSitemapProducts } = require('./lib/sitemap-data-fetchers.js');

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pathoftrade.net',
  generateRobotsTxt: true,
  exclude: ['/admin/*', '/api/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/admin', '/api', '/auth', '/_next'] }
    ],
  },
  additionalPaths: async (config) => {
    const paths = [];
    const defaultLastMod = new Date().toISOString();
    const locales = ['en', 'pt-br'];

    const [posts, products] = await Promise.all([
      getSitemapPosts(),
      getSitemapProducts(),
    ]);

    locales.forEach(locale => {
      // Helper for consistent slugification (matches utils/url-helper.ts)
      const slugify = (str) => {
        return str.normalize('NFD')
          .toLowerCase()
          .replace(/[\s\+\&\%\#\@\!\(\)\[\]\{\}\:\;\'\"\,\.\?\<\>\/\\\|]/g, '-')
          .replace(/--+/g, '-')
          .replace(/^-|-$/g, '');
      };

      // Produtos (Clean URL)
      products.forEach((product) => {
        if (product && product.name) {
          const cleanPath = `/${locale}/products/${encodeURIComponent(slugify(product.name))}`;
          paths.push({
            loc: cleanPath,
            lastmod: product.lastmod || defaultLastMod,
            changefreq: 'daily',
            priority: 0.9,
          });
        }
      });

      // Posts
      posts.forEach((post) => {
        if (post && post.slug) {
          const postPath = `/${locale}/blog/${encodeURIComponent(post.slug)}`;
          paths.push({
            loc: postPath,
            lastmod: post.lastmod || defaultLastMod,
            changefreq: 'weekly',
            priority: 0.7,
          });
        }
      });
    });
    return paths;
  }
};