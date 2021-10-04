---
layout: post
title: JSF 2.2 Welcome File
date: '2014-10-05T10:00:00.000-04:00'
permalink: 2014/10/05/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- JSF
- web.xml
- gotcha
modified_time: '2015-02-13T10:56:13.726-05:00'
blogger_id: tag:blogger.com,1999:blog-6427287440000636763.post-7145170903233966883
blogger_orig_url: http://labnotes.decampo.org/2014/10/jsf-22-welcome-file.html
redirect_from: /2014/10/jsf-22-welcome-file.html
---

Just a quick post in case you are trying to use a JSF page as a welcome file. <!-- excerpt -->  This is what you'll need in your web.xml:

```xml
    <servlet>
        <servlet-name>Faces Servlet</servlet-name>
        <servlet-class>
            javax.faces.webapp.FacesServlet
        </servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>Faces Servlet</servlet-name>
        <url-pattern>*.xhtml</url-pattern>
    </servlet-mapping>
    <welcome-file-list>
        <welcome-file>index.xhtml</welcome-file>
    </welcome-file-list>
```
