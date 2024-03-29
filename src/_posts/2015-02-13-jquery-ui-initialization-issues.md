---
layout: post
title: jQuery UI Initialization Issues
date: '2015-02-13T20:00:00.000-05:00'
permalink: 2015/02/13/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- RequireJS
- gotcha
- jQuery
modified_time: '2015-02-13T20:00:00.553-05:00'
blogger_id: tag:blogger.com,1999:blog-6427287440000636763.post-127220390588975933
blogger_orig_url: http://labnotes.decampo.org/2015/02/jquery-ui-initialization-issues.html
redirect_from: /2015/02/jquery-ui-initialization-issues.html
---

Every once in a while when using jQuery UI I notice that my widget is not being initialized smoothly.  For example, when using the menu widget I might see the list items behind the menu briefly.  Then the page jumps around and it is a generally unpleasant experience for the user.  Who likes it when your jQuery widgets are jumpy and cause the page to feel like one of those old 'punch the monkey' banner ads?
<!-- excerpt -->

This usually means I have done something like this:

```javascript
require(['jquery', 'jquery-ui/menu'], function($, menu) {
    $("#navmenu").menu(); 
});
```

Instead of wrapping the initialization in a function as I should:

```javascript
require(['jquery', 'jquery-ui/menu'], function($, menu) {
    $(function() {
        $("#navmenu").menu();
    });
}); 
```
