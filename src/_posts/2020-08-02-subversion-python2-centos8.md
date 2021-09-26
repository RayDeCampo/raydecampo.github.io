---
layout: post
title: Compiling Subversion Python 2 Bindings for CentOS 8
date: '2020-08-02T11:00:00.000-04:00'
permalink: 2020/08/02/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- CentOS
- subversion
- python
- RHEL
- Trac
- RPM
- dnf
- RPMS
---

I recently needed to install Trac 1.4 on a CentOS 8 server.  Trac 1.4 still uses Python 2 and while CentOS 8 supports Python 2, Python 3 is the default.  I suspect this went into the decision not to offer any Python bindings for Subversion in the CentOS 8 repositories.

I also checked WANDisco, which typically has advanced versions of Subversion packaged for CentOS, but they did not have the Python bindings for Python 2, only Python 3.

As a result, I was forced to compile the bindings myself.

I started with a new CentOS 8 VM created just for this purpose, selecting the "Development Tools" and "RPM Development Tools" software groups for installation.

From there we create a user named `mockbuild` which will perform the actual build.  This username is referenced in the source RPMs for CentOS 8 and prevents spurious error messages.  Plus it's a throwaway instance so it doesn't really matter.

```none
[root@localhost ~]# useradd -G wheel mockbuild
[root@localhost ~]# passwd mockbuild
[root@localhost ~]# dnf install yum-utils
```

We installed `yum-utils` as well to get `yumdownloader`.  This tool will help us obtain the source RPMs.

```shell
[mockbuild@localhost ~]$ yumdownloader --source subversion
[mockbuild@localhost ~]$ rpm -ivh subversion-1.10.2-1.module_el8.0.0+45+75bba4f4.src.rpm
Updating / installing...
   1:subversion-1.10.2-1.module_el8.0.################################# [100%]
```

We are also going to need Python 2:

```shell
[mockbuild@localhost ~]$ sudo dnf install python2 python2-devel
[mockbuild@localhost ~]$ sudo alternatives --set python /usr/bin/python2
```

The next step is to install the dependencies.  The `yum-builddep` tool can help us here:

```shell
[mockbuild@localhost ~]$ sudo dnf config-manager --set-enabled PowerTools
[mockbuild@localhost ~]$ sudo yum-builddep subversion
Package perl-generators-1.10-9.el8.noarch is already installed.
Package libtool-2.4.6-25.el8.x86_64 is already installed.
Package autoconf-2.69-27.el8.noarch is already installed.
Package gettext-0.19.8.1-17.el8.x86_64 is already installed.
Package systemd-239-30.el8_2.x86_64 is already installed.
Package zip-3.0-23.el8.x86_64 is already installed.
Package unzip-6.0-43.el8.x86_64 is already installed.
Package which-2.21-12.el8.x86_64 is already installed.
No matching package to install: 'utf8proc-devel'
No matching package to install: 'libserf-devel >= 1.3.0'
Not all dependencies satisfied
Error: Some packages could not be found.
```

For the dependencies which were not found, we'll need to download and compile them ourselves.  (In general, however, double check that the packages are not in a disabled repository like PowerTools.)

We'll start with `utf8proc-devel`:

```shell
[mockbuild@localhost ~]$ yumdownloader --source utf8proc
[mockbuild@localhost ~]$ rpm -ivh utf8proc-2.1.1-4.module_el8.0.0+45+75bba4f4.src.rpm
[mockbuild@localhost ~]$ sudo yum-builddep utf8proc
Package gcc-8.3.1-5.el8.0.2.x86_64 is already installed.
Dependencies resolved.
Nothing to do.
Complete!
[mockbuild@localhost ~]$ cd rpmbuild/SPECS/
[mockbuild@localhost SPECS]$ rpmbuild -ba utf8proc.spec
# Output elided for brevity
[mockbuild@localhost SPECS]$ cd ../RPMS/x86_64/
[mockbuild@localhost x86_64]$ sudo rpm -ivh utf8proc-2.1.1-4.el8.x86_64.rpm utf8proc-devel-2.1.1-4.el8.x86_64.rpm
[sudo] password for mockbuild:
Verifying...                          ################################# [100%]
Preparing...                          ################################# [100%]
Updating / installing...
   1:utf8proc-2.1.1-4.el8             ################################# [ 50%]
   2:utf8proc-devel-2.1.1-4.el8       ################################# [100%]
```

