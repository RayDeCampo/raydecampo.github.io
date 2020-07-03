---
layout: post
title: SLF4J issue with WildFly
date: '2020-07-03T14:00:00.000-04:00'
author: Raymond DeCampo
tags:
- slf4j
- wildfly
- jboss
- shibboleth
---

If you are getting the following error on WildFly or JBoss:

> Caused by: java.lang.ClassCastException: class org.slf4j.impl.Slf4jLoggerFactory cannot be cast to class ch.qos.logback.classic.LoggerContext (org.slf4j.impl.Slf4jLoggerFactory is in unnamed module of loader 'org.slf4j.impl@1.0.4.GA' @604f2c4f; ch.qos.logback.classic.LoggerContext is in unnamed module of loader 'deployment.idp.war' @4206bf50)"

Then add a `jboss-deployment-structure.xml` file to the `WEB-INF/` directory of your war archive (or the `META-INF/` in the case of an ear or ejb):

```xml
<jboss-deployment-structure>
    <deployment>
    <!-- Exclude server libraries which conflict with ours -->
        <exclusions>
            <module name="org.slf4j" />
            <module name="org.slf4j.impl" />
        </exclusions>
    </deployment>
</jboss-deployment-structure>
```

This will prevent WildFly from using the its versions of the SLF4J libraries for the deployed artifact allowing it to use whatever had been packaged instead.

Note that I encountered this issue when deploying Shibboleth IdP 4.0 on WildFly.
