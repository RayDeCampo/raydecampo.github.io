---
layout: post
title: WildFly 8.2.0 and Java 8 on CentOS 6.6
date: '2015-01-07T18:00:00.000-05:00'
permalink: 2015/01/07/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- Red Hat
- RHEL
- WildFly
- installation
- CentOS
modified_time: '2015-04-22T11:45:36.273-04:00'
blogger_id: tag:blogger.com,1999:blog-6427287440000636763.post-1065699225103910569
blogger_orig_url: http://labnotes.decampo.org/2015/01/wildfly-820-and-java-8-on-centos-66.html
redirect_from: /2015/01/wildfly-820-and-java-8-on-centos-66.html
---

This post documents how to install and configure WildFly 8.2.0 on CentOS 6.6.  <!--excerpt -->  We make some changes to move some of the configuration under `/etc` and also place log files under `/var/log` and temp files under `/tmp` just like a well-behaved POSIX application should.

We'll start by installing Java; download your desired version as an RPM from Oracle and install:

```shell
[root@wxyz ~]> rpm -ivh jdk-8u25-linux-x64.rpm
```

This installs the JDK in `/usr/java/jdk1.8.0_25`. There is no need to make this the default java used by the system, we'll just configure WildFly to use it.

Next we create a `wildfly` user on the server to build and run WildFly as:

```shell
[root@wxyz ~]> useradd --system \
    --comment "WildFly Application Server" \
    --create-home --home /opt/wildfly \
    --user-group wildfly
```

I assume you already have the WildFly tarball downloaded and ready to go:

```shell
[wildfly@wxyz ~]$ tar zxvf wildfly-8.2.0.Final.tar.gz
```

Now that we have WildFly on the system, we need to configure CentOS to treat it like a service.  WildFly comes with some scripts in the `bin/init.d` directory that will help with this.  I am using the standalone server, but it is not difficult to modify the instructions for the domain server.  First up is the `/etc/wildfly/wildfly.conf` file.

```shell
[root@wxyz ~]> cd /etc
[root@wxyz etc]> mkdir wildfly
[root@wxyz etc]> cd wildfly/
[root@wxyz wildfly]> cp /opt/wildfly/wildfly-8.2.0.Final/bin/init.d/wildfly.conf ./
[root@wxyz wildfly]> # We'll just create an empty properties file for now
[root@wxyz wildfly]> touch wildfly.properties
```

Next edit the file.  We need to define a few environment variables, I am only including the ones I've changed:

```shell
# General configuration for the init.d scripts,
# not necessarily for JBoss AS itself.
# default location: /etc/default/wildfly

## Location of JDK
JAVA_HOME=/usr/java/jdk1.8.0_25

## Location of WildFly
JBOSS_HOME=/opt/wildfly/wildfly-8.2.0.Final

## The username who should own the process.
JBOSS_USER=wildfly

## Configuration for standalone mode
JBOSS_CONFIG=standalone-full.xml

## Location to keep the console log
JBOSS_CONSOLE_LOG="/var/log/wildfly/console.log"

# Need to modify the init script to account for JBOSS_OPTS
# Allows us to pass system properties to WildFly
JBOSS_OPTS="--properties=/etc/wildfly/wildfly.properties"
```

Next up we will deposit the init script in `/etc/init.d` and set the server to start on boot:

```shell
[root@wxyz wildfly]> cd /etc/ini t.d/
[root@wxyz init.d]> cp /opt/wildfly/wildfly-8.2.0.Final/bin/init.d/wildfly-init-redhat.sh ./wildfly
[root@wxyz init.d]> chkconfig --add wildfly
[root@wxyz init.d]> chkconfig --level 345 wildfly on
[root@wxyz init.d]> chkconfig --list wildfly
wildfly        0:off   1:off   2:off   3:on    4:on    5:on    6:off
```

You will need to edit the `wildfly` script in two places; first, to change the default location of the `wildfly.conf` file from `/etc/default/wildfly.conf`, starting at line 19:

```shell
# Load JBoss AS init.d configuration.
if [ -z "$JBOSS_CONF" ]; then
    JBOSS_CONF="/etc/wildfly/wildfly.conf"
fi
```