Next the `libserf-devel` library:

```shell
[mockbuild@localhost x86_64]$ cd
[mockbuild@localhost ~]$ yumdownloader --source libserf
[mockbuild@localhost ~]$ rpm -ivh libserf-1.3.9-8.module_el8.0.0+45+75bba4f4.src.rpm
Updating / installing...
   1:libserf-1.3.9-8.module_el8.0.0+45################################# [100%]
[mockbuild@localhost ~]$ sudo yum-builddep libserf
# Eliding 24 packages installed
[mockbuild@localhost ~]$ cd rpmbuild/SPECS/
[mockbuild@localhost SPECS]$ rpmbuild -ba libserf.spec
# Eliding output for brevity
[mockbuild@localhost SPECS]$ cd ../RPMS/x86_64/
[mockbuild@localhost x86_64]$ sudo rpm -ivh libserf-1.3.9-8.el8.x86_64.rpm libserf-devel-1.3.9-8.el8.x86_64.rpm
Verifying...                          ################################# [100%]
Preparing...                          ################################# [100%]
Updating / installing...
   1:libserf-1.3.9-8.el8              ################################# [ 50%]
   2:libserf-devel-1.3.9-8.el8        ################################# [100%]
```

Ok, we are getting good at this.  Let's see how we are with the dependencies for `subversion`:

```shell
[mockbuild@localhost ~]$ sudo yum-builddep subversion
Error:
 Problem: conflicting requests
  - package junit-1:4.12-9.module_el8.0.0+30+832da3a1.noarch is filtered out by modular filtering
(try to add '--skip-broken' to skip uninstallable packages or '--nobest' to use not only best candidate packages)
```

We have a package that is available somewhere but is being filtered.  Let's track it down:

```shell
[mockbuild@localhost SPECS]$ dnf module provides junit
Last metadata expiration check: 0:37:17 ago on Wed 15 Jul 2020 06:31:36 AM EDT.
junit-1:4.12-9.module_el8.0.0+30+832da3a1.noarch
Module   : javapackages-tools:201801:8000020190628172923:b07bea58:x86_64
Profiles :
Repo     : PowerTools
Summary  : Tools and macros for Java packaging support
[mockbuild@localhost SPECS]$ dnf module list javapackages-tools
Last metadata expiration check: 0:39:15 ago on Wed 15 Jul 2020 06:31:36 AM EDT.
CentOS-8 - PowerTools
Name                             Stream               Profiles              Summary
javapackages-tools               201801               common                Tools and macros for Java packaging support

Hint: [d]efault, [e]nabled, [x]disabled, [i]nstalled
[mockbuild@localhost SPECS]$ sudo dnf module install javapackages-tools:201801/common
```

With that last dependency is resolved, `yum-builddep subversion` finishes successfully and we are ready to build `subversion`.

Except that we have a small diversion in the form of a cautionary tale of a developer who failed to thoroughly read the documentation beforing diving in.  The source RPM has installed the files in the `rpmbuild/` directory.  The `rpmbuild/SPECS/subversion.spec` file contains the details about how to build the software and the RPMs.  At the top of this file are a number of directives configuring the build:

```shell
[mockbuild@localhost ~]$ head rpmbuild/SPECS/subversion.spec
# set to zero to avoid running test suite

%bcond_without kwallet
%bcond_without python2
%bcond_with python3
%bcond_without bdb
%bcond_without tests
%bcond_without pyswig

%ifarch %{power64} s390x
```

