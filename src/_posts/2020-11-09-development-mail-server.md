---
layout: post
title: Development Mail Server (CentOS 8)
date: '2020-11-09T16:00:00.000-05:00'
author: Raymond DeCampo
tags:
- mail
- CentOS
- RHEL
- postfix
- dovecot
- smtp
- imap
- thunderbird
- netcat
---

As you are probably aware, any sufficiently developed software application will eventually grow until it implements email.  A frequent stepping stone along that evolutionary path is for an application to gain the ability to send email.  If your application sends email, at a certain point it will become inconvenient to continue to use real email addresses and servers when developing and testing the application.  The solution is to set up a development mail server.

An important note about the development mail server is that it should NOT participate in the delivery or relay of real email.  If you configure it wrong and create an open relay for spam, expect an angry communication from your ISP, usually invoking your name in vain and threatening termination of services.

So the goal here is to create a black hole of email which will accept mail for the configured server only.  Of course, we do want to read the email (at least some of the email) so that we can see that our application is doing what we want.  So we will want to be able to access the email with an IMAP client like Thunderbird.

We'll be running our development mail server on a CentOS 8 server, using postfix as the SMTP server and dovecot as the IMAP server.  We will configure the server to accept mail for the domain `example.com`, you should change this to whatever domain you use internally for development.  The DNS name for the server will be `devmail.example.com` and it is assumed this is already configured.

## Firewall

First things first, configure the firewall to allow SMTP and IMAP traffic.  We use the zone `internal` for our intranet, you probably use a different zone:

```shell
[ray@wxyz ~]$ sudo firewall-cmd --zone=internal --add-service smtp
success
[ray@wxyz ~]$ sudo firewall-cmd --zone=internal --add-service imap
success
[ray@wxyz ~]$ sudo firewall-cmd --zone=internal --add-service smtp --permanent
success
[ray@wxyz ~]$ sudo firewall-cmd --zone=internal --add-service imap --permanent
success
```

## Postfix

Now we are ready to install the postfix server.  We also create an OS user to own the virtual mailboxes.

```shell
[ray@wxyz ~]$ sudo dnf install postfix
[ray@wxyz ~]$ sudo groupadd --system --gid 2525 vmail
[ray@wxyz ~]$ sudo useradd --system --uid 2525 --shell /sbin/nologin --home /var/mail/vhosts --no-user-group -g vmail --comment "Virtual Mailbox Owner" vmail
[ray@wxyz ~]$ sudo mkdir -p /var/mail/vhosts/example.com
[ray@wxyz ~]$ sudo chown -R vmail:vmail /var/mail/vhosts
```

Next we configure postfix by editing the `/etc/postfix/main.cf` file.  The `myhostname` parameter is set to the DNS name, `devmail.example.com`.  Adjust the `inet_interfaces` parameter as desired.  (In my case I have `devmail` defined in the `/etc/hosts` file to bind it to a specific network interface so I am using `devmail, localhost`).

Very importantly, set the `smtpd_relay_restrictions` parameter to _reject_unauth_destination_.  This will prevent the server from attempting to relay mail to other mail servers.

Finally the virtual mailbox must be configured.  We need to set the `virtual_mailbox_domains` setting to include our domain, _example.com_.  The `virtual_mailbox_base` parameter is set to a directory which will contain the mailboxes.  The `virtual_mailbox_maps` parameter is set to a file which will contain details about the users and mailboxes the server knows about.  Finally the `virtual_uid_maps` and `virtual_gid_maps` are used to tell postfix to use our new `vmail` OS user when setting the permissions of the mailboxes.

Here is the result of diffing the provided `main.cf` with the new, configured `main.cf`:

```diff
[ray@wxyz ~]$ sudo diff main.cf.in main.cf
95a96
> myhostname = devmail.example.com
135c136
< inet_interfaces = localhost
---
> inet_interfaces = devmail, localhost
316a318,321
> # Prevent relaying, see /usr/share/doc/postfix/README_FILES/SMTPD_ACCESS_README
> # also postconf(5) man page
> smtpd_relay_restrictions = reject_unauth_destination
>
738a744,753
>
> # VIRTUAL DOMAINS
> # See /usr/share/doc/postfix/README_FILES/VIRTUAL_README, section titled
> # "Postfix virtual MAILBOX example: separate domains, non-UNIX accounts"
> virtual_mailbox_domains = example.com
> virtual_mailbox_base = /var/mail/vhosts
> virtual_mailbox_maps = hash:/etc/postfix/vmailbox
> virtual_uid_maps = static:2525
> virtual_gid_maps = static:2525
```

One final piece of configuration for postfix is to create the `/etc/postfix/vmailbox` file.  In our case, instead of creating individual users (who wants to be responsible for administering individual accounts on a development mail server?) we'll create one catchall mailbox that all mail will be routed to.

```shell
[ray@wxyz ~]$ sudo cat >vmailbox <<EOF
@example.com       example.com/all/Maildir/
EOF
[ray@wxyz ~]$ sudo postmap /etc/postfix/vmailbox
```

We are ready to enable and start the postfix server:

