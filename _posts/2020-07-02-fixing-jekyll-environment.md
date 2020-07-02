---
layout: post
title: Fixing my Borked Ruby Environment
date: '2020-07-02T10:00:00.000-04:00'
author: Raymond DeCampo
tags:
- ruby
- gem
- bundle
- jekyll
- github pages
- fedora
---

So after a couple of updates and who knows what else, I found myself with an environment (Fedora 32 if you were wondering) that would no longer run jekyll.  This really caused by blogging level to stop completely since I couldn't preview any of the posts.  As the potential posts piled up in my drafts folder, I eventually carved out some time to take care of this.

The error I was getting when running jekyll (actually `bundle exec jekyll serve`) was downright perplexing.  It would complain that a shared library for one of the dependent gems was missing.  The error message gave the full path to the file.  The perplexing thing is that the file existed and my user had permissions to read it.

The library belonged to the commonmark gem.  I tried reinstalling it via `bundle` and via `gem` both as a regular user and as root.  No luck, it refused to find the shared library that was right where it claimed to be looking for it.

So I figured I'd burn the whole thing down and try again.  First thing was to 
uninstall all gems using `gem`.  User-level gems were not much of a problem, I just used `gem uninstall -aIx`.  For system-level gems I had to repeatedly alternate between these commands until there were no more gems remaining:

```shell
sudo gem uninstall -aIx
sudo gem uninstall -i /usr/local/share/gems -aIx 
sudo gem uninstall -i /usr/share/gems -aIx 
```

With all the gems annihilated from the system, time to reinstall ruby:

```shell
sudo dnf reinstall ruby libyaml rubygem-psych rubygems rubygem-openssl \
    rubygem-bigdecimal rubygem-io-console rubygem-irb rubygem-json \
    rubygem-psych rubygem-rdoc
```

At this point I also made a directory for user-level gems and set `$GEM_HOME` in my `.bashrc` but unfortunately there's a bug which prevents gem from respecting that setting.  I did eventually use the directory for the install target for bundle however.

Now we install bundler and use it to install jekyll:

```shell
gem install bundler
rm -rf .bundle
bundle config set path '/home/dev/gems'
# Edit Gemfile to have the correct version of jekyll that github-pages expects
vi Gemfile
bundle install
# Verify it works
bundle exec jekyll serve
# commit the Gemfile changes
git add Gemfile Gemfile.lock 
git commit 
git push
```

Now that my environment works again I hope to be blogging more.
