---
layout: post
title: Flattening Relationships in SQL
date: '2018-10-28T16:00:00.000-04:00'
permalink: 2018/10/28/{{ page.fileSlug }}.html
author: Raymond DeCampo
tags:
- sql
- PostgreSQL
---

I've been sitting on this one for a while, finally getting around to publishing.
<!-- excerpt -->

The idea is you have an object with a number of relationships to other objects
where there is no correlation between the relationships.  We will use the 
example of a television stations which has owners, managers and employees.

There may be differing numbers of each relationship and possibly some of the 
relationships are empty.  The idea is to list each station with columns for 
each relationship in the proper order.

In our example we have three stations, 25, 38 and 56.  Channel 25 had manager Fred, employee Barney and no owner.  Channel 38 has managers Wilma and Pebbles, employees Betty, Dino and Bam-bam and owner Gazoo.  Finally channel 56 has no manager, employee George and owner Cogswell and Spacely.

Therefore the desired results look something like:

```
 station_id |   mgr   |   emp   |  owner   
------------+---------+---------+----------
         25 | Fred    | Barney  | 
         34 | Pebbles | Bam-bam | Gazoo
         34 | Wilma   | Betty   | 
         34 |         | Dino    | 
         56 |         | George  | Cogswell
         56 |         |         | Spacely
(6 rows)
```

Notice that each column is sorted within the data for the station.

To accomplish this we use the PostgreSQL window function ```rank()``` to assign 
an occurrence number to each relationship to line them up in the correct order.
Then it is just a matter of joining the data based on station id and occurrence:

```sql
------------------- DATA --------------------------------------
with stations (station_id) as (
  -- Define the station data
            select 25
  union all select 34
  union all select 56
), station_managers (station_id, name) as (
  -- Define the manager data
            select 25, 'Fred'
  union all select 34, 'Wilma'
  union all select 34, 'Pebbles'
), station_employees (station_id, name) as (
  -- Define the employee data
            select 25, 'Barney'
  union all select 34, 'Betty'
  union all select 34, 'Bam-bam'
  union all select 34, 'Dino'
  union all select 56, 'George'
), station_owners (station_id, name) as (
  -- Define the owner data
            select 34, 'Gazoo'
  union all select 56, 'Spacely'
  union all select 56, 'Cogswell'
------------------- END DATA --------------------------------------
--
), m (station_id, name, occurrence) as (
  -- List the managers, using the rank() window function for occurrence
  select station_id, name, rank() over (partition by station_id order by name)
  from station_managers
), e (station_id, name, occurrence) as (
  -- List the employees, using the rank() window function for occurrence
  select station_id, name, rank() over (partition by station_id order by name)
  from station_employees
), o (station_id, name, occurrence) as (
  -- List the employees, using the rank() window function for occurrence
  select station_id, name, rank() over (partition by station_id order by name)
  from station_owners
) select s.station_id, m.name as mgr, e.name as emp, o.name as owner
from m
full outer join e
  on e.station_id = m.station_id and e.occurrence = m.occurrence
full outer join o
  on o.station_id = coalesce(m.station_id, e.station_id) 
  and o.occurrence = coalesce(m.occurrence, e.occurrence)
inner join stations s
  on s.station_id = coalesce(m.station_id, e.station_id, o.station_id)
order by 1, coalesce(m.occurrence, e.occurrence, o.occurrence)
```
