---
layout: post
title: Mocking Static Methods in Mockito
date: '2020-07-31T09:00:00.000-04:00'
permalink: 2020/07/31/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- mockito
- java
---

Mockito has been able to mock static methods since version 3.4.0 but the documentation doesn't explain how to mock methods that take arguments.

E.g. to mock the JavaMail Transport class:

```java
    messageCaptor = ArgumentCaptor.forClass(Message.class);

    try (MockedStatic<Transport> transport = mockStatic(Transport.class))
    {
        // mailer.send invokes Transport
        mailer.send(from, to, subject, body);
        transport.verify(() -> Transport.send(messageCaptor.capture()));
        // Now we can see what mailer passed to Transport.send()
        final Message message = messageCaptor.getValue();
    }
```

or if we want to specify behavior:

```java
    try (MockedStatic<Transport> transport = mockStatic(Transport.class))
    {
        transport.when(() -> Transport.send(any(Message.class)))
            .thenThrow(new MessagingException());
        mailer.send(from, to, subject, body);
    }
```
