---
layout: post
title: 'JSF: Add Conversation ID to a link or button'
date: '2015-01-17T09:00:00.000-05:00'
permalink: 2015/01/17/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- JSF
- gotcha
modified_time: '2015-02-13T10:54:29.810-05:00'
blogger_id: tag:blogger.com,1999:blog-6427287440000636763.post-1235461871660335290
blogger_orig_url: http://labnotes.decampo.org/2015/01/jsf-add-conversation-id-to-link-or.html
redirect_from: /2015/01/jsf-add-conversation-id-to-link-or.html
---

<!-- excerpt -->
To add the conversation ID parameter `cid` to a `h:link` or `h:button`:

```xml
<h:button value="Go" outcome="go">  
    <f:param name="cid" value="#{javax.enterprise.context.conversation.id}" />
</h:button>
```
