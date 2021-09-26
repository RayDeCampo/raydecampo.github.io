---
layout: post
title: Configuring Wildfly for JWT Authentication
date: '2019-03-17T08:00:00.000-04:00'
permalink: 2019/03/17/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- WildFly
- JWT
- JEE
- CDI
---

In this post we describe how to configure WildFly to access JSON Web Tokens (JWT) via the Authentication header using the Bearer schema.  This allows you to install stateless authenticated REST services on WildFly.
<!-- excerpt -->

**NOTE:** Another way to accomplish this is to use the KeyCloak server and install its components in your WildFly server.  For large deployments that is the better approach.  This approach is more suitable to a small deployment where KeyCloak would be overkill.

We adapt the instructions and code from <https://github.com/wildfly/quickstart/tree/master/jaxrs-jwt>.  This adaptation does not use a keystore but simply a pre-generated public/private key pair.  This reduces the complexity and positions our server better for cloud deployment (as their are no external files to access).

## Generate the keys

First we generate a public/private key pair.  Note that you will be able to generate different key pairs for different environments (e.g. development, test, production).

```bash
# Use an empty passphrase when prompted
$ ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
$ openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
# To see the private key:
$ more jwtRS256.key
# To see the public key:
$ more jwtRS256.key.pub
```

## Configure Wildfly

Here we configure Wildfly to enforce the presence of a bearer token for secure application resources.  Start the WildFly admin command line interface:

```bash
cd $WILDFLY_HOME/bin
./jboss-cli.sh --connect
```

The remaining commands in this section are input for the WildFly admin CLI.

Add a new token security realm to elytron for authentication using JWTs, using the public key that was generated.  Replace the fake key below with the key from your `jwtRS256.key.pub` file:

```none
    /subsystem=elytron/token-realm=jwt-realm:add( \
        jwt={ \
            issuer=["my-application-issuer"], \
            audience=["my-application-audience"], \
            public-key="-----BEGIN PUBLIC KEY-----
    AXaRqQL18r/NiUV7vpQyLvqjC34pLYF3l3mrpfeIG1bXATsqVmJkNhAkkIyjLcTA
    qB5a+lpWb08GtpkcLX7G2+s7Js05CngGv4wGHmp9yiO9z5nMIcQXQXtT41Qn6716
    DGbDiTBQ+xycByEXuM6hU25rTnlWfGCRigm0zSjg6716Qr4zsYT7NyQWb+K7ntvd
    cuYjOfSbhY0imX6TYU8Edv4YOJe2pBeteHV1UHYcwMBGjt661yWWhx6fwJQMIA+v
    rKh58z7Pi5mqr0rFTX9zDK1h79vygXNTAlZcRubVjEpa8fCgvYMrbqq1CC12j07d
    dHbCWv3cjoVcnmW4g6k4M6xLx6kpKcBbCDiaEalJ2o872GNMXqJYuFw7YmmQaskw
    sUZTJjhu7BgofU3/t01VAWe0ye2s9H0LzUuWNUx1YcKgpi0efGUB/2rmejfFTUr/
    1pbTTXTqxiuB3Jnt+dhA/XJX11ALo27Ngzto0nkC/2s0csGq7uqJ4Dt2bGBvs1jB
    DWo76frVXuVNJqJACuZ1eL2JKt12vu7c2an++UooHZDDcRGkbivf4wBycxJmdKpE
    nN0SQ9j42ldOVz708CGgbXTJCcaZ6gH0Hbm1d6v+vpZESmaKjUtvFI/gnFGCqqWM
    MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxjYdscscXjbDb/kfnfXc
    7ZFoJOusLdXxfouD8WGy5oMCAwEAAQ==
    -----END PUBLIC KEY-----" \
        },principal-claim="sub")
```

Add a new security domain, which uses the jwt security realm:

```none
    /subsystem=elytron/security-domain=jwt-domain:add( \
        realms=[{ \
            realm=jwt-realm, \
            role-decoder=groups-to-roles \
        }],permission-mapper=default-permission-mapper, \
        default-realm=jwt-realm)
```

Create http authentication factory that uses BEARER_TOKEN authentication:

```none
    /subsystem=elytron/http-authentication-factory=jwt-http-authentication:add( \
        security-domain=jwt-domain, \
        http-server-mechanism-factory=global, \
        mechanism-configurations=[{ \
            mechanism-name="BEARER_TOKEN", \
            mechanism-realm-configurations=[{ \
                realm-name="jwt-realm" \
        }]}])
```

