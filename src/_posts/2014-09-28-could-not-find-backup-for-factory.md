---
layout: post
title: Could not find backup for factory javax.faces.context.FacesContextFactory
date: '2014-09-28T10:00:00.000-04:00'
permalink: 2014/09/28/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- JBoss
- JEE
- gotcha
- facelets
- NetBeans
- maven
modified_time: '2014-09-28T10:00:00.499-04:00'
blogger_id: tag:blogger.com,1999:blog-6427287440000636763.post-3826234213090677977
blogger_orig_url: http://labnotes.decampo.org/2014/09/could-not-find-backup-for-factory.html
redirect_from: /2014/09/could-not-find-backup-for-factory.html
---

Recently I was porting a JEE application&#8217;s development environment from an outdated version of IDEA to Maven and NetBeans.  After some effort I got the two builds to yeild pretty much the same EAR files.
<!-- excerpt -->

The next step was to connect JBoss (version 7.1.1.Final in this case) to the project and begin development.  However when I deployed the EAR to JBoss using NetBeans. I got the following error:

```none
13:32:42,744 ERROR [org.apache.catalina.core.ContainerBase.[jboss.web].[default-host].[/sc]] (MSC service thread 1-14) 
  StandardWrapper.Throwable: java.lang.IllegalStateException: Could not find backup for factory javax.faces.context.FacesContextFactory.
        at javax.faces.FactoryFinder$FactoryManager.getFactory(FactoryFinder.java:1008) [jboss-jsf-api_2.1_spec-2.0.1.Final.jar:2.0.1.Final]
        at javax.faces.FactoryFinder.getFactory(FactoryFinder.java:343) [jboss-jsf-api_2.1_spec-2.0.1.Final.jar:2.0.1.Final]
        at javax.faces.webapp.FacesServlet.init(FacesServlet.java:302) [jboss-jsf-api_2.1_spec-2.0.1.Final.jar:2.0.1.Final]
        at org.apache.catalina.core.StandardWrapper.loadServlet(StandardWrapper.java:1202) [jbossweb-7.0.13.Final.jar:]
        at org.apache.catalina.core.StandardWrapper.load(StandardWrapper.java:1102) [jbossweb-7.0.13.Final.jar:]
        at org.apache.catalina.core.StandardContext.loadOnStartup(StandardContext.java:3655) [jbossweb-7.0.13.Final.jar:]
        at org.apache.catalina.core.StandardContext.start(StandardContext.java:3873) [jbossweb-7.0.13.Final.jar:]
        at org.jboss.as.web.deployment.WebDeploymentService.start(WebDeploymentService.java:90) [jboss-as-web-7.1.1.Final.jar:7.1.1.Final]
        at org.jboss.msc.service.ServiceControllerImpl$StartTask.startService(ServiceControllerImpl.java:1811)
        at org.jboss.msc.service.ServiceControllerImpl$StartTask.run(ServiceControllerImpl.java:1746)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1145) [rt.jar:1.7.0_51]
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:615) [rt.jar:1.7.0_51]
        at java.lang.Thread.run(Thread.java:744) [rt.jar:1.7.0_51]
```

Needless to say, that was unexpected.  Now the common answer from Google on this error is that there are multiple copies of JSF confusing the issue.  That did not jibe with my situation as I do not pack JSF with this application.

The first thing I tried was to make sure the entire tool chain was using JDK 7.  NetBeans had been compiling with JDK 8 so it seemed possible this was causing a class loading conflict.  But this failed to alleviate the issue.

The next thing I tried was taking the exploded EAR file from the Maven target directory and deploying it by hand.  No problems when deploying that way.

Some more investigation revealed that NetBeans was deploying the EAR archive, not the exploded directory.  When I deployed the archive manually, I reproduced the error.  At least I had eliminated NetBeans as a potential source of blame.

When investigating the differences between the exploded EAR directory and the EAR archive I discovered that what you see is not what you get with Maven.  I think the issue is that the various Maven plugins for WAR and EAR building are not applied when creating the exploded directories.

So to eliminate these differences I took the Maven EAR archive and extracted it in the JBoss deployments directory and deployed it by hand.  To my surprise there was no error.

So there seemed to be a difference between deploying the application as an EAR archive vs an EAR directory.  I had one final arrow left in my quiver: I would try deploying the EAR archive as produced by the previous build process.

That EAR archive worked like a champ.  Now I needed to figure out the difference between the two archives.  The contents were essentially the same but one difference stood out:  the WAR and EJB jar files in the working archive were archives themselves, whereas they were exploded in the broken EAR archive.

That was easy enough to fix: just remove the &lt;unpack&gt; directives from the POM for the EAR.  Now a I had deployments working from within NetBeans.

TL;DR: Don&#8217;t use exploded WARs inside of an unexploded EAR archive.
