---
layout: post
title: Moving to Eleventy From Jekyll
date: '2021-04-19T16:00:00.000-04:00'
author: Raymond DeCampo
permalink: 2021/09/28/{{ page.fileSlug }}.html
tags:
- eleventy
- 11ty
- JavaScript
- nodejs
---

After upgrading to Fedora 34, my Jekyll environment was broken again.  So it was time to find another solution that didn't require so much attention.  Enter [Eleventy](https://www.11ty.dev/), a static site generator that runs in the Node.js environment.

I started by following <https://stedman.dev/2020/04/29/make-the-jump-from-jekyll-to-javascript/>, but in the end I decided to forgo GitHub Actions and just generate the site myself and check it in under the `docs/` directory.  You can look at the history of the [raydecampo.github.io](https://github.com/RayDeCampo/raydecampo.github.io) repository, in particular the `eleventy` branch, for all the gritty details.  

The steps went something like this (links to the appropriate commits follow the description):

1. Following the Install and Configure section of the [stedman.dev document](https://stedman.dev/2020/04/29/make-the-jump-from-jekyll-to-javascript/), get Eleventy installed and running.  ([64a6dac](https://github.com/RayDeCampo/raydecampo.github.io/commit/64a6dac7587eb30c9cf889af9f426b428e64efd4))

1. At this point, influenced by <https://github.com/andeersg/andeers.com>, I restructured so that the source of the blog contents were kept under the `src/` directory.  ([51a2666](https://github.com/RayDeCampo/raydecampo.github.io/commit/51a266656fe0265c4c3f55b6d0ec956d3c880836), [66dbf6b](https://github.com/RayDeCampo/raydecampo.github.io/commit/66dbf6bd2fcec064770b73d9d176d2fe49b8c2e7))

1. Added permalink metadata to the blogs so that the files end up in the same place as they did when jekyll was creating the site (and blogger before that).  ([77e6af5](https://github.com/RayDeCampo/raydecampo.github.io/commit/77e6af5efc35a694b0e5fd6f2c1c00a61ae5edbd))

1. Next, the jekyll built-in `site.posts` variable is no longer available under Eleventy.  So I defined some collections and used them to fix the pages with lists of posts. ([7a7e5b5](https://github.com/RayDeCampo/raydecampo.github.io/commit/7a7e5b59170e43dcd7f87510da26653ef0c6115c))

1. Next up was fixing CSS.  Eleventy has no built in support for SASS (kind of strange), so I added a node script entry to run SASS.  I also downloaded a copy of the CSS for the jekyll theme I had been using.  ([db0d7ac](https://github.com/RayDeCampo/raydecampo.github.io/commit/db0d7ac73df098eadf14053db1e884be5dc19447), [1b1433f](https://github.com/RayDeCampo/raydecampo.github.io/commit/1b1433f2a73d838a1f15407e8d50658020fd3aac))

1. Next up was installing the [Eleventy RSS plugin](https://www.11ty.dev/docs/plugins/rss/) to restore RSS functionality.  ([4ef3cd9](https://github.com/RayDeCampo/raydecampo.github.io/commit/4ef3cd952615182d005143729a4fb2e3abf2e0ca), [a6a09f8](https://github.com/RayDeCampo/raydecampo.github.io/commit/a6a09f8b1e585b9f7ac58721afd2f88bc40eb11d))

1. Next we get tags working the way they did before.  Stole a [code snippet](https://github.com/philhawksworth/hawksworx.com/blob/master/src/site/_filters/getTagList.js) from philhawksworth (H/T).  ([3121301](https://github.com/RayDeCampo/raydecampo.github.io/commit/3121301d881bc9077d95bb586ad65d0d81ad27ad))

1. Add some metadata and fix up the parameterized data in the `default.html` template.  ([4233afc](https://github.com/RayDeCampo/raydecampo.github.io/commit/4233afc428cf736ccf8fc47a43cdfbcf73ea3ba7))

1. Install and configure the [Eleventy syntax highlighting plugin](https://www.11ty.dev/docs/plugins/syntaxhighlight/).  Don't forget to download a Prism CSS file.  ([14c89fe](https://github.com/RayDeCampo/raydecampo.github.io/commit/14c89fec5909a865c283ad6c09cb0f6b3d43beb6))

1. Finally it was time to get things working on GitHub Pages.  GitHub Pages will let you use either the root directory or the `docs/` directory of the repository as web root.  So I changed the output directory for Eleventy to the `docs/` directory.  I also needed a passthrough for the CNAME file.  Then I just needed to change the configuration in GitHub (Settings -> Pages) and I was all set.  ([1aa4e97](https://github.com/RayDeCampo/raydecampo.github.io/commit/1aa4e97b25b5e3540486778310ce56b433020111), [5410778](https://github.com/RayDeCampo/raydecampo.github.io/commit/5410778b24964de100f1920e989672b1248d7764), [6f2d68b](https://github.com/RayDeCampo/raydecampo.github.io/commit/6f2d68b6d3611b0a0e811854eb4a0a95c1720ac9))