Configure Undertow to use our http authentication factory for authentication:

```none
    /subsystem=undertow/application-security-domain=other:add( \
        http-authentication-factory=jwt-http-authentication)
```

## Configure the Web Application

A few entries in the `web.xml` for your web application are required.

First, we put the private key (from your `jwtRS256.key` file) in an environment entry.  Your private key will be much longer than the fake one I have used here:

```xml
    <env-entry>
        <description>Private key for signing JWTs</description>
        <env-entry-name>jwtPrivateKey</env-entry-name>
        <env-entry-type>java.lang.String</env-entry-type>
        <!-- The development key, use an overlay in production -->
        <env-entry-value>
-----BEGIN RSA PRIVATE KEY-----
B73cQ1t2nx+0v6Fz7NcfhEbejyk02Kf+NJbKZPuZfnZlHSqH9xecxN2g1OYZtd0n
+Gg93QKCAQBd45hMMNohn6d+KkXRnNRkQLzVCQPMCHNAJL6773QPjeSskvvlXVOR
E2uxFupdP6qMV/oMHlm+XT6b/AeWma1o3oa6zvoEXx+dx+WTXjTHZEvTguZEcv7w
6l1T3bul5ujmK3DbHjfX77V3tDLYN0xQj6KZazRf9MQsZoC5xWKDLPGdfogS+1db
sr6Tq725Op4wRRwPDEYZthonddVyuMWrDElkC3HrK+31X+4wuP10gPdiayq2O3p8
NyCaimTtIELvLa32hJxsGQe8juTZ15quCmAu4tffmRdX3z1zFXoI6ObkM6hDhGWw
myHW4Qzjk6vijIYbeu7n5Tr77w8VSuh9AoIBAFhbLDJPmnC8Tp/BS5U2ntaxS8Qb
+icGXNguaHaw9niUCflHeWqaHYDNxGchnlFoEo5WxWuw0hC/peB2bjFLVFYif/mV
xUZfLBvKOUbeCor/m+jDoT19AQFpLu/at5Z82nLKyH3CqS4MO9VDs3PPZF6cbV89
fC2JD/k0MXuCRPa9t22v4BYBxG1AzcvTr/ly7pxNX8hoEHkNjx3e9ZrjyWa3pWFo
is4WSrogQVJHmCAceaTnUrSbfZ3SfAcElA/Qf94HQNrqIT5WetFy6INDdHD8WS61
wJMTAe2BezELmGR2NyBQp4IZrBEEtH03dBX9H61lm9raBId4Cc84C/mThes=
-----END RSA PRIVATE KEY-----
        </env-entry-value>
    </env-entry>
```

Next we standard `security-constraint` and `login-config` entries.  Replace the `url-pattern` and `role-name` with appropriate values for your application.  The `url-pattern` determines which REST URLs are protected.  The `role-name` enforces a role for the user (you must have at least one role).  There is a lot of flexibity available here that we will not cover.  Also replace the `realm-name` and `web-resource-name` with appropriate values, although these are not referenced elsewhere.

```xml
    <security-constraint>
        <web-resource-collection>
            <web-resource-name>Secure REST URLs</web-resource-name>
            <url-pattern>/admin/*</url-pattern>
        </web-resource-collection>
        <auth-constraint>
            <role-name>administrator</role-name>
        </auth-constraint>
    </security-constraint>

    <login-config>
        <auth-method>BEARER_TOKEN</auth-method>
        <realm-name>ACME Corp.</realm-name>
    </login-config>
```

## Authenticating Users

In this section we present some Java snippets to demonstrate how to create and sign a JWT once your user is authenticated.  The code here uses Context and Dependency Injection (CDI), it is assumed you are familiar with it.

First, a simple CDI bean to read the private key from the JNDI environment:

```java
@Dependent
public class JwtKey {
    @Resource(name = "jwtPrivateKey")
    private String privateKeyAsString;

    public String getPrivateKeyAsString() {
        return privateKeyAsString;
    }
}
```

Next we make a producer method for the `PrivateKey` instance:

```java
    static final String RSA_STRIP_REGEX =
        "BEGIN RSA PRIVATE KEY|END RSA PRIVATE KEY|-|\\s";

    @Produces
    private static PrivateKey producePrivateKey(final JwtKey jwtKey)
        throws KeyStoreException, IOException, GeneralSecurityException {
        final String keyString = jwtKey.getPrivateKeyAsString();
        final String base64Key = keyString.replaceAll(RSA_STRIP_REGEX, "");
        final byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        final PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(keyBytes);
        final KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePrivate(keySpec);
    }
```