```shell
[ray@wxyz ~]$ sudo  systemctl enable postfix
Created symlink /etc/systemd/system/multi-user.target.wants/postfix.service → /usr/lib/systemd/system/postfix.service.
[ray@wxyz ~]$ sudo  systemctl start postfix
```

### Testing SMTP using netcat

We can test the postfix server using netcat:

```shell
[ray@stinger ~]$ nc devmail 25 <<EOM
EHLO STINGER
MAIL FROM:auser@example.com
RCPT TO:someone@example.com
DATA
Subject:Testing an email on the new environment

This is a test of our postfix configuration.
.
QUIT
EOM
#
220 devmail.example.com ESMTP Postfix
250-devmail.example.com
250-PIPELINING
250-SIZE 10240000
250-VRFY
250-ETRN
250-STARTTLS
250-ENHANCEDSTATUSCODES
250-8BITMIME
250-DSN
250 SMTPUTF8
250 2.1.0 Ok
250 2.1.5 Ok
354 End data with <CR><LF>.<CR><LF>
250 2.0.0 Ok: queued as EF2DD1D5C89
221 2.0.0 Bye
```

Furthermore we can verify that relaying to another email server fails:

```shell
[ray@stinger ~]$ nc devmail 25 <<EOM
EHLO STINGER
MAIL FROM:auser@example.com
RCPT TO:ray@example.net
QUIT
EOM
#
220 devmail.example.com ESMTP Postfix
250-devmail.example.com
250-PIPELINING
250-SIZE 10240000
250-VRFY
250-ETRN
250-STARTTLS
250-ENHANCEDSTATUSCODES
250-8BITMIME
250-DSN
250 SMTPUTF8
250 2.1.0 Ok
554 5.7.1 <ray@example.net>: Relay access denied
221 2.0.0 Bye
```

## Dovecot

### Installation and Configuration

I suppose you would like to be able to read the mail too?  After all, we aren't all perfect coders who get it right on the first try.

In that case, we will set up a dovecot server to provide access to the mailbox via IMAP.

Note the the firewall was already configured to allow IMAP traffic above.  Installing and enabling dovecot involves the usual steps:

```shell
[ray@wxyz ~]$ sudo dnf install dovecot
[ray@wxyz ~]$ sudo systemctl enable dovecot
Created symlink /etc/systemd/system/multi-user.target.wants/dovecot.service → /usr/lib/systemd/system/dovecot.service.
```

Next we configure authentication to use a custom password file instead of the system authentication by editing the `/etc/dovecot/conf.d/10-auth.conf` file.  The resulting changes in diff format:

```diff
10a11
> disable_plaintext_auth = no
122c123
< !include auth-system.conf.ext
---
> #!include auth-system.conf.ext
125c126
< #!include auth-passwdfile.conf.ext
---
> !include auth-passwdfile.conf.ext
```

Next we tell dovecot where to find our mailbox files by editing `/etc/dovecot/conf.d/10-mail.conf`, by setting the `mail_location` parameter:

```diff
30c30
< #mail_location =
---
> mail_location = maildir:/var/mail/vhosts/%d/%n/Maildir
```

Next we edit the `/etc/dovecot/conf.d/auth-passwdfile.conf.ext` file.  This was the configuration we activated when editing `10-auth.conf` and will contain the details of our custom authentication.  The resulting file is small enough to reproduce here (with commented-out lines omitted):

```none
passdb {
  driver = passwd-file
  args = /etc/dovecot/%d-passdb
}

userdb {
  driver = static
  args = uid=vmail gid=vmail home=/var/mail/vhosts/%d/%n
}
```

We configure dovecot to use the password file in the pattern `/etc/dovecot/%d-passwd`.  The `%d` here is a placeholder for the domain, *example.com*, so out password file will be `/etc/dovecot/example.com-passdb`.

Since we are not all that concerned about security for our fake email, we can create the password file in plaintext:

```shell
[ray@wxyz dovecot]$ sudo cat >example.com-passdb <<EOF
all@example.com:{PLAIN}password
EOF
```

Now we can start the dovecot server:

```shell
[ray@wxyz dovecot]$ sudo systemctl start dovecot
```

Finally, we set up a cron job to delete old mail older than a week old on a weekly basis:

```shell
[ray@wxyz dovecot]$ sudo cat >/etc/cron.weekly/delete-old-mail <<EOF
#!/bin/bash
threshold=$( date --date='last week' '+%d-%b-%Y' )
doveadm expunge -u all@example.com mailbox INBOX SENTBEFORE ${threshold}
doveadm purge -u all@example.com
EOF
[ray@wxyz dovecot]$ sudo chmod 744 /etc/cron.weekly/delete-old-mail
```

### Testing via OpenSSL

Since dovecot will use the STARTTLS protocol by default, we can't just connect to it via netcat like postfix.  We need to use openssl, which supports encrypted traffic and specifically the STARTTLS protocol.

Below is an example session showing how to use openssl to make the connection.  The commands entered interactively all start with a*n*, where *n* is a number.  I've edited down some of the output from the server.

