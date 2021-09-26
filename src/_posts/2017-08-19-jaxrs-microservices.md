---
layout: post
title: JAX-RS Microservices
date: '2017-08-19T07:00:00.000-04:00'
permalink: 2017/08/19/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- java
- REST
- JAX-RS
- JEE
- WildFly
- xirr
- docker
- Node.js
- grunt
- gotcha
- JavaScript
- ES6
- JSON
- CORS
---

An example project where we have taken a Java library ([java-xirr](https://github.com/RayDeCampo/java-xirr)) and expose it as a REST service using JAX-RS.  Then the service is dockerized using the maven dockerfile plugin.  On the client side, we create a separate client using the Node.js connect server in order to illustrate various issues with CORS when utilizing REST services.
<!-- excerpt -->

The project is available on GitHub as [rest-xirr](https://github.com/RayDeCampo/rest-xirr).

## The REST service

### Configuration

Turning a library into a REST service using JAX-RS in JEE 7 is pretty easy using the `@ApplicationPath`, `@Path`, `@GET` and `@POST` annotations,  This has been covered extensively elsewhere so I won't go into details here.

We want our REST service to use JSON to interact with the client, so we add `@Consumes` and `@Produces` annotations to our `XirrService.xirr()` method ([full source](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/server/src/main/java/org/decampo/rest/xirr/XirrService.java#L26)):

```java
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public XirrResult xirr(TxRecord[] records) {
        try {
            // Convert TxRecords into Transactions
            final List<Transaction> tx = Stream.of(records)
                .map(TxRecord::toTransaction)
                .collect(Collectors.toList());
            final double xirr = new Xirr(tx).xirr();
            // Wrap result in result object
            return new XirrResult(xirr);
        } catch (IllegalArgumentException iae) {
            // Convert IAEs thrown by Xirr into ServiceExceptions for the
            // exception mapper
            throw new ServiceException(iae);
        }
    }
```

The JAX-RS implementation will handle consuming the JSON and converting it to an array of `TxRecord` instances.  It will also convert the return value, `XirrResult`, into JSON for the client.

### JSON Details

Let's drill into the rest of the `xirr()` method.  First, you may notice that we are using a new class, `TxRecord` for the input instead of the `Transaction` class provided by the xirr library.  The reason for this is that the JSON deserializer provided by JAX-RS will not work with immutable classes.  So `TxRecord` is a mutable wrapper around `Transaction`.

For the return value, we could have just returned a `double`, and that would have been fine, but instead we created a wrapper object to see the JSON serialization in action.

### Error Handling

Finally you might notice we are catching the `IllegalArgumentException`s thrown by the xirr library and converting them into a custom exception, `ServiceException`.  This allows us to define an [ExceptionMapper](https://docs.oracle.com/javaee/7/api/javax/ws/rs/ext/ExceptionMapper.html) to handle the errors ([full source](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/server/src/main/java/org/decampo/rest/ServiceExceptionMapper.java#L13)):

```java
@Provider
@Singleton
public class ServiceExceptionMapper implements ExceptionMapper<ServiceException> {

    @Override
    public Response toResponse(ServiceException exception) {
        // Send the exception details to the client
        // A production version would probably use a custom error object
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(exception)
            .build();
    }

}
```

The result is that when an IllegalArgumentException is thrown by the xirr library, it is converted in a `ServiceException` by the `XirrService` and then the above `ExceptionMapper` implementation kicks in.  So instead of the default HTML page served by WildFly when an exception is thrown, the client gets the JSON encoding of the exception.

Originally I had the `ExceptionMapper` implementation extending `ExceptionMapper<Exception>`, but that ended up being too broad.  When the client was sending the CORS preflight check (OPTIONS HTTP method), WildFly was throwing an exception in the process of generating the default OPTIONS reply required by the JAX-RS specfication.  Then there was an additional issue with the mapping and the end result was the preflight check always failed and the following stacktrace emitted:

```
13:50:06,423 ERROR [io.undertow.request] (default task-52) UT005023: Exception handling request to /xirr: org.jboss.resteasy.spi.UnhandledException: org.jboss.resteasy.core.NoMessageBodyWriterFoundFailure: Could not find MessageBodyWriter for response object of type: org.jboss.resteasy.spi.DefaultOptionsMethodException of media type: application/octet-stream
	at org.jboss.resteasy.core.SynchronousDispatcher.writeException(SynchronousDispatcher.java:187)
	at org.jboss.resteasy.core.SynchronousDispatcher.invoke(SynchronousDispatcher.java:206)
	at org.jboss.resteasy.plugins.server.servlet.ServletContainerDispatcher.service(ServletContainerDispatcher.java:221)
	at org.jboss.resteasy.plugins.server.servlet.HttpServletDispatcher.service(HttpServletDispatcher.java:56)
	at org.jboss.resteasy.plugins.server.servlet.HttpServletDispatcher.service(HttpServletDispatcher.java:51)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:790)
// trimmed here for brevity
Caused by: org.jboss.resteasy.core.NoMessageBodyWriterFoundFailure: Could not find MessageBodyWriter for response object of type: org.jboss.resteasy.spi.DefaultOptionsMethodException of media type: application/octet-stream
	at org.jboss.resteasy.core.ServerResponseWriter.writeNomapResponse(ServerResponseWriter.java:66)
	at org.jboss.resteasy.core.SynchronousDispatcher.writeException(SynchronousDispatcher.java:183)
	... 42 more
```

### Dockerization

Finally what microservice would be complete without a Docker image?  The `Dockerfile` is simple and uses WildFly as the application server, but there is no reason any other compliant server could not be used ([full source](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/server/Dockerfile)):

```Dockerfile
FROM jboss/wildfly:latest
ADD target/*.war /opt/jboss/wildfly/standalone/deployments/
```

The [dockerfile maven plugin](https://github.com/spotify/dockerfile-maven) from Spotify has been integrated in order to convert the `Dockerfile` into an image.  If you want to build and run a Docker container for the service:

```bash
$ mvn clean install dockerfile:build
$ docker run -p 8080:8080 --name xirr-rest decampo/xirr-rest:1.0.0-SNAPSHOT
```

Note that in order for the dockerfile plugin to work you must have Docker listening on port 2375 over TCP.  If this is an issue of course the Docker image may still be built with the `docker` command as long as you have built the `xirr.war` first using Maven.

#### Configuring Docker on Fedora

This should probably be a separate post, but very quickly, let me describe how to configure Docker on Fedora to listen on port 2375.  This should not be done lightly however as it is a local system privlege escalation risk.

First, create or edit the `/etc/docker/daemon.json` file to contain:

```json
{
    "hosts": ["unix:///var/run/docker.sock", "tcp://127.0.0.1:2375"]
}
```

Then in bash:

```bash
# Create a docker group
$ sudo groupadd docker
# Add yourself to the group
$ sudo gpasswd -a ${USER} docker
# Restart the docker service
$ sudo systemctl restart docker
# Refresh your groups (or log out and log back in for GUI applications)
$ newgrp docker
```

### Testing with curl

Once the container is up and running we can test it with `curl`:

```bash
# Test the ping service:
$ curl http://localhost:8080/xirr

# Test the xirr service:
$ curl -H "Content-type: application/json" -X POST \
       -d '[ { "amount":-1000, "when":"2017-01-01" }, 
             { "amount": 1100, "when":"2018-01-01" } ]' \
       http://localhost:8080/xirr/

# Test the xirr service and force an error condition:
$ curl -H "Content-type: application/json" -X POST \
       -d '[ { "amount": 1000, "when":"2017-01-01" }, 
             { "amount": 1100, "when":"2018-01-01" } ]' \
       http://localhost:8080/xirr/
```

## REST Client

We could have built the client inside the war for the service, but that's not a realistic scenario for actual deployment.  So instead we build a client that is served from a separate server and tries to contact the xirr REST service directly.  That puts us directly into the crosshairs of Cross-Origin Resource Sharing, aka [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS).

### CORS HTTP Headers

Normally a web browser will not allow JavaScript code to connect to a server that did not serve that code for security reasons.  CORS is a scheme contocted by the browser makers to allow a server to indicate that it can accept connections from other domains.  Keep in mind that CORS is enforced on the client and thus you can't really rely on it to supply security for the server.

To allow arbitrary clients to connect to our xirr REST service, we need for it to satisfy a couple of requirements.  First, it should respond properly to requests made via the HTTP OPTIONS method.  As noted above, the JAX-RS specification requires the implementation to generate a proper response for OPTIONS requests if the application does not specify a different one.  So we are fine in that respect.

Second, the service needs to set a number of HTTP headers to specify the required security settings to the client.  For this we define a JAX-RS response filter which will be applied to every response from our service ([full source](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/server/src/main/java/org/decampo/rest/CorsHeadersFilter.java#L16)):

```java
@Provider
public class CorsHeadersFilter implements ContainerResponseFilter {

    @Override
    public void filter(
        final ContainerRequestContext requestContext,
        final ContainerResponseContext responseContext) throws IOException {
        final MultivaluedMap<String, Object> headers =
            responseContext.getHeaders();
        // Following allows for all clients
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Headers", ALLOWED_HEADERS);
        headers.add("Access-Control-Allow-Credentials", "true");
        headers.add("Access-Control-Allow-Methods", ALLOWED_METHODS);
        // Set the length of time in seconds the preflight check may be cached
        // Use 1 second here for development purposes
        headers.add("Access-Control-Max-Age", "1");
    }
}
```

The `@Provider` annotation indicates to JAX-RS that this should be used whenever a `ContainerResponseFilter` is needed.

In this case `ALLOWED_HEADERS` is `"Authorization, Content-Type"`.  You may include any header you want, including custom headers.  If a header is included in the request that is not whitelisted, the request is disallowed (by the browser).  A list of automatically whitelisted headers is available at <https://fetch.spec.whatwg.org/#cors-safelisted-request-header>.

For `ALLOWED_METHODS`, I've used `"DELETE, GET, HEAD, OPTIONS, POST, PUT"`.

We can test out the CORS configuration using `curl`:

```bash
# Test preflight request
$ curl -i -X OPTIONS http://localhost:8080/xirr

# Test headers on normal request:
$ curl -D - http://localhost:8080/xirr
```

### Simple Node.js web server

For hosting the REST client, we use a simple Node.js web server, [connect](https://github.com/senchalabs/connect) and run it using [grunt](https://gruntjs.com) via the [grunt-contrib-connect](https://github.com/gruntjs/grunt-contrib-connect) plugin ([full source of Gruntfile.js](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/client/Gruntfile.js)):

```javascript
module.exports = function(grunt) {
    'use strict';
    
    grunt.loadNpmTasks('grunt-contrib-connect');
    
    grunt.initConfig({});

    // Simple HTTP server to host the xirr client
    // Runs on port 8000 by default
    grunt.config('connect', {
        options: {
            base: 'www',
            keepalive: true
        },
        'default': {}
    });
};
```

Then the client server (ugh, server for the client?) can be started with the command `grunt connect`.  By using the `keepalive` option the server will continue to run.

### JavaScript REST Client

For the JavaScript REST Client an ES6 class is created, `XirrClient`.  A class method is created corresponding to the two service methods on the `XirrService` Java class, `ping()` and `xirr()`.

The `ping()` method uses `fetch()` (see [Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) from MDN for more details) in it's simplest form ([full source](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/client/www/js/XirrClient.js#L37)):

```javascript
    ping() {
        return fetch('http://localhost:8080/xirr').then(function(response) {
            console.log(response);
            return response.text();
        });
    }
```

The `fetch()` method returns a `Promise` object with a `Response` payload.  The `ping()` method converts that into a `Promise` with a string payload for the caller.

The `xirr()` method uses `fetch()` in a more complicated way, since we need to deliver a JSON payload via POST for the xirr REST endpoint ([full source](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/client/www/js/XirrClient.js#L50)):

```javascript
    xirr() {
        return fetch('http://localhost:8080/xirr', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(this.txs)
        }).then(function(response) {
            console.log(response);
            return response.json();
        });
    }
```

Note that using this form of `fetch()` allows us to send custom headers, including, if desired, an `Authentication` header for Open ID.

Another interesting aspect of this is the `Promise` returned by `fetch()` does not reject based on the HTTP status code of the response.  In other words, when status code 500 is returned by our xirr REST service because of invalid input, we still end up in the normal success handler.

In this case we convert the `Promise` payload into the parsed JSON object returned by the server.  So the `xirr()` method will return an object with a `xirr` property on success and a `message` property (from the serialized exception) when the xirr throws an `IllegalArgumentException`.

You can see the client in action in the `index.js` file ([full source](https://github.com/RayDeCampo/rest-xirr/blob/63d284b800c16df35c67fff4c372d446f26a427e/client/www/index.js#L24)):

```javascript
    client.clear()
      .add(-1000, "2017-01-01")
      .add( 1100, "2018-01-01")
      .xirr().then(function(result) {
        console.log(result);
        document.getElementById('output').innerHTML = 
            result.xirr ? formatter.format(result.xirr) : result.message;
    }).catch(errorHandler);
```

## Summary

So, we have covered quite a bit here.  Probably should have been a couple of blog posts, but in the end everything is so cross-referenced I felt it works better as a whole.

We wrapped a Java library with REST using JAX-RS and then dockerized the result.  The REST service was configured to allow for CORS requests.  Then we created a client from browser-based JavaScript land which consumes the service.

## Resources

 * [JEE 7 API](https://docs.oracle.com/javaee/7/api/)
 * [Dockerfile Maven plugin](https://github.com/spotify/dockerfile-maven)
 * [Fetch API documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
 * [Fetch specification](https://fetch.spec.whatwg.org/)
 * [Grunt connect plugin](https://github.com/gruntjs/grunt-contrib-connect)
 * <https://github.com/RayDeCampo/rest-xirr>
 * <https://github.com/RayDeCampo/java-xirr>
 * [Build To Last From Frontend To Backend slideless talk by Adam Bien](https://www.youtube.com/watch?v=tgpruknOOfE)
