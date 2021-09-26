---
layout: post
title: Migrating to GitHub Pages
date: '2017-07-08T09:30:00.000-04:00'
permalink: 2017/07/08/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- github pages
- jekyll
- ruby
---

I finally took the plunge to migrate my old Blogger blog to the more convenient GitHub Pages.  Like everybody else I found when googling this topic discovered, it wasn't as easy as it seemed at first.

Using the jekyll-importer on the exported data from Blogger was straightforward and fast.

Trying to follow the various documentation on the GitHub site to get started wasn't very helpful to me.  What ended up being helpful was a tutorial at <https://www.smashingmagazine.com/2014/08/build-blog-jekyll-github-pages/> and the repository that went with it, <https://github.com/barryclark/jekyll-now> both from Barry Clark.  I didn't end up following the tutorial exactly, but I used the working repository as a reference.

So I did follow the advice from GitHub and use Bundler to manage jekyll and Ruby and the dependencies.  To create the structure I used the command:

```shell
bundle exec jekyll _3.3.0_ new raydecampo.github.io
```

Then the site can be previewed locally with:

```shell
bundle exec jekyll serve --watch
```

I wanted to use a different theme, Dinky, from GitHub but ran into issues when switching.  It seems not all the required layouts are present in the theme or something.  So I had to create a `_layouts/post.html` file as detailed at <https://github.com/github/pages-gem/issues/416#issuecomment-299772018>.

Then I wanted to support tags, so I stole some code from GitHub user [codinfox](https://github.com/codinfox) which was posted at <https://codinfox.github.io/dev/2015/03/06/use-tags-and-categories-in-your-jekyll-based-github-pages/>.

I also ended up customizing the theme quite a bit and playing around with excerpts.  Then I wanted to try writing a post in Markdown, and that is how this post was born.

Finally I added some redirects for the old blogger URLs.  Fortunately the jekyll importer left the old URL in the front matter of the post, so it was easy to create a `redirect_from` directive in the front matter using JEdit's regex search and replace.  The RSS feed was a different matter, apparently there's no support for an arbitrary redirect on GitHub Pages, so I needed to add the following to my `_config.xml` to generate the feed in the same location as Blogger did:

```
feed:
  path: /feeds/posts/default
```

Once this is up and running I will figure out how to use a custom domain.  UPDATE: Using a custom domain turned out to be pretty easy, just a change in the GitHub project Settings and update my DNS and all set.
