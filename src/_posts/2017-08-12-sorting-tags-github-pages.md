---
layout: post
title: Case-insensitive Tag Sorting on GitHub Pages
date: '2017-08-12T09:00:00.000-04:00'
author: Raymond DeCampo
tags:
- github pages
- jekyll
---

GitHub Pages famously does not support the [`sort_natural`](https://shopify.github.io/liquid/filters/sort_natural/) filter from the [Liquid](https://shopify.github.io/liquid/) templating language used by [Jekyll](https://jekyllrb.com/docs/templates/).  So some chicanery is needed to get a list of tags sorted without regard to case.

I haven't seen a complete solution on the internet which satisfied me.  Originally I settled on the partial solution by codeinfox: <https://codinfox.github.io/dev/2015/03/06/use-tags-and-categories-in-your-jekyll-based-github-pages/>.  But I realized we could do better with a little effort.

The resulting code is being used by this blog and is therefore available on GitHub: [tags.html](https://github.com/RayDeCampo/raydecampo.github.io/blob/74a4558e8784350dde019145936d55d906d51599/_includes/tags.html).  At a high level, we do the following.  First, create a list of all the tags from all the posts (`rawtags`).  Second, remove duplicates and blanks (`alltags`).  Next, convert to lowercase and sort (`lowertags`).  Then build a new list of tags by iterating over `lowertags` and picking the un-lowercased version of the tag from `alltags`.

It's not super-efficient (O(n^2) but since it's a static site generator I can live with it.