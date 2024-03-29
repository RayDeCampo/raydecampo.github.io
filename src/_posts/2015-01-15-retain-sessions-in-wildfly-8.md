---
layout: post
title: Retain sessions in WildFly 8
date: '2015-01-15T19:00:00.000-05:00'
permalink: 2015/01/15/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- WildFly
- configuration
- standalone-full.xml
- documentation
modified_time: '2015-02-13T10:55:07.870-05:00'
blogger_id: tag:blogger.com,1999:blog-6427287440000636763.post-2468387101605825606
blogger_orig_url: http://labnotes.decampo.org/2015/01/retain-sessions-in-wildfly-8.html
redirect_from: /2015/01/retain-sessions-in-wildfly-8.html
---

Add the `persistent-sessions` element to your WildFly configuration to keep sessions persistent across redeployments and restarts: </p>
<!-- excerpt -->

```xml
<servlet-container name="default">
    <jsp-config/>
    <persistent-sessions />
    <websockets/>
</servlet-container>
```

See <https://docs.jboss.org/author/display/WFLY8/Undertow+%28web%29+subsystem+configuration> for more information.
