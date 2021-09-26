---
layout: post
title: Frame Size Issue with Java HTTP Client
date: '2021-04-19T16:00:00.000-04:00'
author: Raymond DeCampo
permalink: 2021/04/19/{{ page.fileSlug }}.html
tags:
- java
- http
- gotcha
---

If you hit this error when using the HTTP client built into Java:

```text
Caused by: java.io.IOException: protocol error: Frame type(80) length(4740180) exceeds MAX_FRAME_SIZE(16384)
        at jdk.internal.net.http.Http2Connection.protocolError(Http2Connection.java:952) ~[java.net.http:?]
        at jdk.internal.net.http.Http2Connection.processFrame(Http2Connection.java:714) ~[java.net.http:?]
        at jdk.internal.net.http.frame.FramesDecoder.decode(FramesDecoder.java:155) ~[java.net.http:?]
```

Try using a client configured for HTTP 1.1:

```java
        client = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .version(HttpClient.Version.HTTP_1_1)
            .build();
```
