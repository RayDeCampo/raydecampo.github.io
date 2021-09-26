---
layout: post
title: Convert Hyper-V disk to KVM
date: '2020-07-11T15:00:00.000-04:00'
permalink: 2020/07/11/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- vm
- kvm
- vhd
- qcow2
- qemu
---

When converting a Hyper-V VM to KVM (as used in CentOS or RHEL) it is not enough
to simply convert the disk from vhd to qcow2 using `qemu`.  Doing so will result
in errors concerning `dracut` timing out.  Instead one must convert the guest OS
as well by using `virt-v2v`.

Sometimes you will run into the following error when attempting to convert the
disk:

```shell
$ sudo virt-v2v -i disk /var/images/virdisk.vhd -o local -of qcow2 -os /var/lib/libvirt/images/

virt-v2v: error: libguestfs error: part_get_parttype: parted exited with
status 1: Error: Can't have a partition outside the disk!
```

In this case for some reason Hyper-V created the partitions on the disk with
geometry outside the "physical" geometry of the disk.  To repair this we need
to convert the disk to RAW format in order to operate on the partition table.
Be warned that the RAW disk image will be as big as the logical size of the
VHD disk.

Convert to RAW format:

```shell
$ qemu-img convert virdisk.vhd -O raw virdisk.raw
```

Issue the command `fdisk virdisk.raw` to operate on the partition table
with fdisk.  Use `p` to print the table and `v` command to verify the issue:

```shell
$ fdisk virdisk.raw
Command (m for help): p
Disk virdisk.raw: 64 GiB, 68718428160 bytes, 134215680 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x000484cd

Device       Boot   Start       End   Sectors Size Id Type
virdisk.raw1 *       2048   2099199   2097152   1G 83 Linux
virdisk.raw2      2099200 134217727 132118528  63G 8e Linux LVM

Command (m for help): v
Total allocated sectors 134217728 greater than the maximum 134215680.
```

Now this part is "dangerous" or would be if you weren't already operating on a
copy of the virtual disk.  Delete the problematic partition and recreate it with
the same starting point but with an end point that is proper.  In my case this
did not destroy any data, your mileage may vary.

```shell
Command (m for help): d
Partition number (1,2, default 2): 2

Partition 2 has been deleted.

Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2): 2
First sector (2099200-134215679, default 2099200):
Last sector, +sectors or +size{K,M,G,T,P} (2099200-134215679, default 134215679):

Created a new partition 2 of type 'Linux' and of size 63 GiB.
Partition #2 contains a LVM2_member signature.

Do you want to remove the signature? [Y]es/[N]o: N
```

Finally use `w` to write the new partition table.

Now convert the raw image:

```shell
$ sudo virt-v2v -i disk /var/images/virdisk.raw -o local -of qcow2 -os /var/lib/libvirt/images/
[   0.0] Opening the source -i disk /var/images/virdisk.raw
[   0.0] Creating an overlay to protect the source from being modified
[   0.2] Initializing the target -o local -os /var/lib/libvirt/images/
[   0.2] Opening the overlay
[   5.1] Inspecting the overlay
[  28.7] Checking for sufficient free disk space in the guest
[  28.7] Estimating space required on target for each disk
[  28.7] Converting CentOS Linux release 7.8.2003 (Core) to run on KVM
virt-v2v: This guest has virtio drivers installed.
[ 112.8] Mapping filesystem data to avoid copying unused and blank areas
[ 114.0] Closing the overlay
[ 114.3] Checking if the guest needs BIOS or UEFI to boot
[ 114.3] Assigning disks to buses
[ 114.3] Copying disk 1/1 to /var/lib/libvirt/images/virdisk-sda (qcow2)
    (100.00/100%)
[ 117.4] Creating output metadata
[ 117.4] Finishing off
$ sudo ls -l /var/lib/libvirt/images/
total 2280904
-rw-r--r--. 1 root root 2335703040 Jun 15 14:34 virdisk-sda
-rw-r--r--. 1 root root       1270 Jun 15 14:34 virdisk.xml
```

Congratulations, the disk is converted.

If you see the following error:

```shell
[ 113.7] Copying disk 1/1 to /var/lib/libvirt/images/virdisk-sda (qcow2)
virt-v2v: error: libguestfs error: qemu-img:
/var/lib/libvirt/images/virdisk-sda: qemu-img exited with error status 1.
To see full error messages you may need to enable debugging.
Do:
  export LIBGUESTFS_DEBUG=1 LIBGUESTFS_TRACE=1
and run the command again.  For further information, read:
  http://libguestfs.org/guestfs-faq.1.html#debugging-libguestfs
You can also run 'libguestfs-test-tool' and post the *complete* output
into a bug report or message to the libguestfs mailing list.

If reporting bugs, run virt-v2v with debugging enabled and include the
complete output:

  virt-v2v -v -x [...]
```

It is because the user you are running as does not have permission to write to
the target directory, in my case `/var/lib/libvirt/images`.

Finally, once the VM is booted, we should repair the filesystem in case it still
thinks it has the old size.  To repair filesystem, go into rescue mode, unmount,
run fsck/xfs_repair, remount and exit:

```console
# systemctl rescue
# umount /dev/mapper/centos_virdisk-home
# fsck /dev/mapper/centos_virdisk-home
# xfs_repair /dev/mapper/centos_virdisk-home
# mount /dev/mapper/centos_virdisk-home
# exit
```
