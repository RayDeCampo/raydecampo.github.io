module.exports = (eleventyConfig) => {
  // Copy the "assets" directory to the compiled "_site" folder.
  eleventyConfig.addPassthroughCopy('assets');

  eleventyConfig.addCollection('posts', function(collection) {
    return collection.getFilteredByGlob('src/_posts/*').reverse();
  });

  eleventyConfig.addCollection('featuredPosts', function(collections) {
    return [collections.getFilteredByGlob('src/_posts/*').reverse()[0]];
  });

  eleventyConfig.addCollection('otherPosts', function(collections) {
    return collections.getFilteredByGlob('src/_posts/*').reverse().slice(1);
  });

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: '<!-- excerpt -->'
   });

  return {
    dir: {
      input: 'src',
      output: '_site',
      layouts: '_layouts',
    },
    templateFormats: ['html', 'liquid', 'md', 'njk']
  };
};