As-is the scripts do not allow passing any additional options to the WildFly process, so we need to edit the `/etc/init.d/wildfly` script to add the `$JBOSS_OPTS` variable whenever WildFly is starting. Here is the edited snippet for the standalone configuration (I’ve added some line breaks for readability) starting from line 104:

```shell
if [ ! -z "$JBOSS_USER" ]; then
  if [ "$JBOSS_MODE" = "standalone" ]; then
    if [ -r /etc/rc.d/init.d/functions ]; then
      daemon --user $JBOSS_USER LAUNCH_JBOSS_IN_BACKGROUND=1 \
      JBOSS_PIDFILE=$JBOSS_PIDFILE $JBOSS_SCRIPT -c $JBOSS_CONFIG \
      $JBOSS_OPTS 2>&1 > $JBOSS_CONSOLE_LOG &
    else
      su - $JBOSS_USER -c "LAUNCH_JBOSS_IN_BACKGROUND=1 \
        JBOSS_PIDFILE=$JBOSS_PIDFILE $JBOSS_SCRIPT -c $JBOSS_CONFIG \
        $JBOSS_OPTS" 2>&1 > $JBOSS_CONSOLE_LOG &
    fi
  else
```

Next up we create the log directories and redirect the JBoss log directory to `/var/log/wildfly` and the tmp directory to `/tmp/wildfly`:

```shell
[root@wxyz ~]> mkdir /var/log/wildfly
[root@wxyz ~]> chown wildfly:wildfly /var/log/wildfly/
```

To get WildFly to use these directories, we set the system properties for them in `/etc/wildfly/wildfly.properties`:

```shell
# System properties for wildfly
jboss.server.log.dir=/var/log/wildfly
jboss.server.temp.dir=/tmp/wildfly
```

At this point you can start the server using the command `service wildfly start`.  You won't be able to do much however, unless you like browsing via `wget` since the server is bound to the localhost interface only (and we are working on a headless server, i.e. no GUI web browser).  So we'll need to bind WildFly to all interfaces and open up the CentOS firewall to allow browsing to WildFly and the management console.  Keep in mind that this may not be exactly what you want in a production environment or in environment where unknown users might access your server (like shared hosting).

First we'll edit the `/etc/wildfly/wildfly.properties` file:

```shell
# System properties for wildfly
jboss.bind.address=0.0.0.0
jboss.bind.address.management=0.0.0.0
jboss.server.log.dir=/var/log/wildfly
jboss.server.temp.dir=/tmp/wildfly
```

Depending on how your local network is setup you may need further configuration for WildFly to be completely happy binding to all interfaces.  If your DNS recognizes the name of the CentOS server you are working on, congratulations, you are all set.  On the other hand, if DNS is not configured for the server, you will need to add an entry to the `/etc/hosts` file pointing the name of the server to the external IP.

Next we need to open the firewall for ports 8080 (regular WildFly) and 9990 (the management console).  *Be careful* when adjusting the firewall.  The commands below use hard-coded line numbers that may not be appropriate for whatever system you are using.  If you think you have screwed up your firewall use `service iptables restart` to reset it.  Of course, this won't work after you issue `service iptables save` so be extra sure before you save the rules.  You will also need to replace 10.0.0.0 with your subnet below.

```bash
[root@wxyz ~]> # 8080 for WildFly applications
[root@wxyz ~]> iptables --insert INPUT 5 \
         --match state \
         --state NEW \
         --protocol tcp \
         --destination-port 8080 \
         --source 10.0.0.0/24 \
         --jump ACCEPT
[root@wxyz ~]> # 9990 for WildFly management
[root@wxyz ~]> iptables --insert INPUT 6 \
         --match state \
         --state NEW \
         --protocol tcp \
         --destination-port 9990 \
         --source 10.0.0.0/24 \
         --jump ACCEPT
[root@wxyz ~]> # Verify the state of the firewall
[root@wxyz ~]> iptables -L --line-numbers
[root@wxyz ~]> # Go and test it out before doing the following
[root@wxyz ~]> service iptables save
```

At this point you should be ready to go.  Start up WildFly and try accessing it from your desktop.
