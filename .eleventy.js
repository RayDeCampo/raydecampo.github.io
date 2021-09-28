const child_process = require('child_process');
const pluginRss = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = (eleventyConfig) => {
  // Copy the "assets" directory to the compiled output folder.
  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy({'assets/favicon': '/'});
  eleventyConfig.addPassthroughCopy('CNAME');

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight, {
    init: function({Prism}) {
      Prism.languages.none = {};
    }
  });

  eleventyConfig.addCollection('posts', function(collections) {
    return collections.getFilteredByGlob('src/_posts/*').reverse();
  });

  eleventyConfig.addCollection('featuredPosts', function(collections) {
    return [collections.getFilteredByGlob('src/_posts/*').reverse()[0]];
  });

  eleventyConfig.addCollection('otherPosts', function(collections) {
    return collections.getFilteredByGlob('src/_posts/*').reverse().slice(1);
  });

  eleventyConfig.addCollection('rssPosts', function(collections) {
    return collections.getFilteredByGlob('src/_posts/*').reverse().slice(0, 10);
  });

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: '<!-- excerpt -->'
  });

  // TAGS
  eleventyConfig.addCollection('tags', function(collections) {
    const tagSet = new Set();
    collections.getFilteredByGlob('src/_posts/*').forEach(function(item) {
      if( "tags" in item.data ) {
        let tags = item.data.tags;
        if( typeof tags === "string" ) {
          tags = [tags];
        }
  
        for (const tag of tags) {
          tagSet.add(tag);
        }
      }
    });
    return [...tagSet].sort();
  });

  return {
    dir: {
      input: 'src',
      output: 'docs',
      layouts: '_layouts',
    },
    templateFormats: ['html', 'liquid', 'md', 'njk']
  };
};