Now the code to create the token using the [Nimbus + JOSE library](https://connect2id.com/products/nimbus-jose-jwt):

```java
    @Inject
    private PrivateKey privateKey;

    public String createJwt(
        final String subject,
        final Collection<String> roles) throws JOSEException {

        final String claims = Json.createObjectBuilder()
            .add("sub", subject)
            .add("iss", ISSUER)
            .add("aud", AUDIENCE)
            .add("groups", Json.createArrayBuilder(roles))
            .add("exp", System.currentTimeMillis()/1000 + EXPIRATION)
            .build().toString();
        final JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
            .type(JOSEObjectType.JWT).build();
        final JWSObject jws = new JWSObject(header, new Payload(claims));
        jws.sign(new RSASSASigner(privateKey));
        return jws.serialize();
    }
```

Finally we define a REST endpoint to send the token to the user:

```java
    @POST
    @Path("/token")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response token(
        @FormParam("username") final String username,
        @FormParam("password") final String password) {

        final User user = authenticate(username, password);
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        final List<String> roles = getRolesForUser(user);

        final String token = jwtCreator.createJwt(username, roles);
        final JsonObject response = Json.createObjectBuilder()
            .add("user", user.getName())
            .add("roles", Json.createArrayBuilder(roles))
            .add("token", token).build();
        return Response.ok(response).build();
    }
```

## Client-side

Just a few notes about the client-side.  You can authenticate the user by POSTing to the `token` endpoint and get back the token in the response.  Save the token in whatever mechanism is appropriate for your application.

Whenever accessing a protected URL, include the token using the standard `Authentication` header using the `Bearer` schema (see <https://jwt.io/introduction/> for more details).  If the token expires or is otherwise invalid, WildFly will return a `403 Forbidden` response.  At that point you can re-prompt the user for credentials and obtain a new token (or take whatever action is appropriate for your application).

## Configure Wildfly overlay

As a final note, you may be concerned that the private key has been built into the war archive.  There is no need to have multiple builds for multiple environments however.  By using the [WildFly overlay functionality](http://docs.wildfly.org/13/Admin_Guide.html#Deployment_Overlays), combined with the override ability via `jboss-web.xml` we can replace the development private key with keys for each environment.

First, create `/path/to/overlay/jboss-web.xml` file containing the actual private key (obviously use a path that makes sense for your environment):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE jboss-web>
<jboss-web>
    <env-entry>
        <description>Private key for signing JWTs</description>
        <env-entry-name>jwtPrivateKey</env-entry-name>
        <env-entry-type>java.lang.String</env-entry-type>
        <env-entry-value>
-----BEGIN RSA PRIVATE KEY-----
gXNTAlZcRubVjEpa8fCgvYMrbqq1CC12j07dDWo76frVXuVNJqJACuZ1eL2JKt12
vu7c2an++UooHZDDcRGkbivf4wBycxJmdKpEdHbCWv3cjoVcnmW4g6k4M6xLx6kp
KcBbCDiaEalJ2o872GNMXqJYuFw7YmmQaskwqB5a+lpWb08GtpkcLX7G2+s7Js05
CngGv4wGHmp9yiO9z5nMIcQXQXtT41Qn6716sUZTJjhu7BgofU3/t01VAWe0ye2s
9H0LzUuWNUx1YcKgpi0efGUB/2rmejfFTUr/1pbTTXTqxiuB3Jnt+dhA/XJX11AL
o27Ngzto0nkC/2s0csGq7uqJ4Dt2bGBvs1jBnN0SQ9j42ldOVz708CGgbXTJCcaZ
-----END RSA PRIVATE KEY-----
        </env-entry-value>
    </env-entry>
</jboss-web>
```

Then use the command line tool to associate the overlay to the deployment, replacing the `name`, the path to the overlay and the `deployments`:

```bash
$ cd $WILDFLY_HOME/bin
$ ./jboss-cli.sh --connect
deployment-overlay add \
    --name=myOverlay \
    --content=/WEB-INF/web.xml=/path/to/overlay/jboss-web.xml \
    --deployments=my-war-file.war \
    --redeploy-affected
```

## Resources

* <https://jwt.io/introduction/>
* <https://github.com/wildfly/quickstart/tree/master/jaxrs-jwt>
* <http://docs.wildfly.org/13/Admin_Guide.html#Deployment_Overlays>
* <https://connect2id.com/products/nimbus-jose-jwt>