```shell
[ray@stinger ~]$ openssl s_client -connect devmail:143 -starttls imap
CONNECTED(00000003)
depth=0 OU = IMAP server, CN = imap.example.com, emailAddress = postmaster@example.com
verify error:num=18:self signed certificate
verify return:1
depth=0 OU = IMAP server, CN = imap.example.com, emailAddress = postmaster@example.com
verify return:1
---
Certificate chain
 0 s:/OU=IMAP server/CN=imap.example.com/emailAddress=postmaster@example.com
   i:/OU=IMAP server/CN=imap.example.com/emailAddress=postmaster@example.com
---
Server certificate
-----BEGIN CERTIFICATE-----
MIIEUzCCArugAwIBAgIUJLx3lRtnTxo0WoCjsTsRhEQklZMwDQYJKoZIhvcNAQEL
duHQueW0oQ==
-----END CERTIFICATE-----
subject=/OU=IMAP server/CN=imap.example.com/emailAddress=postmaster@example.com
issuer=/OU=IMAP server/CN=imap.example.com/emailAddress=postmaster@example.com
---
No client certificate CA names sent
Peer signing digest: SHA512
Server Temp Key: ECDH, P-256, 256 bits
---
SSL handshake has read 2208 bytes and written 441 bytes
---
New, TLSv1/SSLv3, Cipher is ECDHE-RSA-AES256-GCM-SHA384
Server public key is 3072 bit
Secure Renegotiation IS supported
Compression: NONE
Expansion: NONE
No ALPN negotiated
SSL-Session:
    Protocol  : TLSv1.2
    Cipher    : ECDHE-RSA-AES256-GCM-SHA384
    Session-ID: 37D8B6A46719F7C0D16D122C8E6
    Session-ID-ctx:
    Master-Key: 2E69D75A3D0B2A6CB4AECCAA5A3
    Key-Arg   : None
    Krb5 Principal: None
    PSK identity: None
    PSK identity hint: None
    TLS session ticket lifetime hint: 7200 (seconds)
    TLS session ticket:
    0000 - 95 4e 5a b2 c3 a7 89 8b-42 49 07 2b bb 6f 57 6c   .NZ.....BI.+.oWl
    0010 - ef 69 9b 92 2f f3 aa 5d-a7 51 6d 77 2c b4 4c 19   .i../..].Qmw,.L.
    0020 - 03 dd e8 5f 5e 23 6b dd-dd 41 df 48 65 c8 d0 50   ..._^#k..A.He..P
    0030 - d3 e5 f6 cc 72 05 cf 6f-c3 b0 f3 11 83 ff eb 74   ....r..o.......t

    Start Time: 1594842880
    Timeout   : 300 (sec)
    Verify return code: 18 (self signed certificate)
---
. OK Pre-login capabilities listed, post-login capabilities have more.

a1 LOGIN all@example.com p
* CAPABILITY IMAP4rev1 SASL-IR LOGIN-REFERRALS ID ENABLE IDLE SORT
SORT=DISPLAY THREAD=REFERENCES THREAD=REFS THREAD=ORDEREDSUBJECT
MULTIAPPEND URL-PARTIAL CATENATE UNSELECT CHILDREN NAMESPACE UIDPLUS
LIST-EXTENDED I18NLEVEL=1 CONDSTORE QRESYNC ESEARCH ESORT SEARCHRES
WITHIN CONTEXT=SEARCH LIST-STATUS BINARY MOVE SNIPPET=FUZZY
PREVIEW=FUZZY LITERAL+ NOTIFY SPECIAL-USE
a1 OK Logged in

a2 LIST "" "*"
* LIST (\HasNoChildren) "." INBOX
a2 OK List completed (0.001 + 0.000 secs).

a3 EXAMINE INBOX
* FLAGS (\Answered \Flagged \Deleted \Seen \Draft)
* OK [PERMANENTFLAGS ()] Read-only mailbox.
* 1 EXISTS
* 1 RECENT
* OK [UNSEEN 1] First unseen.
* OK [UIDVALIDITY 1594842093] UIDs valid
* OK [UIDNEXT 2] Predicted next UID
a3 OK [READ-ONLY] Examine completed (0.002 + 0.000 + 0.001 secs).

a4 FETCH 1 BODY[]
* 1 FETCH (BODY[] {405}
Return-Path: <auser@example.com>
X-Original-To: someone@example.com
Delivered-To: someone@example.com
Received: from STINGER (unknown [10.0.0.200])
        by devmail.prosoft.prosoftcm.com (Postfix) with ESMTP id EF2DD1D5C89
        for <someone@example.com>; Wed, 15 Jul 2020 15:03:53 -0400 (EDT)
Subject:Testing an email on the new environment

This is a test of our postfix configuration.
)
a4 OK Fetch completed (0.002 + 0.000 + 0.001 secs).

a5 LOGOUT
* BYE Logging out
a5 OK Logout completed (0.001 + 0.000 secs).
closed
```

Our command line test is successful.  It should be possible to configure an IMAP client like Thunderbird to read the mailbox.  Keep in mind many IMAP clients try to make configuration easy by using DNS settings which (presumably) won't exist for your development mail server.