Originally I naively tried editing the `subversion.spec` file e.g. changing `%bcond_without python2` to `%bcond_with python2`.  Unfortunately (for me), the `%bcond` directives work the opposite of the way my intuition thought.  So I was disabling Python 2 when I thought I was enabling it.  See <http://rpm.org/user_doc/conditional_builds.html> for details.

Furthermore, the `%bcond` directives are designed to create command line switches. So there is no need to edit the `subversion.spec` file at all.

(The worst part was that the build succeeded but took hours because I had't disabled the unit tests.  And I didn't end up with the Python 2 bindings.)

So it turns out the spec file is configured to use Python 2 already.  We are going to disable the tests and the `kwallet` integration via command line switches.  So the correct command is:

```shell
[mockbuild@localhost SPECS]$ rpmbuild -ba subversion.spec --without kwallet --without tests
```

Finally we tar up the resulting RPMs for installation on the target server:

```shell
[mockbuild@localhost rpmbuild]$ cd RPMS/
[mockbuild@localhost RPMS]$ tar cvf svn-1.10.2.tar *
noarch/
noarch/subversion-javahl-1.10.2-1.el8.noarch.rpm
x86_64/
x86_64/utf8proc-2.1.1-4.el8.x86_64.rpm
x86_64/utf8proc-devel-2.1.1-4.el8.x86_64.rpm
x86_64/utf8proc-debugsource-2.1.1-4.el8.x86_64.rpm
x86_64/utf8proc-debuginfo-2.1.1-4.el8.x86_64.rpm
x86_64/libserf-1.3.9-8.el8.x86_64.rpm
x86_64/libserf-devel-1.3.9-8.el8.x86_64.rpm
x86_64/libserf-debugsource-1.3.9-8.el8.x86_64.rpm
x86_64/libserf-debuginfo-1.3.9-8.el8.x86_64.rpm
x86_64/subversion-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-libs-1.10.2-1.el8.x86_64.rpm
x86_64/python2-subversion-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-devel-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-gnome-1.10.2-1.el8.x86_64.rpm
x86_64/mod_dav_svn-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-perl-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-ruby-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-tools-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-debugsource-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-libs-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/python2-subversion-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-devel-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-gnome-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/mod_dav_svn-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-perl-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-ruby-debuginfo-1.10.2-1.el8.x86_64.rpm
x86_64/subversion-tools-debuginfo-1.10.2-1.el8.x86_64.rpm
```

Now, on the target server, we install the version of Subversion we compiled.  We do this because the Python bindings and Subversion need to be the same version.  Then we prevent `dnf` from updating the `subversion` package and creating an issue.

```none
[root@target x86_64]# rpm -ivh subversion-1.10.2-1.el8.x86_64.rpm \
subversion-libs-1.10.2-1.el8.x86_64.rpm \
utf8proc-2.1.1-4.el8.x86_64.rpm  \
mod_dav_svn-1.10.2-1.el8.x86_64.rpm \
python2-subversion-1.10.2-1.el8.x86_64.rpm
Verifying...                          ################################# [100%]
Preparing...                          ################################# [100%]
Updating / installing...
   1:utf8proc-2.1.1-4.el8             ################################# [ 20%]
   2:subversion-libs-1.10.2-1.el8     ################################# [ 40%]
   3:subversion-1.10.2-1.el8          ################################# [ 60%]
   4:mod_dav_svn-1.10.2-1.el8         ################################# [ 80%]
   5:python2-subversion-1.10.2-1.el8  ################################# [100%]
[root@target dnf]# cd /etc/dnf
[root@target dnf]# cp dnf.conf dnf.conf.in
[root@target dnf]# vi dnf.conf
[root@target dnf]# diff dnf.conf.in dnf.conf
6a7
> exclude=subversion subversion-libs mod_dav_svn
```
