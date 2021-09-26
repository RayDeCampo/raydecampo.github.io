---
layout: post
title: HTTPS for WildFly 20
date: '2020-08-09T12:00:00.000-04:00'
author: Raymond DeCampo
tags:
- WildFly
- JBoss
- https
- keytool
---

The following documents installing an actual certificate in on WildFly 20, although these steps have been tested on WildFly 19 as well.

In order to configure WildFly to use HTTPS with an actual certificate, we start by generating a certificate request:

```shell
[wildfly@wxyz wildfly]$ mkdir httpscert
[wildfly@wxyz wildfly]$ cd httpscert
[wildfly@wxyz httpscert]$ server=full.name.of.the.server
[wildfly@wxyz httpscert]$ keytool -alias tomcat -keyalg RSA -keystore https.keystore -genkey
[wildfly@wxyz httpscert]$ keytool -alias tomcat -keyalg RSA -keystore https.keystore -certreq -file ${server}.csr
```

Note that the `keytool` utility comes with the Java distribution.

Now submit the request to the certificate authority and get the signed certificate back. You may get some intermediate certificates along with the signed certificate, these will need to be imported into your keystore.

If for some reason the root certificate is not recognized, it will need to be imported as well.  In my case I was using my company certificate authority so I imported the root certificate.

```shell
# Import the root certificate, if necessary:
[wildfly@wxyz httpscert]$ keytool -alias root -keystore https.keystore -import -file ca.cert.pem
# Import any intermediates (use a different alias for each):
[wildfly@wxyz httpscert]$ keytool -alias intermediate -keystore https.keystore -import -file ca-chain.cert.pem
# NOTE: In my case ca-chain.cert.pem has multiple certificates, keytool takes the first one
# Import the actual certificate
[wildfly@wxyz httpscert]$ keytool -alias tomcat -keystore https.keystore -import -file ${server}.cert.pem
# Put the keystore in the right place
[wildfly@wxyz httpscert]$ mv https.keystore ../wildfly/standalone/configuration/
```

Next we configure WildFly as in <https://docs.wildfly.org/20/WildFly_Elytron_Security.html#configure-ssltls>.

Create a `configure-https.txt` file of commands for the WildFly command line tool:

```none
connect
batch
/subsystem=elytron/key-store=https-key-store:add(path=https.keystore,relative-to=jboss.server.config.dir,credential-reference={clear-text=yourpassword},type=JKS)
/subsystem=elytron/key-manager=https-key-manager:add(key-store=https-key-store,credential-reference={clear-text=itsdifferentnow})
/subsystem=elytron/server-ssl-context=https-ssl-context:add(key-manager=https-key-manager,protocols=["TLSv1.2"])
/subsystem=undertow/server=default-server/https-listener=https:undefine-attribute(name=security-realm)
/subsystem=undertow/server=default-server/https-listener=https:write-attribute(name=ssl-context,value=https-ssl-context)
run-batch
reload
exit
```

Note you'll need to substitute in your actual keystore password in the above.

Then we run the commands:

```shell
[wildfly@wxyz httpscert]$ cd ..
[wildfly@wxyz wildfly]$ wildfly/bin/jboss-cli.sh <configure-https.txt
```

WildFly should be using your new certificate to handle HTTPS requests now.  Note that WildFly by default listens on 8443 for HTTPS.

If desired, you can forward the default HTTPS port 443 to port 8443 on CentOS or RedHat systems with the following command:

```none
[root@wxyz ~]# firewall-cmd --permanent --add-forward-port=port=443:proto=tcp:toport=8443
```
